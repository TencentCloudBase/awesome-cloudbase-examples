#!/usr/bin/env node
// fix-samplecode-urls.mjs
//
// 将 sampleCode 中的旧仓库 git URL 替换为 awesome-cloudbase-examples 对应路径。
// 旧 URL 模式：https://github.com/TencentCloudBase/cloudrun-{name}
// 新 URL 模式：https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/cloudfunctions/{dir}
// （同时更新 gitee/cnb 对应镜像）

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

// 旧仓库名 → 本地模板目录映射
const OLD_REPO_MAP = {
    'cloudrun-gin':     'http-go-gin',
    'cloudrun-express': 'http-nodejs-express',
    'cloudrun-nestjs':  'http-nodejs-nestjs',
    'cloudrun-django':  'http-python-django',
    'cloudrun-fastapi': 'http-python-fastapi',
    'cloudrun-flask':   'http-python-flask',
};

const OLD_REPO_PATTERN = /https?:\/\/(github\.com|gitee\.com|cnb\.cool)\/TencentCloudBase\/(cloudrun-\w+)/g;

function fixSampleCode(sc, dir) {
    if (!sc) return sc;
    return sc.replace(OLD_REPO_PATTERN, (match, host, oldName) => {
        const localDir = OLD_REPO_MAP[oldName];
        if (!localDir) return match;
        let newPath;
        if (host === 'cnb.cool') {
            newPath = `https://cnb.cool/tencent/cloud/cloudbase/awesome-cloudbase-examples/-/tree/master/cloudfunctions/${localDir}`;
        } else {
            newPath = `https://${host}/TencentCloudBase/awesome-cloudbase-examples/tree/master/cloudfunctions/${localDir}`;
        }
        return newPath;
    });
}

console.log(`fix-samplecode-urls ${args.dryRun ? '[DRY-RUN]' : '[WRITE]'}\n`);
let written = 0;

const dirs = readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (d.name.startsWith('scf-') || d.name.startsWith('http-')))
    .map((d) => d.name).sort();

for (const dir of dirs) {
    for (const lang of ['zh', 'en']) {
        const fname = `cloudbase-template${lang === 'en' ? '.en' : ''}.json`;
        const p = join(CLOUDFUNCTIONS_DIR, dir, fname);
        if (!existsSync(p)) continue;
        const json = JSON.parse(readFileSync(p, 'utf-8'));
        const old = json.sampleCode || '';
        const neo = fixSampleCode(old, dir);
        if (old !== neo) {
            json.sampleCode = neo;
            const ordered = orderFields(json);
            const after = JSON.stringify(ordered, null, 2) + '\n';
            if (!args.dryRun) writeFileSync(p, after, 'utf-8');
            written++;
            // 显示变更摘要
            const changes = [...old.matchAll(OLD_REPO_PATTERN)].map(m => m[2]).join(', ');
            console.log(`  [${args.dryRun ? 'DRY' : 'WROTE'}] ${dir}/${fname}  fixed: ${changes}`);
        }
    }
}

console.log(`\n== summary ==\n  written:  ${written}`);
