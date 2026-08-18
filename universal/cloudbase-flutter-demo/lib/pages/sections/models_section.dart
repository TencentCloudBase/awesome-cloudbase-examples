// 数据模型（Data Model）测试卡片组件
//
// 该组件用于测试 CloudBase 数据模型的完整 CRUD 操作（cloudBase.models.*）。
// 数据模型是 CloudBase 提供的高级数据管理能力，在 MySQL 基础上封装了更丰富的
// 查询语义和权限控制。
//
// 支持以下 20 种操作方法：
//
// === 数据模型 CRUD（13 种） ===
// - list：查询多条记录，支持 filter、select、分页、排序
// - listSimple：简单查询多条记录（仅分页参数）
// - get：按条件查询单条记录
// - getById：按记录 ID 查询单条记录
// - create：创建单条记录
// - createMany：批量创建多条记录
// - update：按条件更新单条记录
// - updateMany：按条件批量更新记录
// - upsert：存在则更新，不存在则创建
// - deleteById：按 ID 删除单条记录
// - deleteRecord：按条件删除单条记录
// - deleteMany：按条件批量删除记录
// - mysqlCommand：直接执行 SQL 模板命令
//
// === 数据源查询操作（7 种） ===
// - getAggregateDataSourceList：查询数据源聚合列表
// - getDataSourceAggregateDetail：查询数据源聚合详情
// - getDataSourceByTableName：根据表名查询数据源 Schema
// - getBasicDataSourceList：查询基础数据源列表
// - getBasicDataSource：查询基础数据源详情
// - getSchemaList：查询数据源 Schema 列表
// - getTableName：根据数据源名称查询表名
//
// 界面会根据选择的操作方法动态显示/隐藏对应的输入字段。
import 'package:flutter/material.dart';

/// 数据模型测试卡片，展示 Models CRUD 和数据源查询操作的表单界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态均由父组件管理。
/// 根据用户选择的操作方法，动态展示不同的输入字段组合。
class ModelsSection extends StatelessWidget {
  // ===========================================================================
  // 数据模型 CRUD 相关控制器
  // ===========================================================================

  /// 模型标识输入控制器，对应 CloudBase 控制台中定义的数据模型名称
  final TextEditingController modelsNameController;

  /// 记录 ID 输入控制器，用于 getById 和 deleteById 操作
  final TextEditingController modelsRecordIdController;

  /// Filter 筛选条件输入控制器（JSON 格式），
  /// 如 {"where": {"_id": {"\$eq": "xxx"}}}
  final TextEditingController modelsFilterController;

  /// Select 查询字段输入控制器（JSON 格式），
  /// 如 {"\$master": true} 或 {"_id": true, "name": true}
  final TextEditingController modelsSelectController;

  /// 写入数据输入控制器（JSON 格式），用于 create / update 等写操作
  final TextEditingController modelsDataController;

  /// 每页记录数输入控制器，用于 list / listSimple 分页
  final TextEditingController modelsPageSizeController;

  /// 页码输入控制器，用于 list / listSimple 分页
  final TextEditingController modelsPageNumberController;

  /// 排序规则输入控制器（JSON 数组格式），如 [{"createdAt": "desc"}]
  final TextEditingController modelsOrderByController;

  /// SQL 模板输入控制器，用于 mysqlCommand 操作
  /// 如 "select * from `users` where _id = {{ _id }}"
  final TextEditingController modelsSqlTemplateController;

  /// SQL 参数输入控制器（JSON 数组格式），用于 mysqlCommand 操作
  /// 如 [{"key":"_id","type":"STRING","value":"123"}]
  final TextEditingController modelsSqlParameterController;

  // ===========================================================================
  // 数据源查询相关控制器
  // ===========================================================================

  /// 数据源 ID 输入控制器，用于聚合详情/基础详情查询
  final TextEditingController datasourceIdController;

  /// 数据源名称输入控制器，用于聚合详情/基础详情/表名查询
  final TextEditingController datasourceNameController;

  /// 数据库表名输入控制器，用于 getDataSourceByTableName
  final TextEditingController datasourceTableNameController;

  // ===========================================================================
  // 状态和回调
  // ===========================================================================

  /// 当前选中的操作方法
  final String modelsMethod;

  /// 当用户切换操作方法时的回调
  final ValueChanged<String> onMethodChanged;

  /// 是否正在加载中，为 true 时按钮禁用并显示加载指示器
  final bool isLoading;

  /// 调用结果文本，为 null 时不显示结果区域
  final String? result;

  /// 点击执行按钮时触发的回调
  final VoidCallback onTest;

  const ModelsSection({
    super.key,
    required this.modelsNameController,
    required this.modelsRecordIdController,
    required this.modelsFilterController,
    required this.modelsSelectController,
    required this.modelsDataController,
    required this.modelsPageSizeController,
    required this.modelsPageNumberController,
    required this.modelsOrderByController,
    required this.modelsSqlTemplateController,
    required this.modelsSqlParameterController,
    required this.datasourceIdController,
    required this.datasourceNameController,
    required this.datasourceTableNameController,
    required this.modelsMethod,
    required this.onMethodChanged,
    required this.isLoading,
    required this.result,
    required this.onTest,
  });

  // ===========================================================================
  // 辅助判断方法 —— 区分数据源查询操作和数据模型 CRUD 操作
  // ===========================================================================

  /// 判断当前方法是否属于"数据源查询操作"
  bool get _isDataSourceMethod => const [
        'getAggregateDataSourceList',
        'getDataSourceAggregateDetail',
        'getDataSourceByTableName',
        'getBasicDataSourceList',
        'getBasicDataSource',
        'getSchemaList',
        'getTableName',
      ].contains(modelsMethod);

  /// 判断当前方法是否需要 datasourceId/datasourceName 输入
  bool get _needsDatasourceIdOrName => const [
        'getDataSourceAggregateDetail',
        'getBasicDataSource',
      ].contains(modelsMethod);

  /// 判断当前方法是否需要表名输入
  bool get _needsTableName => modelsMethod == 'getDataSourceByTableName';

  /// 判断当前方法是否需要数据源名称（单独）
  bool get _needsDatasourceName => const [
        'getSchemaList',
        'getTableName',
      ].contains(modelsMethod);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 卡片标题（带图标）
            Row(
              children: [
                const SizedBox(width: 8),
                Text(
                  '数据模型测试',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const Divider(),

            // 操作方法下拉选择 —— 决定下方显示哪些输入字段
            DropdownButtonFormField<String>(
              value: modelsMethod,
              decoration: const InputDecoration(
                labelText: '操作方法',
                prefixIcon: Icon(Icons.functions),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: const [
                // === 数据模型 CRUD 操作 ===
                DropdownMenuItem(value: 'list', child: Text('list (查询多条)')),
                DropdownMenuItem(value: 'listSimple', child: Text('listSimple (简单查询)')),
                DropdownMenuItem(value: 'get', child: Text('get (条件查询单条)')),
                DropdownMenuItem(value: 'getById', child: Text('getById (ID查询单条)')),
                DropdownMenuItem(value: 'create', child: Text('create (创建单条)')),
                DropdownMenuItem(value: 'createMany', child: Text('createMany (批量创建)')),
                DropdownMenuItem(value: 'update', child: Text('update (更新单条)')),
                DropdownMenuItem(value: 'updateMany', child: Text('updateMany (批量更新)')),
                DropdownMenuItem(value: 'upsert', child: Text('upsert (创建或更新)')),
                DropdownMenuItem(value: 'deleteById', child: Text('deleteById (ID删除)')),
                DropdownMenuItem(value: 'deleteRecord', child: Text('deleteRecord (条件删除单条)')),
                DropdownMenuItem(value: 'deleteMany', child: Text('deleteMany (批量删除)')),
                DropdownMenuItem(value: 'mysqlCommand', child: Text('mysqlCommand (SQL命令)')),
                // === 数据源查询操作 ===
                DropdownMenuItem(value: 'getAggregateDataSourceList', child: Text('聚合数据源列表')),
                DropdownMenuItem(value: 'getDataSourceAggregateDetail', child: Text('聚合数据源详情')),
                DropdownMenuItem(value: 'getDataSourceByTableName', child: Text('按表名查数据源')),
                DropdownMenuItem(value: 'getBasicDataSourceList', child: Text('基础数据源列表')),
                DropdownMenuItem(value: 'getBasicDataSource', child: Text('基础数据源详情')),
                DropdownMenuItem(value: 'getSchemaList', child: Text('Schema 列表')),
                DropdownMenuItem(value: 'getTableName', child: Text('按数据源查表名')),
              ],
              onChanged: (v) => onMethodChanged(v!),
            ),
            const SizedBox(height: 12),

            // =================================================================
            // 数据模型 CRUD 操作的输入字段
            // =================================================================

            // 模型标识输入框 —— 数据源查询和 mysqlCommand 模式不需要
            if (!_isDataSourceMethod && modelsMethod != 'mysqlCommand')
              TextField(
                controller: modelsNameController,
                decoration: const InputDecoration(
                  labelText: '模型标识 (modelName)',
                  hintText: '如 user、order',
                  prefixIcon: Icon(Icons.label),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
            if (!_isDataSourceMethod && modelsMethod != 'mysqlCommand')
              const SizedBox(height: 12),

            // === 记录 ID 输入框 —— 仅 getById / deleteById 操作显示 ===
            if (modelsMethod == 'getById' || modelsMethod == 'deleteById') ...[
              TextField(
                controller: modelsRecordIdController,
                decoration: const InputDecoration(
                  labelText: '记录 ID (recordId)',
                  hintText: '数据记录的唯一 ID',
                  prefixIcon: Icon(Icons.key),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // === Filter 筛选条件 —— 用于条件查询、更新、删除等操作 ===
            if (['get', 'list', 'update', 'updateMany', 'upsert', 'deleteRecord', 'deleteMany'].contains(modelsMethod)) ...[
              TextField(
                controller: modelsFilterController,
                decoration: const InputDecoration(
                  labelText: 'Filter (JSON)',
                  hintText: '{"where": {"_id": {"\$eq": "xxx"}}}',
                  prefixIcon: Icon(Icons.filter_alt),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 3,
                minLines: 1,
              ),
              const SizedBox(height: 12),
            ],

            // === Select 查询字段 —— 仅 get / list 操作显示 ===
            if (['get', 'list'].contains(modelsMethod)) ...[
              TextField(
                controller: modelsSelectController,
                decoration: const InputDecoration(
                  labelText: 'Select (JSON, 可选)',
                  hintText: '{"\$master": true} 或 {"_id": true, "name": true}',
                  prefixIcon: Icon(Icons.checklist),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // === 分页参数 —— list / listSimple / getAggregateDataSourceList / getBasicDataSourceList ===
            if (['list', 'listSimple', 'getAggregateDataSourceList', 'getBasicDataSourceList'].contains(modelsMethod)) ...[
              Row(
                children: [
                  // 每页条数
                  Expanded(
                    child: TextField(
                      controller: modelsPageSizeController,
                      decoration: const InputDecoration(
                        labelText: 'PageSize',
                        prefixIcon: Icon(Icons.format_list_numbered),
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // 页码
                  Expanded(
                    child: TextField(
                      controller: modelsPageNumberController,
                      decoration: const InputDecoration(
                        labelText: 'PageNumber',
                        prefixIcon: Icon(Icons.pages),
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // === 排序规则 —— 仅 list 操作显示 ===
            if (modelsMethod == 'list') ...[
              TextField(
                controller: modelsOrderByController,
                decoration: const InputDecoration(
                  labelText: 'OrderBy (JSON, 可选)',
                  hintText: '[{"createdAt": "desc"}]',
                  prefixIcon: Icon(Icons.sort),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // === 写入数据 —— 用于 create / createMany / update / updateMany / upsert ===
            if (['create', 'createMany', 'update', 'updateMany', 'upsert'].contains(modelsMethod)) ...[
              TextField(
                controller: modelsDataController,
                decoration: InputDecoration(
                  labelText: 'Data (JSON)',
                  hintText: modelsMethod == 'createMany'
                      ? '[{"name":"张三"},{"name":"李四"}]'
                      : '{"name": "张三", "age": 25}',
                  prefixIcon: const Icon(Icons.data_object),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 3,
                minLines: 1,
              ),
              const SizedBox(height: 12),
            ],

            // === SQL 模板 —— 仅 mysqlCommand 操作显示 ===
            if (modelsMethod == 'mysqlCommand') ...[
              // SQL 模板输入 —— 使用 {{ 变量名 }} 语法引用参数
              TextField(
                controller: modelsSqlTemplateController,
                decoration: const InputDecoration(
                  labelText: 'SQL Template',
                  hintText: 'select * from `users` where _id = {{ _id }}',
                  prefixIcon: Icon(Icons.code),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 3,
                minLines: 1,
              ),
              const SizedBox(height: 12),
              // SQL 参数（JSON 数组格式） —— 为模板中的变量提供具体值
              TextField(
                controller: modelsSqlParameterController,
                decoration: const InputDecoration(
                  labelText: 'Parameters (JSON 数组, 可选)',
                  hintText: '[{"key":"_id","type":"STRING","value":"123"}]',
                  prefixIcon: Icon(Icons.tune),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                maxLines: 2,
                minLines: 1,
              ),
              const SizedBox(height: 12),
            ],

            // =================================================================
            // 数据源查询操作的输入字段
            // =================================================================

            // === 数据源 ID + 名称 —— 聚合详情 / 基础详情 ===
            if (_needsDatasourceIdOrName) ...[
              TextField(
                controller: datasourceIdController,
                decoration: const InputDecoration(
                  labelText: '数据源 ID (datasourceId)',
                  hintText: '与数据源名称二选一',
                  prefixIcon: Icon(Icons.fingerprint),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: datasourceNameController,
                decoration: const InputDecoration(
                  labelText: '数据源名称 (dataSourceName)',
                  hintText: '与数据源 ID 二选一',
                  prefixIcon: Icon(Icons.label_outline),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // === 数据源名称（单独使用）—— getSchemaList / getTableName ===
            if (_needsDatasourceName) ...[
              TextField(
                controller: datasourceNameController,
                decoration: InputDecoration(
                  labelText: modelsMethod == 'getSchemaList'
                      ? '数据源名称列表 (逗号分隔, 可选)'
                      : '数据源名称 (dataSourceName)',
                  hintText: modelsMethod == 'getSchemaList'
                      ? '如 user,order（不填查全部）'
                      : '如 user',
                  prefixIcon: const Icon(Icons.label_outline),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // === 表名 —— getDataSourceByTableName ===
            if (_needsTableName) ...[
              TextField(
                controller: datasourceTableNameController,
                decoration: const InputDecoration(
                  labelText: '表名列表 (逗号分隔)',
                  hintText: '如 users,orders',
                  prefixIcon: Icon(Icons.table_chart),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // === getBasicDataSourceList 特有：名称列表输入 ===
            if (modelsMethod == 'getBasicDataSourceList') ...[
              TextField(
                controller: datasourceNameController,
                decoration: const InputDecoration(
                  labelText: '数据源名称列表 (逗号分隔, 可选)',
                  hintText: '如 user,order',
                  prefixIcon: Icon(Icons.list_alt),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // 执行按钮 —— 加载中时显示 CircularProgressIndicator
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onTest,
                icon: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.play_arrow),
                label: Text(isLoading ? '执行中...' : '执行 $modelsMethod'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
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
