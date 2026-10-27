/**
 * 会话管理
 *
 * TODO: 实现"首次访问时自动建立匿名会话"的逻辑。
 *
 * 核心要求:
 * - 页面加载时自动建立匿名会话(无需用户交互)
 * - 每个会话有一个稳定的 sessionId,后端用它识别"同一用户"
 * - 不同浏览器 / 不同隐身窗口应得到不同 sessionId
 * - 不同会话的数据必须隔离(不能互相看到对方的 Todo)
 *
 * 实现建议:
 * - CloudBase: 使用 auth.signInAnonymously()
 * - 自建后端: 签发 session cookie / JWT, ownerId 绑定该 session
 *
 * 函数签名已固定,请勿修改。
 */

import type { SessionInfo } from "../types";

/**
 * 确保当前浏览器有一个有效的匿名会话。
 * 如果已有会话直接返回;如果没有,建立新的匿名会话。
 */
export async function ensureSession(): Promise<SessionInfo> {
  throw new Error("ensureSession() 尚未实现");
}

/**
 * 获取当前会话(不触发新建)。无会话返回 null。
 */
export async function getCurrentSession(): Promise<SessionInfo | null> {
  throw new Error("getCurrentSession() 尚未实现");
}
