/**
 * TCB (Tencent CloudBase) 工具函数
 * 提供云开发相关的工具方法
 */

import tcb, { CloudBase } from '@cloudbase/node-sdk'
import * as fs from 'fs'
import * as path from 'path'

import { getEnvConfig, getApiKey } from '../config/env.js'
import type { FileInfo } from '../types/entities.js'

/**
 * 获取 TCB 应用实例
 */
export function getTcbApp(): CloudBase {
  const config = getEnvConfig()
  return tcb.init({
    env: config.envId,
    accessKey: getApiKey()
  } as any)
}

/**
 * 替换 URL 模板中的 envId
 */
export function replaceEnvId(urlTemplate: string): string {
  const config = getEnvConfig()
  return urlTemplate.replace('{{envId}}', config.envId)
}

/**
 * 替换 agent 配置中的 README.md 内容
 */
export function replaceReadMe(agentSetting: string): string {
  try {
    const readmePath = path.join(process.cwd(), 'README.md')
    const readmeData = fs.readFileSync(readmePath, 'utf8')
    return agentSetting.replace('{{README.md}}', readmeData)
  } catch (error) {
    console.log('读取 README.md 失败:', error)
    return agentSetting.replace('{{README.md}}', '')
  }
}

/**
 * 获取云存储文件信息
 * @param files - 云存储文件 ID 列表
 * @returns 文件信息列表
 */
export async function getFileInfo(files: string[]): Promise<FileInfo[]> {
  const originFileInfos: FileInfo[] = []
  if (!files || files.length === 0) {
    return originFileInfos
  }

  try {
    const tcbapp = getTcbApp()
    const fileInfo = await tcbapp.getFileInfo({ fileList: files })
    return fileInfo.fileList.map((item) => {
      const type = item.mime?.startsWith('image/') ? 'image' : (item.mime ? 'file' : '')
      return {
        cloudId: item.cloudId || '',
        fileName: item.fileName || '',
        bytes: item.size || 0,
        type
      }
    })
  } catch (error) {
    console.log('获取文件信息失败:', error)
  }
  return originFileInfos
}

/**
 * MCP 内容类型
 */
export interface McpContent {
  type: string
  data: string
}

/**
 * 处理 MCP 工具返回的 content 中的图片或文件资源
 * 将 base64 图片上传到云存储，并返回临时 URL
 * @param content - MCP 返回的内容
 * @param mcpName - MCP 服务名称
 * @returns 处理后的内容
 */
export async function mcpProcessContent(
  content: McpContent,
  mcpName: string
): Promise<McpContent> {
  if (content.type === 'image') {
    try {
      const buffer = Buffer.from(content.data, 'base64')
      const tcbapp = getTcbApp()
      const file = await tcbapp.uploadFile({
        cloudPath: `mcp_server/${mcpName}/${Date.now()}.png`,
        fileContent: buffer
      })
      const data = await tcbapp.getTempFileURL({ fileList: [file.fileID] })
      const tempFileURL = data?.fileList?.[0]?.tempFileURL
      if (tempFileURL) {
        return {
          ...content,
          data: tempFileURL
        }
      }
    } catch (error) {
      console.log('MCP 图片处理失败:', error)
    }
  }
  return content
}


