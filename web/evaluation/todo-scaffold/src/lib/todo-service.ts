/**
 * Todo 数据服务
 *
 * TODO: 使用后端客户端实现以下所有函数。
 * 函数签名已固定,请勿修改。
 *
 * 数据隔离要求:
 * - 每个匿名会话只能看到/修改/删除自己创建的 Todo
 * - 隔离必须在后端层面实现,不能仅依赖前端过滤
 */

import type { TodoRecord } from "../types";

/**
 * 获取当前会话的 Todo 列表
 * 只返回 ownerId 与当前 sessionId 匹配的记录。
 */
export async function listTodos(): Promise<TodoRecord[]> {
  throw new Error("listTodos() 尚未实现");
}

/**
 * 创建 Todo
 * 自动关联当前 sessionId 到 ownerId;done 默认 false。
 */
export async function createTodo(title: string): Promise<TodoRecord> {
  void title;
  throw new Error("createTodo() 尚未实现");
}

/**
 * 切换 Todo 完成状态
 * 只能操作自己会话的记录。
 */
export async function toggleTodo(id: string, done: boolean): Promise<void> {
  void id;
  void done;
  throw new Error("toggleTodo() 尚未实现");
}

/**
 * 删除 Todo
 * 只能删除自己会话的记录。
 */
export async function deleteTodo(id: string): Promise<void> {
  void id;
  throw new Error("deleteTodo() 尚未实现");
}
