/**
 * Todo 数据服务
 *
 * TODO: 使用后端客户端实现以下所有函数。
 * 所有函数签名和返回值类型已固定,请勿修改。
 *
 * 数据隔离要求:
 * - 每个用户只能看到、修改、删除自己创建的 Todo
 * - 未登录时所有函数应抛出未授权错误
 * - 数据隔离必须在后端层面实现,不能仅依赖前端过滤
 */

import type { TodoRecord } from "../types";

/**
 * 获取当前用户的 Todo 列表
 *
 * TODO: 从后端查询当前用户的所有 Todo
 * - 只返回当前登录用户的记录
 * - 未登录应抛出错误
 */
export async function listTodos(): Promise<TodoRecord[]> {
  throw new Error("listTodos() 尚未实现");
}

/**
 * 创建 Todo
 *
 * TODO: 插入一条新的 Todo 记录
 * - 自动关联当前登录用户的 UID 到 ownerId 字段
 * - 新建时 done 默认 false
 * - 返回新创建的完整 TodoRecord
 */
export async function createTodo(title: string): Promise<TodoRecord> {
  void title;
  throw new Error("createTodo() 尚未实现");
}

/**
 * 切换 Todo 的完成状态
 *
 * TODO: 根据 id 更新 done 字段
 * - 必须确保用户只能更新自己的 Todo(权限校验在后端)
 */
export async function toggleTodo(id: string, done: boolean): Promise<void> {
  void id;
  void done;
  throw new Error("toggleTodo() 尚未实现");
}

/**
 * 删除 Todo
 *
 * TODO: 根据 id 删除记录
 * - 必须确保用户只能删除自己的 Todo(权限校验在后端)
 */
export async function deleteTodo(id: string): Promise<void> {
  void id;
  throw new Error("deleteTodo() 尚未实现");
}
