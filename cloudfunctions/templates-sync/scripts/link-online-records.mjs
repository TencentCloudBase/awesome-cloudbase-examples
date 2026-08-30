#!/usr/bin/env node
// link-online-records.mjs
//
// 把线上"裸名/通用名"记录关联到本地目录的 _source 块。
// 用于以下"线上是旧裸名、本地是规范化目录名"的映射场景，避免 push 时重复创建。
//
// 映射表（手动维护，因为线上 identifier 是历史遗留命名）：

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNC_DIR = resolve(__dirname, '..');
const CLOUDFUNCTIONS_DIR = resolve(SYNC_DIR, '..');

const args = { dryRun: process.argv.includes('--dry-run') };

// (本地 dir, lang) → 线上 (onlineIdentifier, onlineId)
const LINK_MAP = [
    {
        dir: 'scf-nodejs-helloworld',  lang: 'zh',
        onlineIdentifier: 'scf-helloworld',
        onlineId: '2ccbb81568a593bc02a413865a834040',
    },
    {
        dir: 'scf-go-helloworld',      lang: 'zh',
        onlineIdentifier: 'scf-golang-helloworld',
        onlineId: '25cb905f6981bd1600b5fde77c03a870',
    },
    {
        dir: 'http-nodejs-helloworld', lang: 'zh',
        onlineIdentifier: 'scfWeb',
        onlineId: 'f51ab3f0689ea66901ed4ca67bd61b6b',
    },
    {
        dir: 'http-nodejs-helloworld', lang: 'en',
        onlineIdentifier: 'scfWeb',
        onlineId: 'f51ab3f0689ea66901ed4cc80c021d00',
    },
    // scf-nodejs-helloworld 的 en 也关联到 scf-helloworld（线上无 en 记录，会 create 新行）
    {
        dir: 'scf-nodejs-helloworld', lang: 'en',
        onlineIdentifier: 'scf-helloworld',
        onlineId: '2ccbb81568a593bc02a413865a834040',
    },
    // scf-go-helloworld 的 en 关联到 scf-golang-helloworld（线上无 en 记录，会 create 新行）
    {
        dir: 'scf-go-helloworld', lang: 'en',
        onlineIdentifier: 'scf-golang-helloworld',
        onlineId: '25cb905f6981bd1600b5fde77c03a870',
    },
];

const FIELD_ORDER = [
    'identifier', 'lang', 'funcTypes',
    'title', 'titleIcon', 'description', 'tags', 'sampleCode',
    'language', 'runtimeVersion', 'isCompile', 'entryPoint',
    'zipFilePath',
    'imagePath', 'containerPort',
    'envParams', 'linkurl', 'guide',
    'targetPlatform',
    'gitUrl', 'gitUrlList',
    'displayPage', 'category', 'scfDemoID',
    '_source',
];
function orderFields(obj) {
    const out = {};
    for (const k of FIELD_ORDER) if (k in obj) out[k] = obj[k];
    const extras = Object.keys(obj).filter((k) => !FIELD_ORDER.includes(k)).sort();
    for (const k of extras) { if (k !== '_source') out[k] = obj[k]; }
    if ('_source' in obj && !('_source' in out)) out._source = obj._source;
    return out;
}

console.log(`link-online-records ${args.dryRun ? '[DRY-RUN]' : '[WRITE]'}\n`);
let written = 0;

for (const m of LINK_MAP) {
    const file = `cloudbase-template${m.lang === 'en' ? '.en' : ''}.json`;
    const p = join(CLOUDFUNCTIONS_DIR, m.dir, file);
    if (!existsSync(p)) {
        console.log(`  [SKIP] ${m.dir}/${file}  (file not found)`);
        continue;
    }
    const obj = JSON.parse(readFileSync(p, 'utf-8'));
    obj._source = obj._source || {};

    const oldOid = obj._source.onlineIdentifier;
    const oldOnlineId = obj._source.onlineId;
    obj._source.onlineIdentifier = m.onlineIdentifier;
    obj._source.onlineId = m.onlineId;
    // 同时清除 localOnly 标记（如果有）
    if (obj._source.localOnly) {
        delete obj._source.localOnly;
        console.log(`  [INFO] ${m.dir}/${file}  cleared _source.localOnly`);
    }

    const ordered = orderFields(obj);
    const before = readFileSync(p, 'utf-8');
    const after = JSON.stringify(ordered, null, 2) + '\n';
    if (before !== after) {
        if (!args.dryRun) writeFileSync(p, after, 'utf-8');
        written++;
        console.log(`  [${args.dryRun ? 'DRY' : 'WROTE'}] ${m.dir}/${file}  onlineIdentifier: ${oldOid || '(none)'} → ${m.onlineIdentifier}  onlineId: ${oldOnlineId || '(none)'} → ${m.onlineId.slice(0,12)}...`);
    } else {
        console.log(`  [NOOP] ${m.dir}/${file}  (already linked)`);
    }
}

console.log(`\n== summary ==\n  written:  ${written}`);
