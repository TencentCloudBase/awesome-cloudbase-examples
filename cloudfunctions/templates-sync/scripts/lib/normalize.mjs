// 字段规范化工具 / Field normalization utilities
//
// 把线上"不规范的"取值映射到本仓库的规范取值，仅用于派生 tags、做 lint，
// 不会主动覆写线上数据（除非 push --apply-tags）。
// Normalize live messy values into canonical ones, used by tag derivation
// and lint only; never silently rewrite live data.

// language 规范化：线上有 Javascript / javascript / Nodejs / nodejs / Python / Python3.9 等
export function canonicalLanguage(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const v = raw.trim().toLowerCase();
    if (/^(javascript|nodejs|node\.?js|node|nodejs\d+\.\d+)$/.test(v)) return 'nodejs';
    if (/^(python|python\d+\.\d+|python\d+)$/.test(v))                  return 'python';
    if (/^(go|golang|go\d+)$/.test(v))                                  return 'go';
    if (/^(java|java\d+)$/.test(v))                                     return 'java';
    if (/^(php|php\d+\.\d+|php\d+)$/.test(v))                           return 'php';
    return v;
}

// runtimeVersion 规范化（SCF 入参可识别集合）
export const SCF_RUNTIME_WHITELIST = new Set([
    'Nodejs8.9', 'Nodejs10.15', 'Nodejs12.16', 'Nodejs14.18', 'Nodejs16.13',
    'Nodejs18.15', 'Nodejs20.19',
    'Python2.7', 'Python3.6', 'Python3.7', 'Python3.10',
    'Go1',
    'Java8', 'Java11',
    'Php5', 'Php7', 'Php7.4', 'Php8.0',
]);

export function isCanonicalRuntime(rt) {
    return typeof rt === 'string' && SCF_RUNTIME_WHITELIST.has(rt);
}

// 从 funcTypes 数组判断本脚本范围
export function isInScope(funcTypes) {
    if (!Array.isArray(funcTypes)) return false;
    return funcTypes.some((t) => t === 'scfFunc' || t === 'scfWeb');
}

// 线上 identifier 不一定等于本地目录名（线上去掉了 scf-/http- 语言前缀）
// 这里维护一个映射：把线上 identifier 转换为本地目录名（identifier）
//
// 输入：online identifier（线上字段值），language（用于推断 scf 还是 http）
// 输出：本地目录名（若本地存在则匹配到的目录；若不存在则保持原样）
//
// dirIndex: Set<string> 本地所有目录名集合
export function onlineIdToDirName(onlineId, funcTypes, language, dirIndex) {
    if (!onlineId) return '';
    // 1) 直接命中
    if (dirIndex.has(onlineId)) return onlineId;

    // 2) 推断前缀
    const isHttp = Array.isArray(funcTypes) && funcTypes.includes('scfWeb');
    const isFunc = Array.isArray(funcTypes) && funcTypes.includes('scfFunc');
    const lang = canonicalLanguage(language); // nodejs/python/go/java/php
    const prefixes = [];
    if (isHttp) {
        if (lang) prefixes.push(`http-${lang}-`);
        prefixes.push('http-');
    }
    if (isFunc) {
        if (lang) prefixes.push(`scf-${lang}-`);
        prefixes.push('scf-');
    }
    for (const p of prefixes) {
        if (dirIndex.has(p + onlineId)) return p + onlineId;
    }

    // 3) 模糊命中：取首个包含 onlineId 的目录
    for (const d of dirIndex) {
        if (d.endsWith('-' + onlineId)) return d;
    }
    for (const d of dirIndex) {
        if (d.includes(onlineId)) return d;
    }

    // 4) 找不到对应目录，返回原值（脚本上层会把它当作 orphan）
    return onlineId;
}
