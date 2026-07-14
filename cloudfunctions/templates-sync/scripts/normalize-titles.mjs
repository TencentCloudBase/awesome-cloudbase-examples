#!/usr/bin/env node
// normalize-titles.mjs
//
// 按以下规则规范化所有 cloudbase-template*.json 的 title：
//
//   1. 中文 title 去掉「模板」「空白模板」后缀，保留语义部分。
//   2. 英文 title 去掉 "Template" 后缀，并把多词标题改为 Title Case。
//   3. 裸名 "Hello World" / "SSE" 加语言前缀（按 identifier 推断）：
//      - http-nodejs-* / scf-nodejs-* → "Node.js"
//      - http-go-* / scf-go-*         → "Go"
//      - http-java-* / scf-java-*     → "Java"
//      - http-python-* / scf-python-* → "Python"
//      - http-php-* / scf-php-*       → "PHP"
//   4. 同时同步 EN_OVERRIDES（split-zh-en.mjs）的内置文案，便于将来重跑保持一致。
//
// 双份文件（zh / en）同步更新。

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

// ---------- 显式映射（覆盖所有 30 个本地模板）----------
//   zh: 去「模板」「空白模板」后缀；保留功能性中文
//   en: 去 "Template"；Title Case；裸 Hello World/SSE 加语言前缀
const TITLE_MAP = {
    'http-go-gin':                            { zh: 'Gin 框架',            en: 'Gin Framework' },
    'http-go-helloworld':                     { zh: 'Go Hello World',      en: 'Go Hello World' },
    'http-java-helloworld':                   { zh: 'Java Hello World',    en: 'Java Hello World' },
    'http-java-springboot':                   { zh: 'Spring Boot 框架',    en: 'Spring Boot Framework' },
    'http-nodejs-express':                    { zh: 'Express 框架',        en: 'Express Framework' },
    'http-nodejs-helloworld':                 { zh: 'Node.js Hello World', en: 'Node.js Hello World' },
    'http-nodejs-koa':                        { zh: 'Koa 框架',            en: 'Koa Framework' },
    'http-nodejs-sse':                        { zh: 'Node.js SSE',         en: 'Node.js SSE' },
    'http-php-helloworld':                    { zh: 'PHP Hello World',     en: 'PHP Hello World' },
    'http-php-laravel':                       { zh: 'Laravel 框架',        en: 'Laravel Framework' },
    'http-php-slim':                          { zh: 'Slim 框架',           en: 'Slim Framework' },
    'http-python-fastapi':                    { zh: 'FastAPI 框架',        en: 'FastAPI Framework' },
    'http-python-flask':                      { zh: 'Flask 框架',          en: 'Flask Framework' },
    'http-python-helloworld':                 { zh: 'Python Hello World',  en: 'Python Hello World' },
    'scf-go-helloworld':                      { zh: 'Go Hello World',      en: 'Go Hello World' },
    'scf-java-helloworld':                    { zh: 'Java 空白',           en: 'Java Blank' },
    'scf-nodejs-book-analytics-aggregate':    { zh: '图书数据分析',        en: 'Book Analytics Aggregate' },
    'scf-nodejs-book-management-model':       { zh: '图书管理',            en: 'Book Management' },
    'scf-nodejs-custom-auth':                 { zh: '自定义登录',          en: 'Custom Login' },
    'scf-nodejs-get-openid':                  { zh: 'OPENID 获取',         en: 'OPENID Get' },
    'scf-nodejs-helloworld':                  { zh: 'Node.js Hello World', en: 'Node.js Hello World' },
    'scf-nodejs-hono-template':               { zh: 'Hono.js 框架',        en: 'Hono.js Framework' },
    'scf-nodejs-openapi-get-phonenumber':     { zh: '云调用解析用户手机号', en: "Cloud Call to Get User's Mobilephone" },
    'scf-nodejs-post-management-collection':  { zh: '文章管理',            en: 'Article Management' },
    'scf-nodejs-transaction':                 { zh: '账户转账',            en: 'Account Transfer' },
    'scf-nodejs-user-management-sql':         { zh: '用户管理 SQL',        en: 'User Management SQL' },
    'scf-nodejs-wxpay-common':                { zh: '微信支付通用',        en: 'WeChat Pay General' },
    'scf-nodejs-wxpay-product':               { zh: '商品下单',            en: 'Product Order' },
    'scf-php-helloworld':                     { zh: 'PHP 空白',            en: 'PHP Blank' },
    'scf-python-helloworld':                  { zh: 'Python 空白',         en: 'Python Blank' },
    'http-nodejs-websocket':                  { zh: 'Node.js WebSocket',   en: 'Node.js WebSocket' },
    'http-python-django':                     { zh: 'Django 框架',         en: 'Django Framework' },
    'http-nodejs-nestjs':                     { zh: 'Nest.js 框架',        en: 'Nest.js Framework' },
};

function listTemplateDirs() {
    return readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name.startsWith('scf-') || d.name.startsWith('http-')))
        .map((d) => d.name).sort();
}

console.log(`normalize-titles ${args.dryRun ? '[DRY-RUN]' : '[WRITE]'}\n`);
let written = 0;

for (const dir of listTemplateDirs()) {
    const map = TITLE_MAP[dir];
    if (!map) { console.log(`  [SKIP] ${dir}  (no mapping)`); continue; }

    for (const lang of ['zh', 'en']) {
        const file = `cloudbase-template${lang === 'en' ? '.en' : ''}.json`;
        const p = join(CLOUDFUNCTIONS_DIR, dir, file);
        if (!existsSync(p)) continue;
        const obj = JSON.parse(readFileSync(p, 'utf-8'));
        const oldTitle = obj.title;
        const newTitle = map[lang];
        obj.title = newTitle;
        const ordered = orderFields(obj);
        const before = readFileSync(p, 'utf-8');
        const after = JSON.stringify(ordered, null, 2) + '\n';
        if (before !== after) {
            if (!args.dryRun) writeFileSync(p, after, 'utf-8');
            written++;
            console.log(`  [${args.dryRun ? 'DRY' : 'WROTE'}] ${dir}/${file}  '${oldTitle}' → '${newTitle}'`);
        }
    }
}

console.log(`\n== summary ==\n  written:  ${written}`);
