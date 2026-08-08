#!/usr/bin/env node
// pull-save.mjs
//
// 把 cloudfunctions/templates-sync/.cache/sample-all.json 中的线上模板数据，
// 按本地目录为权威 identifier，落地为：
//   cloudfunctions/<dir>/cloudbase-template.json           (lang=zh / 缺省 / zh-en)
//   cloudfunctions/<dir>/cloudbase-template.en.json        (lang=en)
//   cloudfunctions/<dir>/cloudbase-template.<lang>.json    (其它 lang)
//
// 当线上没有对应记录时，从目录名 + package.json 推断字段（基础占位）。
// 所有派生 tags 都过 §7.6 规范化与校验。
//
// 用法 / Usage:
//   node pull-save.mjs [--from-cache | --from-online] [--overwrite] [--dry-run]
//
//   --from-cache    用 .cache/sample-all.json 作为线上数据源（默认；离线可跑）
//   --from-online   实时从线上 API 拉
//   --overwrite     覆盖已有的 <dir>.json（默认 false：跳过已存在的）
//   --dry-run       不写文件，仅打印 plan

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotenv, mask, CloudBaseDataModel } from './lib/cloudbase.mjs';
import { canonicalLanguage, isInScope, onlineIdToDirName } from './lib/normalize.mjs';
import { deriveTags, validateTags } from './lib/tags.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '..');                  // cloudfunctions/templates
const CLOUDFUNCTIONS_DIR = resolve(TEMPLATES_DIR, '..');         // cloudfunctions
const CACHE_FILE = resolve(TEMPLATES_DIR, '.cache/sample-all.json');

// CMS 系统字段 + 历史字段（pull 时丢弃，push 时不传）
const DROP_FIELDS = new Set([
    '_id', '_openid', '_mainDep', 'owner',
    'createBy', 'updateBy', 'createdAt', 'updatedAt',
    'order', 'isHide', 'entryPoint',
]);

// 不进入数据模型的字段（不属于 §7.1 + §7.5 任何一类的，丢弃）
// 注意 zipFile（base64）也丢
const ALSO_DROP_FIELDS = new Set(['zipFile', 'zipFileStore']);

const args = parseArgs(process.argv.slice(2));

main().catch((err) => {
    console.error('\n[FATAL]', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});

async function main() {
    loadDotenv();

    // ---- 步骤 1：读线上数据 ----
    const online = await loadOnlineRecords();
    const inScope = online.filter((r) => isInScope(r.funcTypes));
    log(`[1/4] 线上数据 = ${online.length} 条，in-scope (scfFunc/scfWeb) = ${inScope.length} 条`);

    // ---- 步骤 2：建立本地目录索引 ----
    const localDirs = listFunctionDirs();
    const dirIndex = new Set(localDirs);
    log(`[2/4] 本地函数目录 = ${localDirs.length} 个`);

    // ---- 步骤 3：按 (本地目录, lang) 聚合 ----
    const buckets = new Map();   // key=`${dirName}|${lang}` → record(s)
    const orphansOnline = [];    // 线上 identifier 找不到本地目录
    const seenDirsFromOnline = new Set();

    for (const rec of inScope) {
        const dirName = onlineIdToDirName(rec.identifier, rec.funcTypes, rec.language, dirIndex);
        if (!dirIndex.has(dirName)) {
            orphansOnline.push({
                onlineId: rec.identifier,
                lang: rec.lang,
                funcTypes: rec.funcTypes,
                guessedDir: dirName,
            });
            continue;
        }
        seenDirsFromOnline.add(dirName);
        const lang = rec.lang || 'zh';
        const key = `${dirName}|${lang}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(rec);
    }

    // 本地目录中线上完全没有的（孤儿目录），单独占位生成 zh 版本
    const orphansLocal = localDirs.filter((d) => !seenDirsFromOnline.has(d));

    log(`[3/4] 桶 = ${buckets.size}（本地目录×lang 组合）；线上孤儿 = ${orphansOnline.length}；本地孤儿 = ${orphansLocal.length}`);

    if (orphansOnline.length) {
        log('\n  线上 identifier 在本地无对应目录（本期暂不生成本地 JSON，可后续补建目录或维护映射表）：');
        for (const o of orphansOnline) {
            log(`    ${o.onlineId.padEnd(34)} lang=${o.lang.padEnd(3)} ft=[${o.funcTypes.join(',')}] guessed→${o.guessedDir}`);
        }
    }

    // ---- 步骤 4：生成 JSON ----
    log(`\n[4/4] 生成 JSON：`);
    const lintErrors = [];

    // 4a. 有线上数据的：以线上数据为基础
    for (const [key, recs] of buckets) {
        const [dirName, lang] = key.split('|');
        // 一个桶通常只有 1 条；超过 1 条则取最新更新（updatedAt 最大）
        const rec = recs.length === 1 ? recs[0]
            : [...recs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];

        const json = buildJsonFromOnline(rec, dirName);
        const { errors, warnings } = validateTags(json.tags, json);
        if (errors.length) lintErrors.push({ dir: dirName, lang, errors });
        if (warnings.length) {
            for (const w of warnings) log(`    [WARN] ${dirName}.${lang}: ${w}`);
        }

        const fileBase = lang === 'zh' ? 'cloudbase-template.json' : `cloudbase-template.${lang}.json`;
        const filePath = join(CLOUDFUNCTIONS_DIR, dirName, fileBase);
        const relPath = `${dirName}/${fileBase}`;
        if (!existsSync(join(CLOUDFUNCTIONS_DIR, dirName))) {
            log(`    [MISS] ${relPath}  (target dir does not exist, skip)`);
            continue;
        }
        const skip = existsSync(filePath) && !args.overwrite;
        if (!skip) {
            if (!args.dryRun) writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
            log(`    ${args.dryRun ? '[DRY]' : '[OK ]'} ${relPath}  tags=${JSON.stringify(json.tags)}`);
        } else {
            log(`    [SKIP] ${relPath}  (already exists; use --overwrite to replace)`);
        }
    }

    // 4b. 本地孤儿目录：从目录名 + package.json 推断
    for (const dirName of orphansLocal) {
        const json = buildJsonFromLocalDir(dirName);
        const { errors, warnings } = validateTags(json.tags, json);
        if (errors.length) lintErrors.push({ dir: dirName, lang: 'zh', errors });
        if (warnings.length) {
            for (const w of warnings) log(`    [WARN] ${dirName}.zh (local-only): ${w}`);
        }

        const fileBase = 'cloudbase-template.json';
        const filePath = join(CLOUDFUNCTIONS_DIR, dirName, fileBase);
        const relPath = `${dirName}/${fileBase}`;
        const skip = existsSync(filePath) && !args.overwrite;
        if (!skip) {
            if (!args.dryRun) writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
            log(`    ${args.dryRun ? '[DRY]' : '[OK ]'} ${relPath}  (local-only)  tags=${JSON.stringify(json.tags)}`);
        } else {
            log(`    [SKIP] ${relPath}  (already exists; use --overwrite to replace)`);
        }
    }

    // ---- 校验报告 ----
    if (lintErrors.length) {
        log(`\n[LINT] ${lintErrors.length} 条有 ERROR 级 tag 校验问题：`);
        for (const e of lintErrors) {
            log(`  ${e.dir}.${e.lang}:`);
            for (const m of e.errors) log(`    - ${m}`);
        }
        log('\n⚠️  上述 ERROR 不会阻塞 pull-save（已写入文件），但会阻塞后续 push。');
    } else {
        log(`\n[LINT] 所有生成的 JSON 都通过了 §7.6 tag ERROR 级校验 ✅`);
    }
}

// ============================================================================
// 数据获取 / Data source
// ============================================================================

async function loadOnlineRecords() {
    if (args.fromOnline) {
        const envId = process.env.TEMPLATE_ENV_ID;
        const modelName = process.env.TEMPLATE_MODEL_ID || 'tcb_template_list';
        const apiKey = process.env.CLOUDBASE_APIKEY;
        log(`从线上 API 拉取 / Fetching live...`);
        log(`  envId=${envId}  model=${modelName}  apiKey=${mask(apiKey)}`);
        const client = new CloudBaseDataModel({ envId, modelName, apiKey });
        const { records, total } = await client.listAll({ pageSize: 100 });
        log(`  → ${records.length} 条（server total=${total}）`);
        // 顺便缓存
        if (!args.dryRun) {
            mkdirSync(dirname(CACHE_FILE), { recursive: true });
            writeFileSync(CACHE_FILE, JSON.stringify(records, null, 2) + '\n', 'utf-8');
            log(`  cached → ${CACHE_FILE}`);
        }
        return records;
    }

    // 默认：读 cache 文件
    if (!existsSync(CACHE_FILE)) {
        throw new Error(
            `Cache file not found: ${CACHE_FILE}\n` +
            `Run \`node scripts/pull.mjs --full --json > .cache/sample-all.json\` first, or use --from-online.`
        );
    }
    log(`从缓存读取 / Loading cache: ${CACHE_FILE}`);
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
}

// ============================================================================
// 本地目录扫描 / Local function-template directory scan
// ============================================================================

function listFunctionDirs() {
    const entries = readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true });
    return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((name) => {
            if (name.startsWith('.')) return false;
            if (['scripts', 'templates', 'templates-sync', 'node_modules'].includes(name)) return false;
            // 必须以 scf-/http- 前缀（其它目录非函数模板）
            return /^(scf|http)-/.test(name);
        })
        .sort();
}

// ============================================================================
// JSON 构建 / JSON builders
// ============================================================================

function buildJsonFromOnline(rec, dirName) {
    // 1. 拷贝业务字段，丢系统字段 / Drop system fields, keep business fields
    const cleaned = {};
    for (const [k, v] of Object.entries(rec)) {
        if (DROP_FIELDS.has(k)) continue;
        if (ALSO_DROP_FIELDS.has(k)) continue;
        cleaned[k] = v;
    }

    // 2. 强制本地 identifier = 目录名
    cleaned.identifier = dirName;

    // 3. 派生 tags（输入用 _identifier=本地目录名以获得更好的派生效果）
    const legacyTags = Array.isArray(rec.tags) ? [...rec.tags] : [];
    const newTags = deriveTags({
        ...rec,
        _identifier: dirName,
    });
    cleaned.tags = newTags;

    // 4. 写 _source 块（不会被 push 到线上）
    cleaned._source = {
        dir: '.',
        zipFilePath: rec.zipFilePath || '',
        zipSha: '',
        uploadedAt: 0,
        legacyTags,
        onlineIdentifier: rec.identifier !== dirName ? rec.identifier : undefined,
        onlineId: rec._id || undefined,
    };
    if (cleaned._source.onlineIdentifier === undefined) delete cleaned._source.onlineIdentifier;
    if (cleaned._source.onlineId === undefined) delete cleaned._source.onlineId;

    return orderFields(cleaned);
}

function buildJsonFromLocalDir(dirName) {
    // 推断 funcTypes
    const isHttp = dirName.startsWith('http-');
    const funcTypes = isHttp ? ['scfWeb'] : ['scfFunc'];

    // 推断 language
    const langMatch = dirName.match(/^(?:scf|http)-(nodejs|python|go|golang|java|php)-/);
    const langKey = langMatch ? langMatch[1] : 'nodejs';
    const langMap = {
        nodejs: { language: 'Nodejs', runtimeVersion: 'Nodejs18.15', isCompile: false },
        python: { language: 'Python', runtimeVersion: 'Python3.10', isCompile: false },
        go:     { language: 'Go',     runtimeVersion: 'Go1',         isCompile: true  },
        golang: { language: 'Go',     runtimeVersion: 'Go1',         isCompile: true  },
        java:   { language: 'Java',   runtimeVersion: 'Java11',      isCompile: true  },
        php:    { language: 'Php',    runtimeVersion: 'Php7.4',      isCompile: false },
    };
    const langDefaults = langMap[langKey] || langMap.nodejs;

    // 推断 title
    const tail = dirName.replace(/^(?:scf|http)-(?:nodejs|python|go|golang|java|php)-/, '');
    const title = humanizeTitle(tail);

    const rec = {
        identifier: dirName,
        lang: 'zh',
        funcTypes,
        title,
        titleIcon: '',
        language: langDefaults.language,
        runtimeVersion: langDefaults.runtimeVersion,
        isCompile: langDefaults.isCompile,
        description: title,
        tags: [],
        sampleCode: '',
        envParams: [],
        linkurl: '',
        targetPlatform: ['default'],
        gitUrlList: [],
        guide: '',
    };

    const tags = deriveTags({ ...rec, _identifier: dirName });
    rec.tags = tags;

    rec._source = {
        dir: '.',
        zipFilePath: '',
        zipSha: '',
        uploadedAt: 0,
        legacyTags: [],
        localOnly: true,
    };

    return orderFields(rec);
}

// 字段顺序：主键 → §7 权威业务字段 → §7.5 可选透传字段 → _source（本地管理）
const FIELD_ORDER = [
    // 主键
    'identifier', 'lang', 'funcTypes',
    // 展示
    'title', 'titleIcon', 'description', 'tags', 'sampleCode',
    // 运行时
    'language', 'runtimeVersion', 'isCompile', 'entryPoint',
    // 文件
    'zipFilePath',
    // 部署（容器/HTTP）
    'imagePath', 'containerPort',
    // 配置
    'envParams', 'linkurl', 'guide',
    // 上下架
    'targetPlatform',
    // 仓库
    'gitUrl', 'gitUrlList',
    // §7.5 可选透传字段
    'displayPage', 'category', 'scfDemoID',
    // 本地管理（永远最后）
    '_source',
];

function orderFields(obj) {
    const out = {};
    // 1) 先按 FIELD_ORDER 列出
    for (const k of FIELD_ORDER) {
        if (k in obj) out[k] = obj[k];
    }
    // 2) 其它未列字段按字母序追加（兜底，避免丢字段）
    const extras = Object.keys(obj).filter((k) => !FIELD_ORDER.includes(k)).sort();
    for (const k of extras) {
        if (k === '_source') continue; // _source 已在末尾
        out[k] = obj[k];
    }
    // 3) _source 兜底排到最末
    if ('_source' in obj && !('_source' in out)) out._source = obj._source;
    return out;
}

function humanizeTitle(s) {
    if (!s) return '';
    // helloworld → Hello World; book-management-model → Book Management Model
    return s.split('-').map((w) =>
        w === 'helloworld' ? 'Hello World' :
        w === 'sse' ? 'SSE' :
        w === 'http' ? 'HTTP' :
        w === 'sql' ? 'SQL' :
        w === 'crud' ? 'CRUD' :
        w[0].toUpperCase() + w.slice(1)
    ).join(' ');
}

// ============================================================================
// helpers
// ============================================================================

function parseArgs(argv) {
    const out = { fromOnline: false, fromCache: true, overwrite: false, dryRun: false };
    for (const a of argv) {
        if (a === '--from-online') { out.fromOnline = true; out.fromCache = false; }
        else if (a === '--from-cache') { out.fromOnline = false; out.fromCache = true; }
        else if (a === '--overwrite') out.overwrite = true;
        else if (a === '--dry-run')   out.dryRun = true;
        else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
    }
    return out;
}

function printHelp() {
    console.log(`\nUsage: node pull-save.mjs [options]

Options:
  --from-cache     use .cache/sample-all.json as source (default)
  --from-online    fetch from live data model API (writes cache)
  --overwrite      overwrite existing <dir>.json files (default: skip)
  --dry-run        no file writes, only print plan
  -h, --help       show this help
`);
}

function log(msg) {
    console.log(msg);
}
