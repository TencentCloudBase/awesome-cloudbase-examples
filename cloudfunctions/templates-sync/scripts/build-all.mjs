#!/usr/bin/env node
// build-all.mjs
//
// 批量执行编译型模板的 build.sh，产出部署所需文件。
// 编译型语言：Go / Java（isCompile=true）—— 跳过 Node.js / Python / PHP 等解释型语言。
//
// 用法 / Usage:
//   node build-all.mjs                          # 跑所有 isCompile=true 的模板
//   node build-all.mjs --only scf-go-helloworld # 单个
//   node build-all.mjs --langs go,java          # 按语言过滤
//   node build-all.mjs --dry-run                # 仅打印计划，不执行
//   node build-all.mjs --fail-fast              # 任一失败立即停止（默认：继续跑剩余的）

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalLanguage } from './lib/normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLOUDFUNCTIONS_DIR = resolve(__dirname, '../..');

const args = parseArgs(process.argv.slice(2));

const t0 = Date.now();
const results = [];

main().catch((err) => {
    console.error('\n[FATAL]', err.message);
    process.exit(1);
});

async function main() {
    const tasks = collectTasks();
    if (!tasks.length) {
        console.log('No compile-typed templates matched.');
        return;
    }

    console.log('== build-all ==');
    console.log(`  CWD     = ${CLOUDFUNCTIONS_DIR}`);
    console.log(`  Tasks   = ${tasks.length}`);
    console.log(`  Filters = only=${JSON.stringify(args.only || null)}  langs=${JSON.stringify(args.langs || null)}  dry-run=${args.dryRun}  fail-fast=${args.failFast}`);
    console.log('');

    for (const task of tasks) {
        console.log(`\n────────────────────────────────────────────────────────────`);
        console.log(`  [${task.lang.toUpperCase()}] ${task.dir}`);
        console.log(`  language=${task.language}  funcTypes=${task.funcTypes.join(',')}  build.sh=${task.hasBuildSh ? 'yes' : 'MISSING'}`);
        console.log(`────────────────────────────────────────────────────────────`);

        if (!task.hasBuildSh) {
            console.log(`  [SKIP] no build.sh; expected at cloudfunctions/${task.dir}/build.sh`);
            results.push({ ...task, status: 'skip', reason: 'no build.sh' });
            continue;
        }

        if (args.dryRun) {
            console.log(`  [DRY] would run: bash build.sh`);
            results.push({ ...task, status: 'dry' });
            continue;
        }

        const t1 = Date.now();
        try {
            execSync('bash build.sh', {
                cwd: join(CLOUDFUNCTIONS_DIR, task.dir),
                stdio: 'inherit',
                env: process.env,
            });
            const dt = ((Date.now() - t1) / 1000).toFixed(1);
            console.log(`  [OK ] build done in ${dt}s`);
            results.push({ ...task, status: 'ok', durationSec: +dt });
        } catch (err) {
            const dt = ((Date.now() - t1) / 1000).toFixed(1);
            console.log(`  [FAIL] build failed after ${dt}s  (exit=${err.status || 'n/a'})`);
            results.push({ ...task, status: 'fail', durationSec: +dt });
            if (args.failFast) break;
        }
    }

    printSummary();
    const failed = results.filter((r) => r.status === 'fail').length;
    process.exit(failed > 0 ? 1 : 0);
}

function collectTasks() {
    const dirs = readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((name) => /^(scf|http)-/.test(name))
        .sort();

    const tasks = [];
    for (const d of dirs) {
        const tpl = readTemplateJson(d);
        if (!tpl) continue;
        if (tpl.isCompile !== true) continue;
        const lang = canonicalLanguage(tpl.language);
        if (args.langs && !args.langs.includes(lang)) continue;
        if (args.only && !args.only.includes(d)) continue;

        tasks.push({
            dir: d,
            lang,
            language: tpl.language,
            funcTypes: tpl.funcTypes || [],
            hasBuildSh: existsSync(join(CLOUDFUNCTIONS_DIR, d, 'build.sh')),
        });
    }
    return tasks;
}

function readTemplateJson(dir) {
    const f = join(CLOUDFUNCTIONS_DIR, dir, 'cloudbase-template.json');
    if (!existsSync(f)) return null;
    try {
        return JSON.parse(readFileSync(f, 'utf-8'));
    } catch (err) {
        console.error(`  [WARN] failed to parse ${dir}/cloudbase-template.json: ${err.message}`);
        return null;
    }
}

function printSummary() {
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(  `║  build-all summary  (total ${dt}s)`);
    console.log(  `╚══════════════════════════════════════════════════════════════╝`);

    const groups = { ok: [], fail: [], skip: [], dry: [] };
    for (const r of results) (groups[r.status] || []).push(r);

    const fmt = (arr, label) => {
        if (!arr.length) return;
        console.log(`  ${label} (${arr.length}):`);
        for (const r of arr) {
            const sfx = r.durationSec != null ? `  ${r.durationSec}s` : (r.reason ? `  (${r.reason})` : '');
            console.log(`    - [${r.lang}] ${r.dir}${sfx}`);
        }
    };
    fmt(groups.ok,   '✅ OK  ');
    fmt(groups.fail, '❌ FAIL');
    fmt(groups.skip, '⏭ SKIP');
    fmt(groups.dry,  '🅳 DRY ');
}

function parseArgs(argv) {
    const out = { only: null, langs: null, dryRun: false, failFast: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--only') {
            out.only = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
        } else if (a.startsWith('--only=')) {
            out.only = a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean);
        } else if (a === '--langs') {
            out.langs = (argv[++i] || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        } else if (a.startsWith('--langs=')) {
            out.langs = a.slice('--langs='.length).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        } else if (a === '--dry-run') {
            out.dryRun = true;
        } else if (a === '--fail-fast') {
            out.failFast = true;
        } else if (a === '-h' || a === '--help') {
            printHelp(); process.exit(0);
        }
    }
    return out;
}

function printHelp() {
    console.log(`\nUsage: node build-all.mjs [options]

Run build.sh in every compile-typed (isCompile=true) template directory.

Options:
  --only <ids>       comma-separated dir names
  --langs <langs>    filter by canonical language: go|java
  --dry-run          print plan only
  --fail-fast        stop on first failure
  -h, --help         show this help
`);
}
