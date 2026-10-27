// 查询/更新指令（db.command）示例集
//
// 该文件演示如何使用 CloudBase 文档型数据库的「查询指令」`db.command`
// （对应 database.dart 中的 `Database.command` getter）来构造复杂的查询条件
// 和更新操作。
//
// `db.command`（下文统一简写为 `_`）提供了一组链式方法，返回 `DbCommand` 对象，
// 可以直接作为 where 条件的字段值，或作为 update 数据的字段值，SDK 会自动把它们
// 序列化成 MongoDB 操作符（如 $gt、$in、$inc 等）。
//
// 用法示例：
// ```dart
// final examples = CommandExamples(cloudBase.database());
// final text = await examples.compareGt();   // 运行「大于」示例
// print(text);
// ```
//
// 注意：这些示例假设存在一个 `todos` 集合，文档形如：
// { "title": "学习 Flutter", "priority": 3, "completed": false,
//   "tags": ["study", "flutter"], "views": 0 }
// 运行前请确保集合已创建，且当前用户有相应读写权限。
import 'package:cloudbase_flutter/cloudbase_flutter.dart';

/// 查询/更新指令示例集合。
///
/// 每个方法对应一个 `db.command` 的典型用法，返回可读的结果字符串，
/// 便于在 UI 上直接展示，或作为学习 `DbCommand` API 的参考。
class CommandExamples {
  CommandExamples(this._db, {this.collection = 'todos'});

  /// 数据库实例（来自 `cloudBase.database()`）
  final CloudBaseDatabase _db;

  /// 示例操作的目标集合名称
  final String collection;

  /// 查询指令入口，等价于 JS SDK 的 `db.command`
  DbCommand get _ => _db.command;

  /// 集合引用快捷方式
  CollectionReference get _coll => _db.collection(collection);

  // ==========================================================================
  // 一、比较操作符
  // ==========================================================================

  /// 大于：查询 priority > 2 的待办
  ///
  /// 等价条件：`{ priority: _.gt(2) }`
  Future<String> compareGt() async {
    final res = await _coll.where({
      'priority': _.gt(2),
    }).get();
    return _formatGet('priority > 2', res);
  }

  /// 范围查询：2 <= priority <= 4
  ///
  /// 用 `_.and([...])` 把多个条件组合到同一字段上。
  Future<String> compareRange() async {
    final res = await _coll.where({
      'priority': _.gte(2).and([_.lte(4)]),
    }).get();
    return _formatGet('2 <= priority <= 4', res);
  }

  /// 在集合中（in）：查询 priority 为 1、3、5 之一的待办
  ///
  /// 等价条件：`{ priority: _.inList([1, 3, 5]) }`
  Future<String> compareIn() async {
    final res = await _coll.where({
      'priority': _.inList([1, 3, 5]),
    }).get();
    return _formatGet('priority in [1,3,5]', res);
  }

  // ==========================================================================
  // 二、逻辑操作符
  // ==========================================================================

  /// 逻辑或（or）：completed == true 或 priority >= 4
  ///
  /// `_.or([...])` 接受多个「字段条件对象」，任一满足即命中。
  /// 作为顶层跨字段的「或」条件时，用 `$or` 作为 where 的 key，
  /// value 为条件数组。
  Future<String> logicOr() async {
    final res = await _coll.where({
      r'$or': [
        {'completed': true},
        {'priority': _.gte(4)},
      ],
    }).get();
    return _formatGet('completed == true 或 priority >= 4', res);
  }

  /// 字段级逻辑或：priority < 2 或 priority > 4（即不在 [2,4] 区间）
  Future<String> logicFieldOr() async {
    final res = await _coll.where({
      'priority': _.lt(2).or([_.gt(4)]),
    }).get();
    return _formatGet('priority < 2 或 priority > 4', res);
  }

  // ==========================================================================
  // 三、字段 / 数组操作符
  // ==========================================================================

  /// 字段是否存在（exists）：查询包含 dueDate 字段的待办
  Future<String> fieldExists() async {
    final res = await _coll.where({
      'dueDate': _.exists(true),
    }).get();
    return _formatGet('存在 dueDate 字段', res);
  }

  /// 数组包含所有（all）：tags 同时包含 study 和 flutter
  Future<String> arrayAll() async {
    final res = await _coll.where({
      'tags': _.all(['study', 'flutter']),
    }).get();
    return _formatGet("tags 同时包含 ['study','flutter']", res);
  }

  /// 数组长度（size）：恰好有 2 个 tag 的待办
  Future<String> arraySize() async {
    final res = await _coll.where({
      'tags': _.size(2),
    }).get();
    return _formatGet('tags 数组长度 == 2', res);
  }

  // ==========================================================================
  // 四、更新操作符（配合 where + update 使用）
  // ==========================================================================

  /// 数值自增（inc）：把所有未完成待办的 views + 1
  Future<String> updateInc() async {
    final res = await _coll.where({
      'completed': false,
    }).update({
      'views': _.inc(1),
    });
    return _formatUpdate('未完成待办 views += 1', res);
  }

  /// 数组追加（push）：给指定标题的待办追加一个 tag
  Future<String> updatePush() async {
    final res = await _coll.where({
      'title': '学习 Flutter',
    }).update({
      'tags': _.push('cloudbase'),
    });
    return _formatUpdate("给「学习 Flutter」追加 tag 'cloudbase'", res);
  }

  /// 删除数组匹配元素（pull）：从所有待办的 tags 中移除 'study'
  Future<String> updatePull() async {
    final res = await _coll.where({
      'tags': _.all(['study']),
    }).update({
      'tags': _.pull('study'),
    });
    return _formatUpdate("从 tags 中移除 'study'", res);
  }

  /// 删除字段（remove/$unset）：删除 dueDate 字段
  Future<String> updateRemoveField() async {
    final res = await _coll.where({
      'dueDate': _.exists(true),
    }).update({
      'dueDate': _.remove(),
    });
    return _formatUpdate('删除 dueDate 字段', res);
  }

  // ==========================================================================
  // 结果格式化辅助方法
  // ==========================================================================

  /// 格式化 get 查询结果
  String _formatGet(String desc, DbGetResult res) {
    final buf = StringBuffer()
      ..writeln('[查询] $desc')
      ..writeln('Success: ${res.isSuccess}')
      ..writeln('命中: ${res.data.length} 条')
      ..writeln('RequestId: ${res.requestId}');
    for (var i = 0; i < res.data.length && i < 5; i++) {
      buf.writeln('  #$i: ${res.data[i]}');
    }
    return buf.toString();
  }

  /// 格式化 update 更新结果
  String _formatUpdate(String desc, DbUpdateResult res) {
    final buf = StringBuffer()
      ..writeln('[更新] $desc')
      ..writeln('Success: ${res.isSuccess}')
      ..writeln('Matched: ${res.matched}')
      ..writeln('Updated: ${res.updated}')
      ..writeln('Message: ${res.message}')
      ..writeln('RequestId: ${res.requestId}');
    return buf.toString();
  }
}
