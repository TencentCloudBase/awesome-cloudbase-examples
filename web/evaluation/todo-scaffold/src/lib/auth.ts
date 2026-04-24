/**
 * 认证服务
 *
 * TODO: 使用后端客户端实现以下所有函数。
 * 所有函数签名和返回值类型已固定,请勿修改。
 */

import type { CurrentUser } from "../types";

/**
 * 用户名密码注册
 *
 * TODO: 调用后端客户端的用户名密码注册接口
 * - 账号字段是普通用户名样式标识符,不是邮箱地址
 * - 注册成功返回 true
 * - 注册失败抛出 Error(例如用户名已存在、密码过短等)
 */
export async function register(
  username: string,
  password: string
): Promise<boolean> {
  // 使用参数避免 unused warning
  void username;
  void password;
  throw new Error("register() 尚未实现");
}

/**
 * 用户名密码登录
 *
 * TODO: 调用后端客户端的用户名密码登录接口
 * - 账号字段是普通用户名样式标识符,不是邮箱地址
 * - 登录成功返回 true
 * - 登录失败返回 false(不抛异常)
 */
export async function login(
  username: string,
  password: string
): Promise<boolean> {
  void username;
  void password;
  throw new Error("login() 尚未实现");
}

/**
 * 获取当前登录用户信息
 *
 * TODO: 从后端客户端获取当前登录用户
 * - 已登录:返回 { uid, displayName }
 * - 未登录:返回 null
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  throw new Error("getCurrentUser() 尚未实现");
}

/**
 * 检查当前是否已登录
 *
 * TODO: 检查后端客户端的登录状态
 * - 已登录返回 true
 * - 未登录返回 false
 */
export async function checkAuth(): Promise<boolean> {
  return false;
}

/**
 * 退出登录
 *
 * TODO: 调用后端客户端的退出登录接口,清除登录状态
 */
export async function logout(): Promise<void> {
  throw new Error("logout() 尚未实现");
}
