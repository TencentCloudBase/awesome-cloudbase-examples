/**
 * CMS 数据服务
 *
 * TODO: 使用后端 SDK 实现以下所有函数。
 * 所有函数签名和返回值类型已固定，请勿修改。
 */

import { app } from "./backend";
import type {
  ArticleRecord,
  ArticleFormData,
  ArticleStatus,
  PaginationParams,
} from "../types";

/**
 * 获取文章列表
 *
 * TODO: 从数据库查询文章列表
 * - 支持按 title 关键词搜索（大小写不敏感的包含匹配）
 * - 支持按 status 筛选（"all" 表示不筛选）
 * - 支持分页（page 从 1 开始，pageSize 默认 5）
 * - 按 updatedAt 降序排列
 * - 返回 { list: ArticleRecord[], total: number }
 * - 每条记录需包含 authorId 和 authorName 字段
 */
export async function getArticles(
  filter: { keyword: string; status: ArticleStatus | "all" },
  pagination: PaginationParams
): Promise<{ list: ArticleRecord[]; total: number }> {
  // TODO: 实现文章列表查询
  throw new Error("getArticles() 尚未实现");
}

/**
 * 获取单篇文章
 *
 * TODO: 从数据库查询单条文章记录
 * - 查到返回 ArticleRecord
 * - 查不到返回 null
 */
export async function getArticle(
  id: string
): Promise<ArticleRecord | null> {
  // TODO: 实现单篇文章查询
  throw new Error("getArticle() 尚未实现");
}

/**
 * 创建文章
 *
 * TODO: 向数据库插入一条新的文章记录
 * - 自动关联当前登录用户的 UID 到 authorId 字段
 * - 自动关联当前登录用户的邮箱/显示名到 authorName 字段
 * - 自动生成 createdAt 和 updatedAt 时间戳
 * - 返回新创建文章的 ID
 */
export async function createArticle(
  data: ArticleFormData
): Promise<string> {
  // TODO: 实现创建文章
  throw new Error("createArticle() 尚未实现");
}

/**
 * 更新文章
 *
 * TODO: 更新数据库中指定 ID 的文章记录
 * - 更新 title、summary、content、status、coverImage 字段
 * - 自动更新 updatedAt 时间戳
 * - 不修改 authorId、authorName、createdAt
 */
export async function updateArticle(
  id: string,
  data: ArticleFormData
): Promise<void> {
  // TODO: 实现更新文章
  throw new Error("updateArticle() 尚未实现");
}

/**
 * 删除文章
 *
 * TODO: 从数据库中删除指定 ID 的文章记录
 */
export async function deleteArticle(id: string): Promise<void> {
  // TODO: 实现删除文章
  throw new Error("deleteArticle() 尚未实现");
}
