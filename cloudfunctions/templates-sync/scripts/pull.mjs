#!/usr/bin/env node
// 试探脚本：通过 CloudBase 数据模型 OpenAPI 拉取模板列表
// Probe: fetch the template list via the CloudBase Data Model OpenAPI.
//   READ-ONLY: writes nothing locally, modifies nothing remotely.
//
// 用法 / Usage:
//   node scripts/pull.mjs                # 列前 5 条 + 字段统计 + 总数
//   node scripts/pull.mjs --limit 20     # 自定义首页大小
//   node scripts/pull.mjs --full         # 拉全量（仍只打印，不落盘）
//   node scripts/pull.mjs --json         # 完整 JSON 输出（管道用）
//   node scripts/pull.mjs --count        # 仅打印总数

import { loadDotenv, mask, CloudBaseDataModel } from './lib/cloudbase.mjs';

loadDotenv();

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function val(name, def) {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}

const envId     = process.env.TEMPLATE_ENV_ID;
const modelName = process.env.TEMPLATE_MODEL_ID;
const apiKey    = process.env.CLOUDBASE_APIKEY;
const limit     = Number(val('--limit', 5));
const full      = flag('--full');
const jsonOut   = flag('--json');
const countOnly = flag('--count');

function header() {
    // 重要：所有日志写到 stderr，让 stdout 只用于 --json 输出，便于管道
    // All logs go to stderr; stdout is reserved for --json output (pipe-friendly).
    const out = jsonOut ? console.error : console.log;
    out('== CloudBase Template Pull (Data Model OpenAPI, read-only) ==');
    out(`  TEMPLATE_ENV_ID    = ${envId || '<empty>'}`);
    out(`  TEMPLATE_MODEL_ID  = ${modelName || '<empty>'}`);
    out(`  CLOUDBASE_APIKEY   = ${mask(apiKey)}`);
    out('');
}

(async () => {
    header();
    if (!apiKey) {
        console.error('[FAIL] CLOUDBASE_APIKEY 未设置 / not set');
        console.error('       请在 cloudfunctions/scripts/.env 中填入 CLOUDBASE_APIKEY');
        process.exit(2);
    }

    const client = new CloudBaseDataModel({ envId, modelName, apiKey });
    const logLine = jsonOut ? console.error : console.log;
    logLine(`Base: ${client.baseUrl}`);
    logLine('');

    try {
        if (countOnly) {
            const resp = await client.list({ pageSize: 1, pageNumber: 1, getCount: true });
            const total = resp?.data?.total ?? '<unknown>';
            logLine(`[OK] 模型记录总数 / total = ${total}`);
            return;
        }

        if (full) {
            const { records, total } = await client.listAll({ pageSize: 100 });
            logLine(`[OK] 全量拉取成功 / fetched ${records.length} record(s) (server total=${total})`);
            if (jsonOut) {
                process.stdout.write(JSON.stringify(records, null, 2) + '\n');
            } else {
                summarize(records);
            }
            return;
        }

        const resp = await client.list({ pageSize: limit, pageNumber: 1, getCount: true });
        const records = resp?.data?.records || [];
        const total = resp?.data?.total;
        logLine(`[OK] 拉取成功 / fetched ${records.length} record(s)`);
        if (total !== undefined) logLine(`     模型总数 / total = ${total}`);
        logLine('');

        if (jsonOut) {
            process.stdout.write(JSON.stringify(records, null, 2) + '\n');
            return;
        }
        summarize(records);
    } catch (err) {
        console.error('[FAIL] 拉取失败 / pull failed:');
        console.error('  ' + (err.message || err));
        if (err.bizCode) {
            console.error(`  → 业务错误码 / business code: ${err.bizCode}`);
            if (err.bizCode === 'AUTH_FAILURE' || err.bizCode === 'AUTH_FAILURE_TOKEN_FAILURE')
                console.error('     API Key 无效或未授权 / Invalid or unauthorized API Key');
            if (err.bizCode === 'DATA_SOURCE_OP_AUTH_FAILURE')
                console.error('     需在控制台「用户权限」给该 API Key 对应角色授权读取此模型');
            if (err.bizCode === 'DATASOURCE_NOT_EXIST' || err.bizCode === 'TABLE_NOT_EXIST')
                console.error('     模型不存在 / model does not exist: ' + modelName);
        } else if (err.status === 401) {
            console.error('  → 401：API Key 没有携带 "Bearer " 前缀或已失效');
        }
        process.exit(1);
    }
})();

function summarize(records) {
    if (records.length === 0) {
        console.log('  （模型内无记录 / no records）');
        return;
    }
    // 字段统计 / field summary
    const fieldSet = new Set();
    for (const r of records) for (const k of Object.keys(r)) fieldSet.add(k);
    const keys = Array.from(fieldSet).sort();
    console.log(`字段（共 ${keys.length}）/ fields (${keys.length}):`);
    const sample = records[0];
    for (const k of keys) {
        const v = sample[k];
        let s;
        try { s = JSON.stringify(v); } catch { s = String(v); }
        if (s && s.length > 70) s = s.slice(0, 67) + '...';
        console.log(`  - ${k.padEnd(24)} ${s}`);
    }
    console.log('');
    console.log(`前 ${Math.min(records.length, 2)} 条预览 / preview of first ${Math.min(records.length, 2)}:`);
    for (let i = 0; i < Math.min(records.length, 2); i++) {
        const r = records[i];
        const id = r._id || r.identifier || '<n/a>';
        console.log(`  --- row[${i}] (_id=${id}, identifier=${r.identifier || '<n/a>'}) ---`);
        const truncated = {};
        for (const k of Object.keys(r)) {
            const v = r[k];
            const s = typeof v === 'string' && v.length > 120
                ? v.slice(0, 117) + '...'
                : v;
            truncated[k] = s;
        }
        console.log('  ' + JSON.stringify(truncated, null, 2).replace(/\n/g, '\n  '));
    }
}
