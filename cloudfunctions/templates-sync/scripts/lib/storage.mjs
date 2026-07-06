// storage.mjs
//
// CloudBase 云存储 HTTP API 客户端。
// 使用 CLOUDBASE_APIKEY 通过网关 API 上传文件到 CloudBase 存储。
//
// 流程（两步）：
//   1. POST /v1/storages/get-objects-upload-info → 获取上传 URL + 临时授权凭证
//   2. PUT <uploadUrl> → 带上凭证直接上传二进制文件
//
// 引用文档 / Reference:
//   https://docs.cloudbase.net/http-api/storage/get-objects-upload-info

import { readFileSync, statSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotenv } from './cloudbase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 导出：上传文件 ----------
export async function uploadFile({ zipPath, remoteName, envId, apiKey }) {
    if (!zipPath) throw new Error('zipPath is required');
    if (!envId)  throw new Error('envId is required');
    if (!apiKey) throw new Error('apiKey is required');

    const fileName = remoteName || basename(zipPath);
    const size = statSync(zipPath).size;
    console.error(`  [storage] uploading ${fileName} (${(size / 1024).toFixed(1)} KB) via HTTP API...`);

    const apiBase = `https://${envId}.api.tcloudbasegateway.com`;

    // Step 1: 获取上传信息
    const infoResp = await fetch(`${apiBase}/v1/storages/get-objects-upload-info`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ objectId: remoteName || basename(zipPath) }]),
    });

    if (!infoResp.ok) {
        const err = await infoResp.text();
        throw new Error(`get-objects-upload-info HTTP ${infoResp.status}: ${err.slice(0, 300)}`);
    }

    const infoData = await infoResp.json();
    const info = Array.isArray(infoData) ? infoData[0] : infoData;

    const uploadUrl = info?.uploadUrl;
    const authorization = info?.authorization;
    const token = info?.token;
    const cloudObjectMeta = info?.cloudObjectMeta;
    const downloadUrl = info?.downloadUrl || '';
    const cloudObjectId = info?.cloudObjectId || '';

    if (!uploadUrl || !authorization) {
        throw new Error(`get-objects-upload-info returned no uploadUrl: ${JSON.stringify(info).slice(0, 300)}`);
    }

    // Step 2: PUT 上传文件
    const fileBuffer = readFileSync(zipPath);
    const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Authorization': authorization,
            'X-Cos-Security-Token': token || '',
            'X-Cos-Meta-Fileid': cloudObjectMeta || '',
            'Content-Length': String(fileBuffer.length),
        },
        body: fileBuffer,
    });

    if (!uploadResp.ok) {
        const err = await uploadResp.text();
        throw new Error(`PUT upload HTTP ${uploadResp.status}: ${err.slice(0, 300)}`);
    }

    console.error(`  [storage] uploaded OK, cloudObjectId: ${cloudObjectId}`);
    console.error(`  [storage] downloadUrl: ${(downloadUrl || 'not provided').slice(0, 80)}...`);

    return {
        downloadUrl: downloadUrl || '',
        cloudObjectId,
        fileId: cloudObjectId,
    };
}

// ---------- 获取存储环境变量 ----------
export function getStorageEnv() {
    loadDotenv();
    // 仅使用 TEMPLATE_ENV_ID（lowcode-5g5llxbq5bc9299e），不走其他环境
    return {
        envId:    process.env.TEMPLATE_ENV_ID || process.env.ENV_ID,
        apiKey:   process.env.CLOUDBASE_APIKEY || '',
    };
}
