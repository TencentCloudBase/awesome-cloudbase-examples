/**
 * 认证服务
 *
 * TODO: 使用后端客户端实现以下所有函数。
 * 所有函数签名和返回值类型已固定，请勿修改。
 */

import { app } from "./backend";
import type { CurrentUser, UserRole } from "../types";

/**
 * 用户名密码注册
 *
 * TODO: 调用后端客户端的用户名密码注册接口
 * - 注册成功返回 true
 * - 注册后默认角色为 editor，需在数据库中记录用户信息（uid、username、role）
 * - 注册失败抛出 Error
 */
export async function register(
  username: string,
  password: string
): Promise<boolean> {
  // TODO: 实现用户名密码注册
  throw new Error("register() 尚未实现");
}

/**
 * 用户名密码登录
 *
 * TODO: 调用后端客户端的用户名密码登录接口
 * - 登录成功返回 true
 * - 登录失败返回 false（不抛异常）
 */
export async function login(
  username: string,
  password: string
): Promise<boolean> {
  // TODO: 实现用户名密码登录
  throw new Error("login() 尚未实现");
}

/**
 * 获取当前登录用户信息
 *
 * TODO: 从后端客户端获取当前登录用户
 * - 已登录：返回 { uid, displayName, role }
 * - 未登录：返回 null
 * - role 应从数据库中的用户记录获取
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // TODO: 实现获取当前用户信息
  throw new Error("getCurrentUser() 尚未实现");
}

/**
 * 获取当前用户角色
 *
 * TODO: 从数据库中查询当前用户的角色
 * - 返回 "admin" 或 "editor"
 * - 未登录或查询失败返回 "editor" 作为默认值
 */
export async function getUserRole(): Promise<UserRole> {
  // TODO: 实现获取用户角色
  throw new Error("getUserRole() 尚未实现");
}

/**
 * 检查当前是否已登录
 *
 * TODO: 检查后端客户端的登录状态
 * - 已登录返回 true
 * - 未登录返回 false
 */
export async function checkAuth(): Promise<boolean> {
  // TODO: 实现登录状态检查
  return false;
}

/**
 * 退出登录
 *
 * TODO: 调用后端客户端的退出登录接口，清除登录状态
 */
export async function logout(): Promise<void> {
  // TODO: 实现退出登录
  throw new Error("logout() 尚未实现");
}
