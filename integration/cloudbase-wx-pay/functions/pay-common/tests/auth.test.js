/**
 * 鉴权中间件
 *
 * 重点覆盖「曾经假放行」的三类来源 —— 这些分支删掉后必须回归：
 *   - 自定义 header（x-tcb-integration-id）
 *   - 客户端可伪造的 header（x-wx-source / x-authmethod）
 *   - 云函数内恒存在的环境变量（SCF_RUNTIME / TENCENTCLOUD_RUNENV）
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { payMiddleware } = require('../middleware/auth');
const { getOpenId } = require('../utils/cloudbaseAuth');

function mockReq({ headers = {}, body = {} } = {}) {
    return { headers, body, method: 'POST', path: '/wxpay_order' };
}

function mockRes() {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
}

function run(req) {
    const res = mockRes();
    let passed = false;
    payMiddleware(req, res, () => { passed = true; });
    return { passed, res };
}

test('平台注入 x-wx-openid：放行，并挂到 req.user', () => {
    const req = mockReq({ headers: { 'x-wx-openid': 'o_valid_openid_123456' } });
    const { passed } = run(req);
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.openid, 'o_valid_openid_123456');
});

test('x-wx-openid 格式非法（过短）：拒绝', () => {
    const { passed, res } = run(mockReq({ headers: { 'x-wx-openid': 'o1' } }));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('云 API 网关 Bearer JWT：放行，并挂到 req.cloudbaseAuth', () => {
    const payload = Buffer.from(JSON.stringify({ provider_sub: 'o_from_jwt_123456' })).toString('base64');
    const token = `h.${payload}.s`;
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const { passed } = run(req);
    assert.strictEqual(passed, true);
    assert.strictEqual(req.cloudbaseAuth.provider_sub, 'o_from_jwt_123456');
});

test('Bearer 结构不合法（非三段）：拒绝', () => {
    const { passed, res } = run(mockReq({ headers: { authorization: 'Bearer garbage' } }));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ 回归：伪造 x-tcb-integration-id 不再放行', () => {
    const { passed, res } = run(mockReq({ headers: { 'x-tcb-integration-id': 'anything' } }));
    assert.strictEqual(passed, false, '自定义 header 可被客户端任意添加，不能作为身份');
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ 回归：伪造 x-wx-source / x-authmethod 不再放行', () => {
    const a = run(mockReq({ headers: { 'x-wx-source': 'wx_client' } }));
    const b = run(mockReq({ headers: { 'x-authmethod': 'WX_SERVER_AUTH' } }));
    assert.strictEqual(a.passed, false);
    assert.strictEqual(b.passed, false);
});

test('⚠️ 回归：SCF_RUNTIME 环境变量恒存在，不能当作「请求经过网关」的证明', () => {
    const saved = process.env.SCF_RUNTIME;
    process.env.SCF_RUNTIME = '1';
    try {
        const { passed, res } = run(mockReq());
        assert.strictEqual(passed, false, '云函数内该变量恒存在，放行等于无鉴权');
        assert.strictEqual(res.statusCode, 401);
    } finally {
        if (saved === undefined) delete process.env.SCF_RUNTIME;
        else process.env.SCF_RUNTIME = saved;
    }
});

test('getOpenId：默认不采信 body.payer.openid（客户端可伪造）', () => {
    const req = mockReq({ body: { payer: { openid: 'o_forged_openid_1234' } } });
    assert.strictEqual(getOpenId(req), null);
});

test('getOpenId：body 回退仅对 H5 演示路由开放', () => {
    const req = mockReq({ body: { payer: { openid: 'o_h5_openid_123456' } } });
    req.allowBodyOpenid = true;
    assert.strictEqual(getOpenId(req), 'o_h5_openid_123456');
});
