#!/usr/bin/env node
// push.mjs
//
// 本地 JSON → 打包 → 上传 → upsert 到线上数据模型。
//
// 流程：
//   1. 读取模板目录下的 cloudbase-template[.<lang>].json
//   2. 调用 packer.mjs 打包源码为 zip + 计算 sha256
//   3. 调用 storage.mjs 上传 zip 到 CloudBase 存储，取回公网 URL
//   4. 把 zipFilePath / zipSha 回写到本地 _source
//   5. 用 upsert 把业务字段同步到线上（按 (onlineIdentifier, lang) 定位）
//
// Usage:
//   node scripts/push.mjs                           # 全量推送（仅元数据，不上传 zip）
//   node scripts/push.mjs --only scf-nodejs-helloworld   # 单条
//   node scripts/push.mjs --dry-run                        # 只打印不写
//   node scripts/push.mjs --upload                         # 同时打包 zip + 上传存储（需 tcb 登录）
//   node scripts/push.mjs --keep-online-tags               # 不写 tags 字段
//   node scripts/push.mjs --test                           # 推到测试/体验数据模型（不碰正式数据）

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNC_DIR = resolve(__dirname, '..');
const CLOUDFUNCTIONS_DIR = resolve(SYNC_DIR, '..');

import { CloudBaseDataModel, loadDotenv, mask, F } from './lib/cloudbase.mjs';
import { pack, detectPackType, PACK_TYPE } from './lib/packer.mjs';
import { uploadFile, getStorageEnv } from './lib/storage.mjs';

// ---------- args ----------
const ARGS = process.argv.slice(2);
const opts = {
    only:      _argVal('--only'),
    dryRun:    ARGS.includes('--dry-run'),
    upload:    ARGS.includes('--upload'),
    test:      ARGS.includes('--test'),
    keepTags:  ARGS.includes('--keep-online-tags'),
    applyTags: ARGS.includes('--apply-tags'),
    verbose:   ARGS.includes('--verbose'),
};
if (opts.keepTags && opts.applyTags) {
    console.error('ERROR: --keep-online-tags and --apply-tags are mutually exclusive');
    process.exit(1);
}

function _argVal(name) {
    const idx = ARGS.indexOf(name);
    if (idx >= 0 && idx + 1 < ARGS.length) return ARGS[idx + 1];
    return null;
}

// ---------- 字段顺序 ----------
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

// ---------- 主流程 ----------
async function main() {
    loadDotenv();
    const sy = getStorageEnv();

    const envId      = sy.envId;
    const apiKey     = sy.apiKey;
    const modelName  = process.env.TEMPLATE_MODEL_ID || 'tcb_template_list';
    // CloudBase 数据模型自带双环境：prod=正式数据，preview=体验数据
    const envType    = opts.test ? 'preview' : 'prod';

    if (!envId)  { console.error('ERROR: TEMPLATE_ENV_ID not set in .env'); process.exit(1); }
    if (!apiKey) { console.error('ERROR: CLOUDBASE_APIKEY not set in .env'); process.exit(1); }
    if (!modelName) { console.error('ERROR: TEMPLATE_MODEL_ID not set in .env'); process.exit(1); }

    // 数据模型客户端（envType 区分正式/体验数据）
    const dm = new CloudBaseDataModel({ envId, modelName, apiKey, timeoutMs: 60000, envType });

    // 收集模板
    const dirs = readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name.startsWith('scf-') || d.name.startsWith('http-')))
        .map((d) => d.name)
        .sort();

    const onlyFilter = opts.only ? opts.only.split(',').map((s) => s.trim()) : null;
    const targetDirs = onlyFilter ? dirs.filter((d) => onlyFilter.includes(d)) : dirs;

    if (targetDirs.length === 0) {
        console.log('No templates to push.');
        return;
    }

    const summary = { ok: 0, skip: 0, warn: 0, fail: 0 };
    console.log(`push.mjs ${opts.dryRun ? '[DRY-RUN]' : '[WRITE]'}${opts.test ? ' [体验数据/Preview]' : ' [正式数据/Prod]'}`);
    console.log(`  envId=${envId}  model=${modelName}  envType=${envType}  dirs=${targetDirs.length}/${dirs.length}${onlyFilter ? ' (filtered)' : ''}`);
    if (opts.keepTags) console.log('  --keep-online-tags: tags 字段不会被写入线上');
    if (opts.applyTags) console.log('  --apply-tags: tags 字段会写入线上');
    if (!opts.upload) console.log('  (仅元数据，不打包上传；加 --upload 启用打包+上传)');
    console.log('');

    for (const dir of targetDirs) {
        // 检查 zh 主文件
        const zhPath = join(CLOUDFUNCTIONS_DIR, dir, 'cloudbase-template.json');
        if (!existsSync(zhPath)) {
            console.log(`  [SKIP] ${dir}: no cloudbase-template.json`);
            summary.skip++;
            continue;
        }

        // ---- 1. 打包 ----
        let zipPath = null, sha256 = null;
        let packType = PACK_TYPE.SKIP_CONTAINER;
        if (opts.upload) {
            packType = detectPackType(dir);
            if (packType === PACK_TYPE.SKIP_CONTAINER) {
                console.log(`  [SKIP] ${dir}: tcbrContainer only (container image, no zip needed)`);
            }
        }

        if (opts.upload && packType !== PACK_TYPE.SKIP_CONTAINER) {
            try {
                const result = pack(dir);
                zipPath = result.zipPath;
                sha256 = result.sha256;
                if (zipPath) console.log(`  [pack] ${dir}: sha256=${sha256.slice(0, 16)}...`);
                else {
                    console.log(`  [SKIP] ${dir}: no deploy files to pack`);
                    packType = PACK_TYPE.SKIP_CONTAINER;
                }
            } catch (err) {
                console.error(`  [FAIL] ${dir}: pack error: ${err.message}`);
                summary.fail++;
                continue;
            }
        }

        // ---- 2. 上传 ----
        let zipUrl = '';
        if (opts.upload && zipPath) {
            try {
                const result = await uploadFile({
                    zipPath,
                    remoteName: `template/${dir}.zip`,
                    envId,       // TEMPLATE_ENV_ID (lowcode-5g5llxbq5bc9299e)
                    apiKey,
                });
                zipUrl = (result && (result.downloadUrl || result.url)) || '';
                if (zipUrl) console.log(`  [upload] ${dir}: ${zipUrl.slice(0, 80)}...`);
                else console.log(`  [upload] ${dir}: uploaded but could not get download URL`);
            } catch (err) {
                console.error(`  [FAIL] ${dir}: upload error: ${err.message}`);
                summary.fail++;
                continue;
            }
        }

        // ---- 3. 处理 zh + en 双份 upsert ----
        for (const lang of ['zh', 'en']) {
            const file = `cloudbase-template${lang === 'en' ? '.en' : ''}.json`;
            const jsonPath = join(CLOUDFUNCTIONS_DIR, dir, file);
            if (!existsSync(jsonPath)) continue;

            const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
            const src = json._source || {};
            const onlineId = src.onlineIdentifier || dir;
            const onlineLang = json.lang || lang;

            // 更新本地 _source 字段
            if (zipUrl)  json._source = json._source || {};
            if (zipUrl)  json._source.zipFilePath = zipUrl;
            if (sha256)  json._source.zipSha = sha256;
            if (!json._source.uploadedAt) json._source.uploadedAt = Date.now();
            if (!json._source.dir) json._source.dir = '.';

            // 将 zipFilePath 从 _source 提升到业务字段（用于写入 CMS）
            if (json._source?.zipFilePath) json.zipFilePath = json._source.zipFilePath;
            // 清除 zipFileStore（旧协议优先级高于 zipFilePath，会覆盖新包）
            json.zipFileStore = '';

            // 整理业务字段 → upsert 数据
            const keepTags = opts.keepTags === true;
            const upsertData = _buildUpsertData(json, { keepTags });

            if (opts.dryRun) {
                console.log(`  [DRY] ${dir}/${file}  upsert (${onlineId}, ${onlineLang})`);
                continue;
            }

            // 4. upsert（若 filter 匹配多条记录，fallback 到 updateMany）
            const filter = { where: { identifier: { $eq: onlineId }, lang: { $eq: onlineLang } } };
            let success = false;
            try {
                await dm.upsert(filter, upsertData, upsertData);
                console.log(`  [OK ] ${dir}/${file}  upsert (${onlineId}→${json.identifier}, ${onlineLang})`);
                success = true;
            } catch (err) {
                if (err.message && err.message.includes('INVALID_PARAMETER_KEY')) {
                    // filter 匹配了多条记录（线上有脏数据/重复记录）
                    await dm.updateMany(filter, upsertData);
                    console.log(`  [OK ] ${dir}/${file}  updateMany (${onlineId}→${json.identifier}, ${onlineLang})  (multiple records matched)`);
                    success = true;
                } else if (err.message && (err.message.includes('E11000') || err.message.includes('duplicate'))) {
                    console.log(`  [OK ] ${dir}/${file}  upsert (already exists, no change)  (${onlineId}, ${onlineLang})`);
                } else {
                    console.error(`  [FAIL] ${dir}/${file}  upsert error: ${err.message}`);
                    summary.fail++;
                    continue;
                }
            }

            // 5. 推成功后，更新 _source.onlineIdentifier 为本地目录名
            //    （避免下次 push 时 filter 仍用线上旧 identifier 导致重复创建）
            const oldOnlineId = src.onlineIdentifier;
            if (success && !opts.dryRun && oldOnlineId !== dir) {
                json._source = json._source || {};
                json._source.onlineIdentifier = dir;
            }

            // 6. 回写本地 JSON（更新 _source.zipFilePath / _source.zipSha）
            if (!opts.dryRun && success) {
                const ordered = orderFields(json);
                writeFileSync(jsonPath, JSON.stringify(ordered, null, 2) + '\n', 'utf-8');
            }

            if (success) summary.ok++;
        }
    }

    console.log(`\n== summary ==`);
    console.log(`  ok: ${summary.ok}  skip: ${summary.skip}  fail: ${summary.fail}`);
    if (summary.fail > 0) process.exit(1);
}

// ---------- 构建 upsert 数据 ----------
function _buildUpsertData(json, { keepTags }) {
    // 统一用本地目录名作为 identifier，规范线上命名
    // （如 gin → http-go-gin、scf-helloworld → scf-nodejs-helloworld）
    const data = { identifier: json.identifier, lang: json.lang };
    for (const [k, v] of Object.entries(json)) {
        if (k === '_source' || k === '_id' || k === 'identifier' || k === 'lang') continue;
        data[k] = v;
    }
    if (keepTags && 'tags' in data) delete data.tags;
    return data;
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
