"use strict";
import tcb from "@cloudbase/node-sdk";
import * as fs from "fs";
import * as path from "path";
import { getEnvConfig, getApiKey } from "../config/env.js";
export function getTcbApp() {
  const config = getEnvConfig();
  return tcb.init({
    env: config.envId,
    accessKey: getApiKey()
  });
}
export function replaceEnvId(urlTemplate) {
  const config = getEnvConfig();
  return urlTemplate.replace("{{envId}}", config.envId);
}
export function replaceReadMe(agentSetting) {
  try {
    const readmePath = path.join(process.cwd(), "README.md");
    const readmeData = fs.readFileSync(readmePath, "utf8");
    return agentSetting.replace("{{README.md}}", readmeData);
  } catch (error) {
    console.log("读取 README.md 失败:", error);
    return agentSetting.replace("{{README.md}}", "");
  }
}
export async function getFileInfo(files) {
  const originFileInfos = [];
  if (!files || files.length === 0) {
    return originFileInfos;
  }
  try {
    const tcbapp = getTcbApp();
    const fileInfo = await tcbapp.getFileInfo({ fileList: files });
    return fileInfo.fileList.map((item) => {
      const type = item.mime?.startsWith("image/") ? "image" : item.mime ? "file" : "";
      return {
        cloudId: item.cloudId || "",
        fileName: item.fileName || "",
        bytes: item.size || 0,
        type
      };
    });
  } catch (error) {
    console.log("获取文件信息失败:", error);
  }
  return originFileInfos;
}
export async function mcpProcessContent(content, mcpName) {
  if (content.type === "image") {
    try {
      const buffer = Buffer.from(content.data, "base64");
      const tcbapp = getTcbApp();
      const file = await tcbapp.uploadFile({
        cloudPath: `mcp_server/${mcpName}/${Date.now()}.png`,
        fileContent: buffer
      });
      const data = await tcbapp.getTempFileURL({ fileList: [file.fileID] });
      const tempFileURL = data?.fileList?.[0]?.tempFileURL;
      if (tempFileURL) {
        return {
          ...content,
          data: tempFileURL
        };
      }
    } catch (error) {
      console.log("MCP 图片处理失败:", error);
    }
  }
  return content;
}
