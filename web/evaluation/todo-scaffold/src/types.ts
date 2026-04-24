/**
 * 当前登录用户信息
 */
export interface CurrentUser {
  uid: string;
  displayName: string;
}

/**
 * Todo 数据记录
 *
 * 字段定义:
 * - id: 记录唯一标识(string)
 * - title: Todo 标题
 * - done: 是否已完成
 * - ownerId: 创建者 UID(用于数据隔离)
 */
export interface TodoRecord {
  id: string;
  title: string;
  done: boolean;
  ownerId: string;
}
