#!/usr/bin/env node
// init-new-en-files.mjs
//
// 仅为缺少 en 副本的本地模板生成 cloudbase-template.en.json：
//   - 找到所有有 cloudbase-template.json 但缺 cloudbase-template.en.json 的目录
//   - 复制 zh 文件为 en 模板
//   - 改 lang=en、title/description/sampleCode 从 EN_OVERRIDES 取值
//
// 不会覆盖已存在的 en 文件，幂等。
//
// EN_OVERRIDES 字典与 split-zh-en.mjs 保持同步（这里再次内嵌只 3 个新模板的条目，
// 因为已经存在 en 文件的模板不会进入本脚本处理范围）。

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

// 仅新模板需要英文文案 override
const EN_OVERRIDES = {
    'http-nodejs-websocket': {
        title: 'WebSocket',
        description: 'Real-time bidirectional communication example built with Node.js WebSocket',
        sampleCode: '# WebSocket Example\n\nA Node.js WebSocket server/client demo for CloudBase HTTP function.\n\nDeploy and connect using `wss://<env>.service.tcloudbase.com/http-nodejs-websocket/`.',
    },
    'http-python-django': {
        title: 'Django Template',
        description: 'HTTP example built with Python Django framework',
        sampleCode: '# Deploy a Django app\n\nSource references:\n\n* github: https://github.com/TencentCloudBase/cloudrun-django\n* gitee: https://gitee.com/TencentCloudBase/cloudrun-django',
    },
    'http-nodejs-nestjs': {
        title: 'Nest.js Template',
        description: 'HTTP example built with Node.js Nest.js framework',
        sampleCode: '# Deploy a Nest.js app\n\nSource references:\n\n* github: https://github.com/TencentCloudBase/cloudrun-nestjs\n* gitee: https://gitee.com/TencentCloudBase/cloudrun-nestjs',
    },
};

function listTemplateDirs() {
    return readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name.startsWith('scf-') || d.name.startsWith('http-')))
        .map((d) => d.name).sort();
}

console.log(`init-new-en-files ${args.dryRun ? '[DRY-RUN]' : '[WRITE]'}\n`);
let written = 0, skipped = 0;

for (const dir of listTemplateDirs()) {
    const zhPath = join(CLOUDFUNCTIONS_DIR, dir, 'cloudbase-template.json');
    const enPath = join(CLOUDFUNCTIONS_DIR, dir, 'cloudbase-template.en.json');
    if (!existsSync(zhPath)) continue;
    if (existsSync(enPath)) {
        skipped++;
        continue;
    }
    const zh = JSON.parse(readFileSync(zhPath, 'utf-8'));
    const en = JSON.parse(JSON.stringify(zh));
    en.lang = 'en';
    const ovr = EN_OVERRIDES[dir];
    if (ovr) {
        if (ovr.title) en.title = ovr.title;
        if (ovr.description) en.description = ovr.description;
        if (ovr.sampleCode) en.sampleCode = ovr.sampleCode;
        en._source = { ...(en._source || {}), i18nSource: 'override' };
    } else {
        en._source = { ...(en._source || {}), i18nSource: 'fallback-zh' };
        console.log(`  ⚠️  ${dir}: no EN_OVERRIDES, en title will fall back to zh — consider adding override`);
    }
    delete en._source?.i18n;

    const ordered = orderFields(en);
    if (!args.dryRun) writeFileSync(enPath, JSON.stringify(ordered, null, 2) + '\n', 'utf-8');
    written++;
    console.log(`  [${args.dryRun ? 'DRY' : 'WROTE'}] ${dir}/cloudbase-template.en.json  src=${en._source.i18nSource}  title='${en.title}'`);
}

console.log(`\n== summary ==\n  written:  ${written}  (skipped existing: ${skipped})`);
