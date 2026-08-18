// MySQL 数据库测试卡片组件
//
// 该组件用于测试 CloudBase MySQL 数据库的 CRUD 操作（cloudBase.mysql.*）。
// 支持以下五种操作方法：
// - query：查询数据，支持 select、limit、offset、order、filters 等参数
// - count：统计满足条件的记录数
// - insert：插入一条或多条数据
// - update：根据筛选条件更新数据
// - delete：根据筛选条件删除数据
//
// 界面会根据选择的操作方法动态显示/隐藏对应的输入字段。
//
// 使用方式：
// ```dart
// MySqlSection(
//   mysqlTableController: _mysqlTableController,     // 表名
//   mysqlSchemaController: _mysqlSchemaController,   // 数据库名（可选）
//   mysqlInstanceController: _mysqlInstanceController, // 实例标识（可选）
//   mysqlSelectController: _mysqlSelectController,   // select 字段
//   mysqlFiltersController: _mysqlFiltersController,  // 筛选条件
//   mysqlLimitController: _mysqlLimitController,     // 分页 limit
//   mysqlOffsetController: _mysqlOffsetController,   // 分页 offset
//   mysqlOrderController: _mysqlOrderController,     // 排序规则
//   mysqlDataController: _mysqlDataController,       // 插入/更新的数据
//   mysqlMethod: _mysqlMethod,                       // 当前操作方法
//   onMethodChanged: (v) => setState(() => _mysqlMethod = v),
//   isLoading: _isLoading,
//   result: _mysqlResult,
//   onTest: _testMySql,
// );
// ```
import 'package:flutter/material.dart';

/// MySQL 测试卡片，展示数据库 CRUD 操作的表单界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态均由父组件管理。
/// 根据用户选择的操作方法（query/count/insert/update/delete），
/// 动态展示不同的输入字段。
class MySqlSection extends StatelessWidget {
  /// 表名输入控制器（必填），对应 MySQL 数据库中的表名
  final TextEditingController mysqlTableController;

  /// 数据库名输入控制器（可选），留空时使用默认数据库
  final TextEditingController mysqlSchemaController;

  /// 实例标识输入控制器（可选），需搭配数据库名使用
  final TextEditingController mysqlInstanceController;

  /// Select 字段输入控制器，如 "*" 或 "id,name,age"（仅 query 模式显示）
  final TextEditingController mysqlSelectController;

  /// 筛选条件输入控制器，支持 JSON 格式或 key=value 格式
  /// 例如: {"age": "gt.18"} 或 age=gt.18,name=like.%张%
  final TextEditingController mysqlFiltersController;

  /// 分页 Limit 输入控制器（仅 query 模式显示）
  final TextEditingController mysqlLimitController;

  /// 分页 Offset 输入控制器（仅 query 模式显示）
  final TextEditingController mysqlOffsetController;

  /// 排序规则输入控制器，如 "id.asc" 或 "created_at.desc"（仅 query 模式显示）
  final TextEditingController mysqlOrderController;

  /// 插入/更新数据输入控制器（JSON 格式），仅 insert 和 update 模式显示
  final TextEditingController mysqlDataController;

  /// 当前选中的操作方法：query / count / insert / update / delete
  final String mysqlMethod;

  /// 当用户切换操作方法时的回调
  final ValueChanged<String> onMethodChanged;

  /// 是否正在加载中，为 true 时按钮禁用
  final bool isLoading;

  /// 调用结果文本，为 null 时不显示结果区域
  final String? result;

  /// 点击执行按钮时触发的回调
  final VoidCallback onTest;

  const MySqlSection({
    super.key,
    required this.mysqlTableController,
    required this.mysqlSchemaController,
    required this.mysqlInstanceController,
    required this.mysqlSelectController,
    required this.mysqlFiltersController,
    required this.mysqlLimitController,
    required this.mysqlOffsetController,
    required this.mysqlOrderController,
    required this.mysqlDataController,
    required this.mysqlMethod,
    required this.onMethodChanged,
    required this.isLoading,
    required this.result,
    required this.onTest,
  });

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
              'MySQL 测试',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const Divider(),
            const SizedBox(height: 8),

            // 操作方法下拉选择 —— 决定下方显示哪些输入字段
            DropdownButtonFormField<String>(
              value: mysqlMethod,
              decoration: const InputDecoration(
                labelText: '操作方法',
                prefixIcon: Icon(Icons.category),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: ['query', 'count', 'insert', 'update', 'delete']
                  .map((m) => DropdownMenuItem(
                        value: m,
                        child: Text(m.toUpperCase()),
                      ))
                  .toList(),
              onChanged: (v) => onMethodChanged(v!),
            ),
            const SizedBox(height: 12),

            // 表名输入框（所有操作方法都需要）
            TextField(
              controller: mysqlTableController,
              decoration: const InputDecoration(
                labelText: '表名',
                hintText: '例如: users',
                prefixIcon: Icon(Icons.table_chart),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // 数据库名（可选） —— 不填则使用环境默认数据库
            TextField(
              controller: mysqlSchemaController,
              decoration: const InputDecoration(
                labelText: '数据库名 (可选)',
                hintText: '留空使用默认数据库',
                prefixIcon: Icon(Icons.storage),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // 实例标识（可选） —— 多实例场景下指定目标实例
            TextField(
              controller: mysqlInstanceController,
              decoration: const InputDecoration(
                labelText: '实例标识 (可选)',
                hintText: '留空使用默认实例，需搭配数据库名使用',
                prefixIcon: Icon(Icons.dns),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // === 以下字段仅在 query 模式下显示 ===
            if (mysqlMethod == 'query') ...[
              // Select 字段 —— 指定返回哪些列
              TextField(
                controller: mysqlSelectController,
                decoration: const InputDecoration(
                  labelText: 'Select 字段',
                  hintText: '* 或 id,name,age',
                  prefixIcon: Icon(Icons.checklist),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),

              // Limit 和 Offset（横向排列） —— 分页参数
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: mysqlLimitController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Limit',
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
                      controller: mysqlOffsetController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Offset',
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

              // 排序规则 —— 格式为 "字段名.排序方向"，如 "id.asc"
              TextField(
                controller: mysqlOrderController,
                decoration: const InputDecoration(
                  labelText: '排序 (可选)',
                  hintText: '例如: id.asc 或 created_at.desc',
                  prefixIcon: Icon(Icons.sort),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // 筛选条件 —— insert 以外的操作都支持
            // update 和 delete 操作时为必填，避免全表操作
            if (mysqlMethod != 'insert')
              TextField(
                controller: mysqlFiltersController,
                decoration: InputDecoration(
                  labelText: 'Filters 筛选条件${mysqlMethod == 'update' || mysqlMethod == 'delete' ? ' (必填)' : ' (可选)'}',
                  hintText: '{"age": "gt.18"} 或 age=gt.18,name=like.%张%',
                  prefixIcon: const Icon(Icons.filter_alt),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 2,
              ),

            // 数据输入框 —— 仅 insert 和 update 操作显示
            if (mysqlMethod == 'insert' || mysqlMethod == 'update') ...[
              const SizedBox(height: 12),
              TextField(
                controller: mysqlDataController,
                decoration: InputDecoration(
                  labelText: '${mysqlMethod == 'insert' ? '插入' : '更新'}数据 (JSON)',
                  hintText: '例如: {"name": "张三", "age": 25}',
                  prefixIcon: const Icon(Icons.data_object),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 3,
              ),
            ],
            const SizedBox(height: 12),

            // 执行按钮 —— 加载中时禁用
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onTest,
                icon: const Icon(Icons.play_arrow),
                label: Text('执行 ${mysqlMethod.toUpperCase()}'),
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
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
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
