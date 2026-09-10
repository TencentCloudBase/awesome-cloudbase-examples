// CloudBase 数据模型 OpenAPI 客户端
// CloudBase Data Model OpenAPI client.
//
// Base URL:
//   https://<envId>.api.tcloudbasegateway.com/v1/model/prod/<modelName>
//
// 认证 / Auth: Authorization: Bearer <CloudBase API Key>
//   CloudBase 长期 API Key 可直接作为 Bearer token 用于服务端调用。
//   仅可在服务端使用（环境变量注入），禁止在浏览器、小程序等客户端暴露。
//
// 参考文档 / Reference:
//   https://docs.cloudbase.net/http-api/model/%E6%95%B0%E6%8D%AE%E6%A8%A1%E5%9E%8B-openapi
//   https://docs.cloudbase.net/openapi/datasource.v1.openapi.yaml

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- .env 加载 / .env loader -------------------------------------------------
// 复用 cloudfunctions/scripts/.env（已被 .gitignore 双重忽略）
// Reuse cloudfunctions/scripts/.env (already ignored by .gitignore)
export function loadDotenv() {
    const candidates = [
        resolve(__dirname, '../../../scripts/.env'),     // cloudfunctions/scripts/.env
        resolve(__dirname, '../../.env'),                // cloudfunctions/templates/.env
    ];
    for (const p of candidates) {
        if (!existsSync(p)) continue;
        const text = readFileSync(p, 'utf-8');
        for (const rawLine of text.split(/\r?\n/)) {
            const line = rawLine.replace(/^\s+/, '');
            if (!line || line.startsWith('#')) continue;
            const stripped = line.startsWith('export ') ? line.slice(7) : line;
            const eq = stripped.indexOf('=');
            if (eq < 0) continue;
            const key = stripped.slice(0, eq).trim();
            let val = stripped.slice(eq + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            // CLI 已 export 的优先，不覆盖
            if (process.env[key] === undefined || process.env[key] === '') {
                process.env[key] = val;
            }
        }
    }
}

// 简单脱敏：保留首 6 + 末 4 / Mask middle, keep 6 head + 4 tail
export function mask(s) {
    if (!s) return '<empty>';
    if (s.length <= 12) return s.slice(0, 2) + '***';
    return s.slice(0, 6) + '***' + s.slice(-4);
}

// ---- 数据模型客户端 / Data-Model client -------------------------------------
export class CloudBaseDataModel {
    // envType: 'prod'（正式数据）或 'preview'（体验数据）
    // CloudBase data models have built-in dual-environment support:
    //   - prod:    published/production data (正式数据)
    //   - preview: staging/preview data (体验数据，操作不影响正式环境)
    constructor({ envId, modelName, apiKey, timeoutMs = 30000, envType = 'prod' }) {
        if (!envId)     throw new Error('envId is required (set TEMPLATE_ENV_ID in .env)');
        if (!modelName) throw new Error('modelName is required (set TEMPLATE_MODEL_ID in .env)');
        if (!apiKey)    throw new Error('apiKey is required (set CLOUDBASE_APIKEY in .env)');

        this.envId = envId;
        this.modelName = modelName;
        this.apiKey = apiKey;
        this.timeoutMs = timeoutMs;
        this.envType = envType;
        this.baseUrl =
            `https://${envId}.api.tcloudbasegateway.com/v1/model/${envType}/${modelName}`;
    }

    _headers() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    async _fetch(method, path, { query, body } = {}) {
        const qs = query ? '?' + new URLSearchParams(query).toString() : '';
        const url = `${this.baseUrl}${path}${qs}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
        let resp;
        try {
            resp = await fetch(url, {
                method,
                headers: this._headers(),
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: ctrl.signal,
            });
        } catch (err) {
            throw new Error(`[${method} ${url}] network error: ${err.message}`);
        } finally {
            clearTimeout(timer);
        }

        const text = await resp.text();
        let parsed = null;
        if (text) {
            try { parsed = JSON.parse(text); } catch { parsed = text; }
        }
        if (!resp.ok) {
            const err = new Error(`[${method} ${url}] HTTP ${resp.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
            err.status = resp.status;
            err.body = parsed;
            err.url = url;
            throw err;
        }

        // 数据模型 OpenAPI 在 HTTP 2xx 下，业务错误用响应体 code 表达
        // The data-model API uses HTTP 2xx everywhere; business errors live in body.code
        if (parsed && typeof parsed === 'object' && parsed.code && parsed.code !== '0' && parsed.code !== 'OK') {
            // 只有当 code 看起来是错误码时才抛（含字母且不是数据载荷）
            // Only treat as error when code looks like an error string
            if (typeof parsed.code === 'string' && /[A-Z_]/.test(parsed.code)) {
                const err = new Error(`[${method} ${url}] business error ${parsed.code}: ${parsed.message || ''}`);
                err.bizCode = parsed.code;
                err.body = parsed;
                err.url = url;
                throw err;
            }
        }
        return parsed;
    }

    // POST /list  复杂条件查询多条 / List with filter + pagination + ordering
    //   body: { filter, select, pageSize, pageNumber, getCount, orderBy }
    async list({
        filter = { where: {} },
        select = { $master: true },
        pageSize = 50,
        pageNumber = 1,
        getCount = true,
        orderBy,
    } = {}) {
        const body = { filter, select, pageSize, pageNumber, getCount };
        if (orderBy) body.orderBy = orderBy;
        return this._fetch('POST', '/list', { body });
    }

    // 拉全量 / Fetch all records (auto-paginate)
    async listAll({ pageSize = 100, ...rest } = {}) {
        const all = [];
        let pageNumber = 1;
        let total = null;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const resp = await this.list({ ...rest, pageSize, pageNumber, getCount: true });
            const records = resp?.data?.records || [];
            if (total === null) total = resp?.data?.total ?? null;
            all.push(...records);
            if (records.length < pageSize) break;
            pageNumber += 1;
            if (pageNumber > 100) throw new Error('listAll safety stop: > 100 pages');
        }
        return { records: all, total };
    }

    // GET /{recordId}/get  按主键获取 / Get one by _id
    async get(recordId) {
        return this._fetch('GET', `/${encodeURIComponent(recordId)}/get`);
    }

    // POST /get  按条件获取单条 / Find one by filter
    async findOne({ filter, select = { $master: true } } = {}) {
        return this._fetch('POST', '/get', { body: { filter, select } });
    }

    // POST /create  创建单条 / Create one
    async create(data) {
        return this._fetch('POST', '/create', { body: { data } });
    }

    // POST /createMany  批量创建 / Create many
    async createMany(dataArray) {
        return this._fetch('POST', '/createMany', { body: { data: dataArray } });
    }

    // PUT /update  更新单条（按 filter）/ Update one by filter
    async update(filter, data) {
        return this._fetch('PUT', '/update', { body: { filter, data } });
    }

    // PUT /updateMany  批量更新 / Update many
    async updateMany(filter, data) {
        return this._fetch('PUT', '/updateMany', { body: { filter, data } });
    }

    // POST /upsert  不存在则建，存在则更 / Upsert
    async upsert(filter, create, update) {
        return this._fetch('POST', '/upsert', { body: { filter, create, update } });
    }

    // DELETE /{recordId}/delete  按主键删 / Delete by _id
    async deleteById(recordId) {
        return this._fetch('DELETE', `/${encodeURIComponent(recordId)}/delete`);
    }

    // POST /delete  按条件删单条 / Delete one by filter
    async deleteOne(filter) {
        return this._fetch('POST', '/delete', { body: { filter } });
    }

    // POST /deleteMany  按条件批量删 / Delete many by filter
    async deleteMany(filter) {
        return this._fetch('POST', '/deleteMany', { body: { filter } });
    }
}

// 便捷过滤器构造 / Filter helpers
export const F = {
    where: (clauses) => ({ where: clauses }),
    eq:    (field, value) => ({ [field]: { $eq: value } }),
    in:    (field, values) => ({ [field]: { $in: values } }),
    and:   (...clauses) => Object.assign({}, ...clauses),
};
