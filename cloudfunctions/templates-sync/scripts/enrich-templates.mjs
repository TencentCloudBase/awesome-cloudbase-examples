#!/usr/bin/env node
// enrich-templates.mjs (B 方案：双份文件 zh + en，不合并不删除)
//
// 对所有 cloudfunctions/<dir>/cloudbase-template*.json 做字段增强，统一以下字段：
//
//   1. targetPlatform: 强制 ["default","intl"]（双语模板都同时上国内站 + 国际站）
//   2. gitUrlList:     3 路镜像（github/gitee/cnb），路径指向 cloudfunctions/<dir>
//   3. gitUrl:         = gitUrlList[0].gitPlatform.gitUrl (github)
//
// 不改的字段：lang / title / description / sampleCode / tags / runtime / 等
//
// 与本期"双份文件"策略（B 方案）一致：每个模板保留 zh 主文件 + en 副本，
// 用户面文案双份独立维护（由 split-zh-en.mjs / normalize-titles.mjs 管理），
// 本脚本只统一"应该完全一致"的非语言字段。
//
// Usage:
//   node scripts/enrich-templates.mjs            # 实际执行
//   node scripts/enrich-templates.mjs --dry-run

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNC_DIR = resolve(__dirname, '..');
const CLOUDFUNCTIONS_DIR = resolve(SYNC_DIR, '..');

const args = { dryRun: process.argv.includes('--dry-run') };

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

function buildGitUrlList(dir) {
    const path = `cloudfunctions/${dir}`;
    return [
        { gitPlatform: { gitType: 'github', gitUrl: `https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/${path}` } },
        { gitPlatform: { gitType: 'gitee',  gitUrl: `https://gitee.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/${path}` } },
        { gitPlatform: { gitType: 'cnb',    gitUrl: `https://cnb.cool/tencent/cloud/cloudbase/awesome-cloudbase-examples/-/tree/master/${path}` } },
    ];
}

function listTemplateDirs() {
    return readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name.startsWith('scf-') || d.name.startsWith('http-')))
        .map((d) => d.name).sort();
}

console.log(`enrich-templates [B方案 双份] ${args.dryRun ? '[DRY-RUN]' : '[WRITE]'}\n`);
let written = 0;

for (const dir of listTemplateDirs()) {
    const newGitUrlList = buildGitUrlList(dir);
    const newGitUrl = newGitUrlList[0].gitPlatform.gitUrl;
    const newTargetPlatform = ['default', 'intl'];

    for (const lang of ['zh', 'en']) {
        const file = `cloudbase-template${lang === 'en' ? '.en' : ''}.json`;
        const p = join(CLOUDFUNCTIONS_DIR, dir, file);
        if (!existsSync(p)) continue;

        const obj = JSON.parse(readFileSync(p, 'utf-8'));
        obj.targetPlatform = newTargetPlatform;
        obj.gitUrl = newGitUrl;
        obj.gitUrlList = newGitUrlList;

        const ordered = orderFields(obj);
        const before = readFileSync(p, 'utf-8');
        const after = JSON.stringify(ordered, null, 2) + '\n';
        if (before !== after) {
            if (!args.dryRun) writeFileSync(p, after, 'utf-8');
            written++;
            console.log(`  [${args.dryRun ? 'DRY' : 'WROTE'}] ${dir}/${file}`);
        }
    }
}

console.log(`\n== summary ==\n  written:  ${written}`);
