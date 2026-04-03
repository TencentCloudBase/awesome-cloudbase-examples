/**
 * 文件存储服务
 *
 * TODO: 使用后端客户端实现以下函数。
 * 函数签名和返回值类型已固定，请勿修改。
 */

import { app } from "./backend";

/**
 * 上传封面图片
 *
 * TODO: 将文件上传到文件存储
 * - 上传成功返回文件的可访问 URL（https:// 开头）
 * - 文件路径建议使用 `covers/{timestamp}-{filename}` 格式避免冲突
 * - 上传失败抛出 Error
 */
export async function uploadCoverImage(file: File): Promise<string> {
  // TODO: 实现文件上传到文件存储
  throw new Error("uploadCoverImage() 尚未实现");
}
