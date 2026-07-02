// storage.mjs
//
// CloudBase 云存储上传客户端。
// 使用 `tcb storage upload` CLI 上传 zip 包，然后通过数据模型字段存储 URL。
//
// 为什么用 CLI 而不是 HTTP API：
//   CloudBase 存储上传流程为「获取签名 → 上传到 COS」，HTTP API 端点不稳定。
//   tcb CLI 已处理好认证 + COS 直传，更可靠。
//
// 引用文档 / Reference:
//   https://docs.cloudbase.net/cli/v1/commands/storage#tcb-storage-upload

import { statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadDotenv } from './cloudbase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 导出：通过 tcb CLI 上传文件 ----------
// 返回 { downloadUrl } — 上传成功后通过 getTempFileURL 获取
export function uploadFile({ zipPath, remoteName, envId, apiKey }) {
    if (!zipPath) throw new Error('zipPath is required');

    const fileName = remoteName || basename(zipPath);
    const size = statSync(zipPath).size;
    console.error(`  [storage] uploading ${fileName} (${(size / 1024).toFixed(1)} KB) via tcb CLI...`);

    // Step 1: 用环境变量注入避免交互式登录
    // tcb storage upload <localPath> <cloudPath>
    const localPath = zipPath;
    const cloudPath = `templates/${basename(zipPath)}`;

    // 设置 TCB_ENV_ID 环境变量
    const env = { ...process.env };
    if (envId) env.TCB_ENV_ID = envId;

    let stdout;
    try {
        stdout = execFileSync('tcb', [
            'storage', 'upload',
            localPath,
            cloudPath,
            '-e', envId,
        ], { env, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
        const detail = err.stderr ? err.stderr.toString().slice(0, 300) : err.message;
        throw new Error(`[storage] tcb storage upload failed: ${detail}`);
    }

    // Step 2: 获取公网下载 URL (使用 tcb storage get-temp-url)
    let urlStdout;
    try {
        urlStdout = execFileSync('tcb', [
            'storage', 'get-temp-url',
            '--cloudPaths', cloudPath,
            '-e', envId,
        ], { env, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
        // get-temp-url 失败，但上传已成功，用文件 ID 推测 URL
        console.error(`  [storage] warning: get-temp-url failed, will try to derive URL from online data`);
        return { downloadUrl: '' };
    }

    // 解析 get-temp-url 的输出
    // 输出格式可能为: [{"cloudPath":"templates/xxx.zip","tempFileURL":"https://...","fileId":"...","maxAge":...}]
    let parsed = null;
    try { parsed = JSON.parse(urlStdout); } catch {}
    if (Array.isArray(parsed) && parsed.length > 0) {
        const url = parsed[0].tempFileURL || parsed[0].url || '';
        console.error(`  [storage] uploaded OK, URL obtained`);
        return { downloadUrl: url, fileId: parsed[0].fileId || '' };
    }

    // 尝试行解析
    const urlMatch = urlStdout.match(/https?:\/\/[^\s"']+/);
    if (urlMatch) {
        console.error(`  [storage] uploaded OK, URL obtained`);
        return { downloadUrl: urlMatch[0] };
    }

    console.error(`  [storage] uploaded OK, but could not parse download URL from output`);
    return { downloadUrl: '' };
}

// ---------- 获取存储环境变量 ----------
export function getStorageEnv() {
    loadDotenv();
    return {
        envId:  process.env.TEMPLATE_ENV_ID || process.env.ENV_ID,
        apiKey: process.env.CLOUDBASE_APIKEY || '',
    };
}
