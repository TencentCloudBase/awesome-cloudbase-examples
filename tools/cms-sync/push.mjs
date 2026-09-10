#!/usr/bin/env node
// push.mjs  — 通用模板推送工具（cloudfunctions + cloudbaserun）
//
// 1. 读取模板目录下的 cloudbase-template[.<lang>].json
// 2. （仅 cloudfunctions）调用 packer 打包 zip + 上传存储
// 3. （cloudbaserun）跳过打包，容器镜像由 Dockerfile 构建
// 4. upsert 到 CloudBase 数据模型 CMS
//
// Usage:
//   node tools/cms-sync/push.mjs --dir cloudfunctions          # 推 cloudfunctions
//   node tools/cms-sync/push.mjs --dir cloudbaserun           # 推 cloudbaserun
//   node tools/cms-sync/push.mjs --dir cloudfunctions --upload # 打包+上传+推送
//   node tools/cms-sync/push.mjs --dir cloudfunctions --dry-run
//   node tools/cms-sync/push.mjs --dir cloudfunctions --only scf-nodejs-helloworld
//   node tools/cms-sync/push.mjs --dir cloudfunctions --test  # 体验数据

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

import { CloudBaseDataModel, loadDotenv } from './lib/cloudbase.mjs';
import { pack, detectPackType, PACK_TYPE } from './lib/packer.mjs';
import { uploadFile, getStorageEnv } from './lib/storage.mjs';

// ---------- args ----------
const ARGS = process.argv.slice(2);
function argVal(name) { const i = ARGS.indexOf(name); return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : null; }
const opts = {
    dir:       argVal('--dir') || 'cloudfunctions',
    only:      argVal('--only'),
    dryRun:    ARGS.includes('--dry-run'),
    upload:    ARGS.includes('--upload'),
    test:      ARGS.includes('--test'),
    keepTags:  ARGS.includes('--keep-online-tags'),
};

const TEMPLATES_DIR = join(PROJECT_ROOT, opts.dir);
const isCloudRun = opts.dir === 'cloudbaserun';

// 目录前缀匹配
const DIR_PREFIX = isCloudRun ? () => true : (name) => name.startsWith('scf-') || name.startsWith('http-');

// ---------- 字段顺序 ----------
const FIELD_ORDER = [
    'identifier', 'lang', 'funcTypes', 'title', 'titleIcon', 'description', 'tags', 'sampleCode',
    'language', 'runtimeVersion', 'isCompile', 'entryPoint',
    'zipFilePath', 'zipFileStore', 'imagePath', 'containerPort',
    'envParams', 'linkurl', 'guide', 'targetPlatform', 'gitUrl', 'gitUrlList',
    'displayPage', 'category', 'scfDemoID', '_source',
];
function orderFields(obj) {
    const out = {};
    for (const k of FIELD_ORDER) if (k in obj) out[k] = obj[k];
    for (const k of Object.keys(obj).sort()) { if (!FIELD_ORDER.includes(k) && k !== '_source') out[k] = obj[k]; }
    if ('_source' in obj && !('_source' in out)) out._source = obj._source;
    return out;
}

// ---------- 构建 upsert 数据 ----------
function buildUpsertData(json, { keepTags }) {
    const data = { identifier: json.identifier, lang: json.lang };
    for (const [k, v] of Object.entries(json)) {
        if (k === '_source' || k === '_id' || k === 'identifier' || k === 'lang') continue;
        data[k] = v;
    }
    if (keepTags && 'tags' in data) delete data.tags;
    return data;
}

// ---------- 获取模板目录列表 ----------
function listTemplateDirs() {
    if (!existsSync(TEMPLATES_DIR)) { console.error(`ERROR: dir not found: ${TEMPLATES_DIR}`); process.exit(1); }
    return readdirSync(TEMPLATES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && DIR_PREFIX(d.name) && !['scripts','templates-sync','node_modules','deploy-code-server','spring-cloud-docker-demo'].includes(d.name))
        .map(d => d.name).sort();
}

// ---------- 主流程 ----------
async function main() {
    loadDotenv();
    const sy = getStorageEnv();
    const envId = sy.envId;
    const apiKey = sy.apiKey;
    const modelName = process.env.TEMPLATE_MODEL_ID || 'tcb_template_list';
    const envType = opts.test ? 'preview' : 'prod';

    if (!envId || !apiKey) { console.error('ERROR: TEMPLATE_ENV_ID / CLOUDBASE_APIKEY not set'); process.exit(1); }
    const dm = new CloudBaseDataModel({ envId, modelName, apiKey, envType, timeoutMs: 60000 });

    const dirs = listTemplateDirs();
    const onlyFilter = opts.only ? opts.only.split(',').map(s => s.trim()) : null;
    const targetDirs = onlyFilter ? dirs.filter(d => onlyFilter.includes(d)) : dirs;

    console.log(`push.mjs [${opts.dir}] ${opts.dryRun ? '[DRY-RUN]' : '[WRITE]'}${opts.test ? ' [预览]' : ' [正式]'}`);
    console.log(`  envId=${envId}  model=${modelName}  envType=${envType}  dirs=${targetDirs.length}/${dirs.length}${onlyFilter ? ' (filtered)' : ''}`);
    if (!opts.upload && !isCloudRun) console.log('  (仅元数据，加 --upload 打包+上传)');
    if (isCloudRun) console.log('  (cloudbaserun 仅元数据，容器通过 Dockerfile 构建)');
    console.log('');

    const summary = { ok: 0, skip: 0, fail: 0 };

    for (const dir of targetDirs) {
        const zhPath = join(TEMPLATES_DIR, dir, 'cloudbase-template.json');
        if (!existsSync(zhPath)) { console.log(`  [SKIP] ${dir}: no cloudbase-template.json`); summary.skip++; continue; }

        // ---- 打包 + 上传（仅 cloudfunctions 非容器模板）----
        let zipPath = null, sha256 = null;
        if (opts.upload && !isCloudRun) {
            const packType = detectPackType(TEMPLATES_DIR, dir);
            if (packType !== PACK_TYPE.SKIP_CONTAINER) {
                try {
                    const result = pack(TEMPLATES_DIR, dir);
                    zipPath = result.zipPath; sha256 = result.sha256;
                    if (zipPath) {
                        console.log(`  [pack] ${dir}: sha256=${sha256.slice(0, 16)}...`);
                        const uploadR = uploadFile({ zipPath, remoteName: `template/${dir}.zip`, envId, apiKey });
                        const zipUrl = (uploadR && (uploadR.downloadUrl || uploadR.url)) || '';
                        if (zipUrl) console.log(`  [upload] ${dir}: ${zipUrl.slice(0, 80)}...`);
                    }
                } catch (err) { console.error(`  [FAIL] ${dir}: pack/upload error: ${err.message}`); summary.fail++; continue; }
            }
        }

        // ---- upsert zh + en ----
        for (const lang of ['zh', 'en']) {
            const file = lang === 'en' ? 'cloudbase-template.en.json' : 'cloudbase-template.json';
            const jsonPath = join(TEMPLATES_DIR, dir, file);
            if (!existsSync(jsonPath)) continue;
            const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
            const src = json._source || {};

            // 更新本地字段
            if (src.zipFilePath) json.zipFilePath = src.zipFilePath;
            json.zipFileStore = '';

            const upsertData = buildUpsertData(json, { keepTags: opts.keepTags });
            if (opts.dryRun) { console.log(`  [DRY] ${dir}/${file} (${json.identifier}, ${json.lang})`); continue; }

            try {
                const filter = { where: { identifier: { $eq: json.identifier }, lang: { $eq: json.lang } } };
                await dm.upsert(filter, upsertData, upsertData);
                console.log(`  [OK ] ${dir}/${file} (${json.identifier}, ${json.lang})`);
                summary.ok++;
            } catch (err) {
                if (err.message?.includes('INVALID_PARAMETER_KEY')) {
                    await dm.updateMany(filter, upsertData);
                    console.log(`  [OK ] ${dir}/${file} updateMany (${json.identifier}, ${json.lang})  ⚠️ multiple records`);
                    summary.ok++;
                } else {
                    console.error(`  [FAIL] ${dir}/${file}: ${err.message.slice(0, 150)}`);
                    summary.fail++;
                }
            }
        }
    }

    console.log(`\n== summary ==\n  ok: ${summary.ok}  skip: ${summary.skip}  fail: ${summary.fail}`);
    if (summary.fail > 0) process.exit(1);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
