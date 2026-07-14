// Tag 派生与校验工具 / Tag derivation and validation
// 严格对齐 cloudfunctions/templates/README.md §7.6
// Strictly aligned with README.md §7.6.

import { canonicalLanguage } from './normalize.mjs';

// ============================================================================
// 词表 / Controlled vocabularies (README §7.6.3 ~ §7.6.7)
// ============================================================================

// §7.6.3 函数类型 / Function type
export const TYPE_TAGS = new Set(['http', 'func']);

// §7.6.4 语言 / Language
export const LANG_TAGS = new Set(['nodejs', 'python', 'go', 'java', 'php']);
export const LANG_EXTRA_TAGS = new Set(['typescript']); // 附加可选

// §7.6.5 框架 / Frameworks
export const FRAMEWORK_TAGS = new Set([
    // Node.js Web
    'express', 'koa', 'hono', 'nestjs', 'fastify',
    // Python Web
    'flask', 'django', 'fastapi', 'tornado',
    // Go Web
    'gin', 'echo', 'fiber',
    // Java Web
    'spring-boot', 'quarkus',
    // PHP Web
    'laravel', 'slim',
    // Agent 框架 / SDK
    'langgraph', 'google-adk', 'langchain', 'llamaindex',
    'dify', 'n8n', 'openclaw', 'yuanqi', 'coze', 'crewai', 'cloudbase-agent',
    // 微信生态 SDK
    'wx-server-sdk',
]);

// §7.6.6 业务域 / Domain
export const DOMAIN_TAGS = new Set([
    'helloworld', 'agent', 'agent-platform', 'agent-framework',
    'wechat-miniprogram', 'wechat-pay', 'wechat-openapi', 'wechat-official',
    'auth', 'database', 'transaction', 'data-analytics',
    'storage', 'realtime', 'webhook',
    'web-framework', 'integration',
]);

// §7.6.7 能力点 / Capabilities
export const CAP_TAGS = new Set([
    'crud', 'auth', 'payment', 'database', 'storage',
    'websocket', 'sse', 'cron', 'webhook', 'openapi',
    'pagination', 'full-text-search', 'aggregation',
]);

const KEBAB_RE = /^[a-z][a-z0-9-]*$/;

// ============================================================================
// 派生 / Derive (README §7.6.8)
// ============================================================================

/**
 * Derive tags from a template record.
 *
 * @param {object} rec  线上记录或部分字段：{ identifier, title, language, funcTypes, sampleCode, description, lang, _identifier? }
 *                       _identifier 是本地目录名（首选信号源，因为更详细），identifier 是兜底
 * @returns {string[]}  规范化 tags 数组（按 type → lang → framework → domain → cap 顺序，去重）
 */
export function deriveTags(rec) {
    const id = (rec._identifier || rec.identifier || '').toLowerCase();
    const title = (rec.title || '').toLowerCase();
    const sample = (rec.sampleCode || rec.description || '').toLowerCase();
    const haystack = `${id} ${title} ${sample}`;
    const funcTypes = rec.funcTypes || [];

    const tags = [];

    // 1) 函数类型 — scfWeb 必加 http；scfFunc 默认省略
    if (funcTypes.includes('scfWeb')) tags.push('http');

    // 2) 语言
    const lang = canonicalLanguage(rec.language);
    if (LANG_TAGS.has(lang)) tags.push(lang);

    // 3) 框架 — 按词表逐个匹配 identifier
    const frameworkOrder = [
        'hono', 'express', 'koa', 'nestjs', 'fastify',
        'flask', 'django', 'fastapi', 'tornado',
        'gin', 'echo', 'fiber',
        'spring-boot', 'springboot', 'quarkus',
        'laravel', 'slim',
        'langgraph', 'google-adk', 'langchain', 'llamaindex',
        'dify', 'n8n', 'openclaw', 'yuanqi', 'coze', 'crewai', 'cloudbase-agent',
        'wx-server-sdk',
    ];
    for (const fw of frameworkOrder) {
        if (id.includes(fw)) {
            // 兼容 springboot → spring-boot
            const canonical = fw === 'springboot' ? 'spring-boot' : fw;
            if (FRAMEWORK_TAGS.has(canonical)) {
                tags.push(canonical);
                break; // 只取一个框架 tag
            }
        }
    }

    // 4) 业务域 — 按触发关键词扫
    // helloworld
    if (/(helloworld|hello|empty|blank)/.test(id)) tags.push('helloworld');

    // agent 系列
    if (/(agent|yuanqi|adp|ai-test|coze|crewai|dify|langchain|langgraph|google-adk|cloudbase-agent)/.test(id)) {
        tags.push('agent');
        // 平台 vs 框架
        const isPlatform = /(openclaw|n8n|dify|yuanqi|adp|coze)/.test(id);
        const isFramework = /(langgraph|google-adk|langchain|llamaindex|crewai)/.test(id);
        if (isPlatform)  tags.push('agent-platform');
        if (isFramework) tags.push('agent-framework');
    }

    // 微信小程序
    if (/(weapp|miniprogram|mini-program|\bwx-|wxpay|wechat|get-openid|get-phonenumber|custom-auth)/.test(id)) {
        tags.push('wechat-miniprogram');
    }
    // 微信支付
    if (/(wxpay|wechat-pay)/.test(id)) tags.push('wechat-pay');
    // 微信开放接口
    if (/(openapi|get-phonenumber|get-openid|custom-auth|wechat-notify|wechat-official)/.test(id)) {
        tags.push('wechat-openapi');
    }
    if (/wechat-official/.test(id)) tags.push('wechat-official');

    // 鉴权
    if (/(auth|jwt|token|login|user-management|custom-auth)/.test(id)) tags.push('auth');

    // 数据库 / CRUD
    if (/(book-management|post-management|user-management|crud|collection|database|sql)/.test(id)) {
        tags.push('database');
    }
    // 事务 / 金融
    if (/(transaction|transfer|finance|payment)/.test(id)) tags.push('transaction');
    // 数据分析
    if (/(analytics|aggregate|stat)/.test(id)) tags.push('data-analytics');
    // 存储
    if (/(storage|oss|cos)/.test(id)) tags.push('storage');
    // 实时
    if (/(websocket|sse|socket|realtime)/.test(id)) tags.push('realtime');
    // webhook
    if (/(webhook|callback|notify)/.test(id)) tags.push('webhook');
    // integration 系列（scf-integration-*）
    if (/^(?:scf-)?integration[-_]/.test(id)) tags.push('integration');

    // Web 框架兜底：如果有框架 tag 且业务域为空，加 web-framework
    const hasFrameworkTag = tags.some((t) => FRAMEWORK_TAGS.has(t));
    const hasDomainTag = tags.some((t) => DOMAIN_TAGS.has(t));
    if (hasFrameworkTag && !hasDomainTag) tags.push('web-framework');

    // 5) 能力点
    if (/sse/.test(id))         tags.push('sse');
    if (/websocket/.test(id))   tags.push('websocket');
    if (/transaction/.test(id)) tags.push('aggregation');
    if (/aggregate/.test(id))   tags.push('aggregation');
    if (/wxpay/.test(id))       tags.push('payment');
    if (/openapi/.test(id))     tags.push('openapi');
    if (/(book-management|post-management|user-management|crud)/.test(id)) tags.push('crud');
    if (/auth/.test(id))        tags.push('auth');

    // 去重 + 排序（按词表分组顺序）
    return canonicalSort(unique(tags));
}

// ============================================================================
// 校验 / Validate (README §7.6.9)
// ============================================================================

/**
 * Validate a tags array against the controlled vocabulary.
 *
 * @param {string[]} tags
 * @param {object}   rec  { funcTypes, language }
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateTags(tags, rec = {}) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(tags)) {
        errors.push('tags must be an array');
        return { errors, warnings };
    }

    // Rule 1: kebab-case
    for (const t of tags) {
        if (typeof t !== 'string') {
            errors.push(`tag is not a string: ${JSON.stringify(t)}`);
            continue;
        }
        if (!KEBAB_RE.test(t)) errors.push(`tag not kebab-case: ${t}`);
    }

    const set = new Set(tags);

    // Rule 2: type
    const hasHttp = set.has('http');
    const hasFunc = set.has('func');
    const isScfWeb = (rec.funcTypes || []).includes('scfWeb');
    const isScfFunc = (rec.funcTypes || []).includes('scfFunc');

    if (isScfWeb && !hasHttp) errors.push('scfWeb template must contain "http" tag');
    if (!isScfWeb && hasHttp) errors.push('non-scfWeb template must not contain "http" tag');
    if (isScfFunc && hasHttp) errors.push('scfFunc template must not contain "http" tag');

    // Rule 3: language — exactly one
    const langPresent = tags.filter((t) => LANG_TAGS.has(t));
    if (langPresent.length !== 1) {
        errors.push(`language tag count = ${langPresent.length} (expected exactly 1)`);
    } else {
        const expected = canonicalLanguage(rec.language);
        if (expected && langPresent[0] !== expected) {
            errors.push(`language tag "${langPresent[0]}" mismatch with language="${rec.language}" (canonical="${expected}")`);
        }
    }

    // Rule 4: domain count
    const domainPresent = tags.filter((t) => DOMAIN_TAGS.has(t));
    if (domainPresent.length < 1) warnings.push('no domain tag');
    if (domainPresent.length > 3) warnings.push(`too many domain tags (${domainPresent.length})`);

    // Rule 5: framework / cap in vocabulary
    for (const t of tags) {
        if (TYPE_TAGS.has(t) || LANG_TAGS.has(t) || LANG_EXTRA_TAGS.has(t)
            || FRAMEWORK_TAGS.has(t) || DOMAIN_TAGS.has(t) || CAP_TAGS.has(t)) {
            continue;
        }
        warnings.push(`unknown tag (not in any vocabulary): ${t}`);
    }

    return { errors, warnings };
}

// ============================================================================
// 工具 / Helpers
// ============================================================================

function unique(arr) {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
        if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
    return out;
}

// 按维度顺序排序：type → lang → framework → domain → cap → unknown
function canonicalSort(tags) {
    const order = (t) => {
        if (TYPE_TAGS.has(t))      return 0;
        if (LANG_TAGS.has(t) || LANG_EXTRA_TAGS.has(t)) return 1;
        if (FRAMEWORK_TAGS.has(t)) return 2;
        if (DOMAIN_TAGS.has(t))    return 3;
        if (CAP_TAGS.has(t))       return 4;
        return 5;
    };
    return [...tags].sort((a, b) => {
        const oa = order(a), ob = order(b);
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b);
    });
}
