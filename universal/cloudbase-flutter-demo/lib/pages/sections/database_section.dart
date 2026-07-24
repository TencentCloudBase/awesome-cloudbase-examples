// 文档型数据库（NoSQL）测试卡片组件
//
// 该组件用于测试 CloudBase 文档型数据库的操作（app.database().collection(...)）。
// 支持以下操作方法：
// - add：向集合新增一条或多条文档（data 支持 JSON 对象或数组）
// - get：按查询条件获取文档列表，支持 where / orderBy / limit / skip
// - count：统计满足条件的文档数量
// - update：按查询条件批量更新文档
// - remove：按查询条件批量删除文档
// - getDoc：按文档 ID 查询单个文档
// - updateDoc：按文档 ID 更新单个文档（合并更新）
// - setDoc：按文档 ID 设置文档（完全替换，不存在则创建）
// - removeDoc：按文档 ID 删除单个文档
//
// 界面会根据选择的操作方法动态显示/隐藏对应的输入字段。
//
// 使用方式：
// ```dart
// DatabaseSection(
//   collectionController: _dbCollectionController, // 集合名称
//   docIdController: _dbDocIdController,           // 文档 ID
//   whereController: _dbWhereController,           // 查询条件（JSON）
//   dataController: _dbDataController,             // 新增/更新数据（JSON）
//   orderFieldController: _dbOrderFieldController, // 排序字段
//   limitController: _dbLimitController,           // 数量上限
//   skipController: _dbSkipController,             // 偏移量
//   orderDirection: _dbOrderDirection,             // 排序方向
//   onOrderDirectionChanged: (v) => ...,
//   method: _dbMethod,                             // 当前操作方法
//   onMethodChanged: (v) => ...,
//   isLoading: _isLoading,
//   result: _dbResult,
//   onTest: _testDatabase,
// );
// ```
import 'package:flutter/material.dart';

/// 文档型数据库测试卡片，展示 NoSQL 数据库操作的表单界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态均由父组件管理。
/// 根据用户选择的操作方法动态展示不同的输入字段。
class DatabaseSection extends StatelessWidget {
  /// 实例 ID 输入控制器（可选），不填则使用默认实例 (default)
  final TextEditingController instanceController;

  /// 数据库名称输入控制器（可选），不填则使用默认数据库 (default)
  final TextEditingController databaseController;

  /// 集合名称输入控制器（所有操作必填），对应文档型数据库中的集合
  final TextEditingController collectionController;

  /// 文档 ID 输入控制器，仅在 getDoc / updateDoc / setDoc / removeDoc 模式显示
  final TextEditingController docIdController;

  /// 查询条件输入控制器（JSON 格式），例如 {"completed": false}
  /// 仅在 get / count / update / remove 模式显示
  final TextEditingController whereController;

  /// 新增/更新数据输入控制器（JSON 格式）
  /// add 支持对象或数组；update/updateDoc/setDoc 为对象
  final TextEditingController dataController;

  /// 排序字段输入控制器（可选），仅 get 模式显示
  final TextEditingController orderFieldController;

  /// 数量上限输入控制器（可选），仅 get 模式显示
  final TextEditingController limitController;

  /// 偏移量输入控制器（可选），仅 get 模式显示
  final TextEditingController skipController;

  /// 当前选中的排序方向：asc / desc（仅 get 模式生效）
  final String orderDirection;

  /// 排序方向切换回调
  final ValueChanged<String> onOrderDirectionChanged;

  /// 当前选中的操作方法
  final String method;

  /// 当用户切换操作方法时的回调
  final ValueChanged<String> onMethodChanged;

  /// 是否正在加载中，为 true 时按钮禁用
  final bool isLoading;

  /// 调用结果文本，为 null 时不显示结果区域
  final String? result;

  /// 点击执行按钮时触发的回调
  final VoidCallback onTest;

  const DatabaseSection({
    super.key,
    required this.instanceController,
    required this.databaseController,
    required this.collectionController,
    required this.docIdController,
    required this.whereController,
    required this.dataController,
    required this.orderFieldController,
    required this.limitController,
    required this.skipController,
    required this.orderDirection,
    required this.onOrderDirectionChanged,
    required this.method,
    required this.onMethodChanged,
    required this.isLoading,
    required this.result,
    required this.onTest,
  });

  /// 需要 where 查询条件的操作方法
  bool get _isQueryMethod =>
      const ['get', 'count', 'update', 'remove'].contains(method);

  /// 需要文档 ID 的操作方法
  bool get _isDocMethod => const [
        'getDoc',
        'updateDoc',
        'setDoc',
        'removeDoc',
      ].contains(method);

  /// 需要 data 数据的操作方法
  bool get _needsData => const [
        'add',
        'update',
        'updateDoc',
        'setDoc',
      ].contains(method);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 卡片标题
            Text(
              '文档型数据库测试 (NoSQL)',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const Divider(),
            const SizedBox(height: 8),

            // 操作方法下拉选择 —— 决定下方显示哪些输入字段
            DropdownButtonFormField<String>(
              value: method,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: '操作方法',
                prefixIcon: Icon(Icons.category),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: const [
                DropdownMenuItem(value: 'add', child: Text('add 新增文档')),
                DropdownMenuItem(value: 'get', child: Text('get 条件查询')),
                DropdownMenuItem(value: 'count', child: Text('count 统计数量')),
                DropdownMenuItem(value: 'update', child: Text('update 批量更新')),
                DropdownMenuItem(value: 'remove', child: Text('remove 批量删除')),
                DropdownMenuItem(value: 'getDoc', child: Text('getDoc 按 ID 查询')),
                DropdownMenuItem(
                    value: 'updateDoc', child: Text('updateDoc 按 ID 更新')),
                DropdownMenuItem(value: 'setDoc', child: Text('setDoc 按 ID 设置')),
                DropdownMenuItem(
                    value: 'removeDoc', child: Text('removeDoc 按 ID 删除')),
              ],
              onChanged: (v) => onMethodChanged(v!),
            ),
            const SizedBox(height: 12),

            // 实例 ID / 数据库名称（均可选，不填使用默认值 (default)）
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: instanceController,
                    decoration: const InputDecoration(
                      labelText: '实例 ID (可选)',
                      hintText: '默认: (default)',
                      prefixIcon: Icon(Icons.dns),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: databaseController,
                    decoration: const InputDecoration(
                      labelText: '数据库名 (可选)',
                      hintText: '默认: (default)',
                      prefixIcon: Icon(Icons.storage),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 集合名称输入框（所有操作方法都需要）
            TextField(
              controller: collectionController,
              decoration: const InputDecoration(
                labelText: '集合名称',
                hintText: '例如: todos',
                prefixIcon: Icon(Icons.folder),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // 文档 ID —— 仅 doc 类操作显示
            if (_isDocMethod) ...[
              TextField(
                controller: docIdController,
                decoration: const InputDecoration(
                  labelText: '文档 ID',
                  hintText: '例如: 3d8e...记录 _id',
                  prefixIcon: Icon(Icons.key),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // 查询条件 —— get / count / update / remove 显示
            // update / remove 为必填，避免全表操作
            if (_isQueryMethod) ...[
              TextField(
                controller: whereController,
                decoration: InputDecoration(
                  labelText:
                      'Where 查询条件${method == 'update' || method == 'remove' ? ' (必填)' : ' (可选)'}',
                  hintText: '例如: {"completed": false}',
                  prefixIcon: const Icon(Icons.filter_alt),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
            ],

            // === 以下字段仅在 get 模式下显示 ===
            if (method == 'get') ...[
              // 排序字段 + 排序方向
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: orderFieldController,
                      decoration: const InputDecoration(
                        labelText: '排序字段 (可选)',
                        hintText: '例如: createdAt',
                        prefixIcon: Icon(Icons.sort),
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: orderDirection,
                      decoration: const InputDecoration(
                        labelText: '方向',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: const [
                        DropdownMenuItem(value: 'asc', child: Text('ASC')),
                        DropdownMenuItem(value: 'desc', child: Text('DESC')),
                      ],
                      onChanged: (v) => onOrderDirectionChanged(v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Limit 和 Skip（横向排列） —— 分页参数
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: limitController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Limit (可选)',
                        hintText: '10',
                        prefixIcon: Icon(Icons.format_list_numbered),
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: skipController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Skip (可选)',
                        hintText: '0',
                        prefixIcon: Icon(Icons.skip_next),
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // 数据输入框 —— add / update / updateDoc / setDoc 显示
            if (_needsData) ...[
              TextField(
                controller: dataController,
                decoration: InputDecoration(
                  labelText: '数据 (JSON)',
                  hintText: method == 'add'
                      ? '对象 {"title":"学习"} 或数组 [{...},{...}]'
                      : '例如: {"completed": true}',
                  prefixIcon: const Icon(Icons.data_object),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
            ],

            // 执行按钮 —— 加载中时禁用
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onTest,
                icon: const Icon(Icons.play_arrow),
                label: Text('执行 $method'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),

            // 结果展示区域 —— 仅在有结果时显示，限制最大高度并支持滚动
            if (result != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                constraints: const BoxConstraints(maxHeight: 300),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    result!,
                    style:
                        const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
