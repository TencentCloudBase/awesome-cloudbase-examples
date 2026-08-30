// packer.mjs
//
// 模板源码 → zip + sha256
//
// 根据 funcTypes / isCompile 自动确定 zip 内容：
//   - scfFunc + 非编译型（Node/Python/PHP）→ 源码目录（排除 node_modules / .git / metadata 等）
//   - scfFunc + 编译型（Go/Java）→ 先跑 build.sh，再打包产物（main / *.jar）
//   - scfWeb            → 同上，但必含 scf_bootstrap
//   - tcbrContainer     → 不需要 zip（容器镜像部署）
//
// Usage:
//   import { pack } from './lib/packer.mjs';
//   const { zipPath, sha256 } = await pack('scf-go-helloworld');

import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNC_DIR = resolve(__dirname, '../..');       // cloudfunctions/templates-sync
const CLOUDFUNCTIONS_DIR = resolve(SYNC_DIR, '..'); // cloudfunctions
const CACHE_DIR = join(SYNC_DIR, '.cache');

// ---------- 导出类型常量 ----------
export const PACK_TYPE = {
    SKIP_CONTAINER: 'skip-container',   // tcbrContainer 跳过
    COMPILE_GO:    'compile-go',
    COMPILE_JAVA:  'compile-java',
    RAW_NODE:      'raw-nodejs',
    RAW_PYTHON:    'raw-python',
    RAW_PHP:       'raw-php',
};

// ---------- 导出：分析打包类型 ----------
export function detectPackType(dirName) {
    const jsonPath = join(CLOUDFUNCTIONS_DIR, dirName, 'cloudbase-template.json');
    if (!existsSync(jsonPath)) return PACK_TYPE.SKIP_CONTAINER;
    const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const funcTypes = json.funcTypes || [];
    const lang = (json.language || '').toLowerCase();
    const isCompile = json.isCompile === true;

    // 容器化 → 跳过
    if (funcTypes.includes('tcbrContainer') && !funcTypes.includes('scfWeb') && !funcTypes.includes('scfFunc')) {
        return PACK_TYPE.SKIP_CONTAINER;
    }

    if (isCompile) {
        if (lang === 'go' || lang === 'golang') return PACK_TYPE.COMPILE_GO;
        if (lang === 'java') return PACK_TYPE.COMPILE_JAVA;
        return PACK_TYPE.COMPILE_GO; // fallback
    }

    if (lang.includes('node') || lang === 'javascript') return PACK_TYPE.RAW_NODE;
    if (lang === 'python') return PACK_TYPE.RAW_PYTHON;
    if (lang === 'php') return PACK_TYPE.RAW_PHP;

    return PACK_TYPE.RAW_NODE; // fallback
}

// ---------- 导出：判断是否 scfWeb（需要 scf_bootstrap） ----------
export function isScfWeb(dirName) {
    const jsonPath = join(CLOUDFUNCTIONS_DIR, dirName, 'cloudbase-template.json');
    if (!existsSync(jsonPath)) return false;
    const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    return (json.funcTypes || []).includes('scfWeb');
}

// ---------- 导出：运行 build.sh ----------
export function runBuild(dirName) {
    const dirPath = join(CLOUDFUNCTIONS_DIR, dirName);
    const buildScript = join(dirPath, 'build.sh');
    if (!existsSync(buildScript)) {
        console.error(`  [pack] ${dirName}: no build.sh found (isCompile=true but missing build.sh), skip`);
        return false;
    }
    console.error(`  [pack] ${dirName}: running build.sh...`);
    execFileSync('/bin/bash', [buildScript], { cwd: dirPath, stdio: 'inherit' });
    return true;
}

// ---------- 获取实际部署文件列表 ----------
function getDeployFiles(dirName, packType) {
    const dirPath = join(CLOUDFUNCTIONS_DIR, dirName);
    const isWeb = isScfWeb(dirName);

    // 排除列表（相对于 dirPath）
    const EXCLUDE = [
        'node_modules',
        '.cache', '.git', '.github',
        '*.zip',
    ];

    // 公共：收集源码文件（按 EXCLUDE 过滤，过滤隐藏文件）
    function collectSource() {
        const result = new Set();
        function walk(dir) {
            for (const entry of readdirSync(join(dirPath, dir), { withFileTypes: true })) {
                const rel = dir ? `${dir}/${entry.name}` : entry.name;
                if (EXCLUDE.some((p) => {
                    if (p.endsWith('*')) return rel.endsWith(p.slice(0, -1)) || entry.name.endsWith(p.slice(0, -1));
                    return entry.name === p || rel === p;
                })) continue;
                if (entry.name.startsWith('.')) continue;
                if (entry.isDirectory()) { walk(rel); }
                else { result.add(rel); }
            }
        }
        walk('');
        return [...result];
    }

    if (packType === PACK_TYPE.COMPILE_GO) {
        const files = [];
        if (existsSync(join(dirPath, 'main'))) files.push('main');
        if (isWeb && existsSync(join(dirPath, 'scf_bootstrap'))) files.push('scf_bootstrap');
        // 追加源码
        for (const f of collectSource()) { if (!files.includes(f)) files.push(f); }
        return files;
    }

    if (packType === PACK_TYPE.COMPILE_JAVA) {
        const files = [];
        for (const f of readdirSync(dirPath)) {
            if (f.endsWith('.jar')) files.push(f);
        }
        if (isWeb && existsSync(join(dirPath, 'scf_bootstrap'))) files.push('scf_bootstrap');
        for (const f of collectSource()) { if (!files.includes(f)) files.push(f); }
        return files;
    }

    // 非编译型：只收源码
    const files = collectSource();

    // scfWeb 额外加 scf_bootstrap
    if (isWeb && existsSync(join(dirPath, 'scf_bootstrap'))) {
        if (!files.includes('scf_bootstrap')) files.push('scf_bootstrap');
    }

    return files;
}

// ---------- 导出：打包 ----------
export function pack(dirName) {
    const packType = detectPackType(dirName);
    if (packType === PACK_TYPE.SKIP_CONTAINER) {
        console.error(`  [pack] ${dirName}: tcbrContainer only, skip zip`);
        return { zipPath: null, sha256: null };
    }

    // 编译型：先跑 build.sh，然后清理它可能残留的 zip
    if (packType === PACK_TYPE.COMPILE_GO || packType === PACK_TYPE.COMPILE_JAVA) {
        runBuild(dirName);
        // 清理旧 build.sh 可能留下的 zip（避免被打进部署包）
        const dirPath = join(CLOUDFUNCTIONS_DIR, dirName);
        for (const f of readdirSync(dirPath)) {
            if (f.endsWith('.zip')) {
                unlinkSync(join(dirPath, f));
            }
        }
    }

    const dirPath = join(CLOUDFUNCTIONS_DIR, dirName);
    const deployFiles = getDeployFiles(dirName, packType);

    if (deployFiles.length === 0) {
        console.error(`  [pack] ${dirName}: no deploy files found, skip`);
        return { zipPath: null, sha256: null };
    }

    // 创建 .cache 目录
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

    const zipName = `${dirName}.zip`;
    const zipPath = join(CACHE_DIR, zipName);

    console.error(`  [pack] ${dirName}: creating ${zipName} (${deployFiles.length} files)...`);

    // 用系统 zip 命令（macOS / Linux 内置）
    // 先删旧 zip（zip 命令默认追加，不覆盖），再创建
    if (existsSync(zipPath)) unlinkSync(zipPath);
    const args = ['-X', '-r', zipPath, ...deployFiles];
    execFileSync('zip', args, { cwd: dirPath, stdio: 'pipe' });

    // 算 sha256
    const sha256 = createHash('sha256').update(readFileSync(zipPath)).digest('hex');

    return { zipPath, sha256, deployFiles };
}
