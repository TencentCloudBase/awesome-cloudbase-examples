/**
 * 会话信息(匿名会话)
 * 每个浏览器会话自动获得一个 sessionId,不需要注册登录。
 */
export interface SessionInfo {
  sessionId: string;
}

/**
 * Todo 数据记录
 */
export interface TodoRecord {
  id: string;
  title: string;
  done: boolean;
  ownerId: string;
}
