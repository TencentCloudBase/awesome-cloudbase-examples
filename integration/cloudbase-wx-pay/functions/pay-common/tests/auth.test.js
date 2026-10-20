/**
 * 鉴权中间件
 *
 * 重点覆盖「曾经假放行」的三类来源 —— 这些分支删掉后必须回归：
 *   - 自定义 header（x-tcb-integration-id）
 *   - 客户端可伪造的 header（x-wx-source / x-authmethod）
 *   - 云函数内恒存在的环境变量（SCF_RUNTIME / TENCENTCLOUD_RUNENV）
 *
 * 以及三类「看起来有校验、实际可绕过」的问题：
 *   - Bearer 只 base64 解码不校验内容（`Bearer a.<base64('{}')>.b`）
 *   - H5 缺少 Origin 时直接放行（浏览器同源 POST 不带 Origin）
 *   - 无条件采信 body.payer.openid
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { payMiddleware, h5SecurityMiddleware } = require('../middleware/auth');
const { getOpenId, getUid } = require('../utils/cloudbaseAuth');

function mockReq({ headers = {}, body = {}, path = '/wxpay_order' } = {}) {
    return { headers, body, method: 'POST', path };
}

function mockRes() {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
}

function run(middleware, req) {
    const res = mockRes();
    let passed = false;
    middleware(req, res, () => { passed = true; });
    return { passed, res };
}

/** JWT payload → Bearer token（只做 base64，不签名，模拟客户端可伪造的 token） */
function bearer(payload) {
    return `Bearer h.${Buffer.from(JSON.stringify(payload)).toString('base64')}.s`;
}

/** 临时设置环境变量，用例结束后恢复（避免污染其它用例） */
function withEnv(env, fn) {
    const original = {};
    for (const [k, v] of Object.entries(env)) {
        original[k] = process.env[k];
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    try {
        return fn();
    } finally {
        for (const [k, v] of Object.entries(original)) {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        }
    }
}

// ========== payMiddleware ==========

test('平台注入 x-wx-openid：放行，并挂到 req.user', () => {
    const req = mockReq({ headers: { 'x-wx-openid': 'o_valid_openid_123456' } });
    const { passed } = run(payMiddleware, req);
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.openid, 'o_valid_openid_123456');
});

test('x-wx-openid 格式非法（过短）：拒绝', () => {
    const { passed, res } = run(payMiddleware, mockReq({ headers: { 'x-wx-openid': 'o1' } }));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('云 API 网关 Bearer JWT：放行，并挂到 req.cloudbaseAuth', () => {
    const req = mockReq({ headers: { authorization: bearer({ provider_sub: 'o_from_jwt_123456' }) } });
    const { passed } = run(payMiddleware, req);
    assert.strictEqual(passed, true);
    assert.strictEqual(req.cloudbaseAuth.provider_sub, 'o_from_jwt_123456');
    // 放行契约：中间件放行 ⇒ getOpenId 一定能取到身份
    assert.strictEqual(getOpenId(req), 'o_from_jwt_123456');
});

test('Bearer 结构不合法（非三段）：拒绝', () => {
    const { passed, res } = run(payMiddleware, mockReq({ headers: { authorization: 'Bearer garbage' } }));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ Bearer payload 为空对象：拒绝（只 base64 解码不算鉴权）', () => {
    const { passed, res } = run(payMiddleware, mockReq({ headers: { authorization: bearer({}) } }));
    assert.strictEqual(passed, false, '{} 里没有任何身份标识，不能放行');
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ Bearer 已过期：拒绝', () => {
    const req = mockReq({
        headers: { authorization: bearer({ provider_sub: 'o_from_jwt_123456', exp: 1000000000 }) },
    });
    const { passed, res } = run(payMiddleware, req);
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ Bearer 只有 sub 没有 provider_sub：拒绝（支付写接口必须有 openid）', () => {
    const req = mockReq({ headers: { authorization: bearer({ sub: 'uid_only_123456' }) } });
    const { passed, res } = run(payMiddleware, req);
    assert.strictEqual(passed, false, '放行后 getOpenId 取不到 openid，会在参数校验层变成「参数错误」');
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ Bearer iss 与预期不符：拒绝', () => {
    const req = mockReq({
        headers: { authorization: bearer({ provider_sub: 'o_from_jwt_123456', iss: 'https://evil.example' }) },
    });
    const { passed } = withEnv({ AUTH_EXPECTED_ISSUER: 'https://cloudbase.example' }, () => run(payMiddleware, req));
    assert.strictEqual(passed, false);
});

test('⚠️ payMiddleware 不接受 body.payer.openid（即使开了开关）', () => {
    const req = mockReq({
        body: { payer: { openid: 'o_forged_openid_1234' } },
        headers: { authorization: bearer({ sub: 'uid_only_123456' }) },
    });
    const { passed } = withEnv({ ALLOW_BODY_OPENID: 'true', corsAllowOrigin: 'https://a.com' }, () => run(payMiddleware, req));
    assert.strictEqual(passed, false, '高风险写接口不能采信客户端传的 openid');
});

test('⚠️ 回归：伪造 x-tcb-integration-id 不再放行', () => {
    const { passed, res } = run(payMiddleware, mockReq({ headers: { 'x-tcb-integration-id': 'anything' } }));
    assert.strictEqual(passed, false, '自定义 header 可被客户端任意添加，不能作为身份');
    assert.strictEqual(res.statusCode, 401);
});

test('⚠️ 回归：伪造 x-wx-source / x-authmethod 不再放行', () => {
    const a = run(payMiddleware, mockReq({ headers: { 'x-wx-source': 'wx_client' } }));
    const b = run(payMiddleware, mockReq({ headers: { 'x-authmethod': 'WX_SERVER_AUTH' } }));
    assert.strictEqual(a.passed, false);
    assert.strictEqual(b.passed, false);
});

test('⚠️ 回归：SCF_RUNTIME 环境变量恒存在，不能当作「请求经过网关」的证明', () => {
    withEnv({ SCF_RUNTIME: '1' }, () => {
        const { passed, res } = run(payMiddleware, mockReq());
        assert.strictEqual(passed, false, '云函数内该变量恒存在，放行等于无鉴权');
        assert.strictEqual(res.statusCode, 401);
    });
});

// ========== h5SecurityMiddleware ==========

const H5_ORIGIN = 'https://h5.example.com';

test('⚠️ H5：未配置 corsAllowOrigin → 403（不能静默放行全部来源）', () => {
    const req = mockReq({ headers: { origin: H5_ORIGIN }, path: '/wxpay_order_h5' });
    const { passed, res } = withEnv({ corsAllowOrigin: undefined }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 403);
});

test('⚠️ H5：缺少 Origin 与 Referer → 403（浏览器同源 POST 不带 Origin = CSRF 场景）', () => {
    const req = mockReq({ path: '/wxpay_order_h5' });
    const { passed, res } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, false, '无法校验来源时必须拒绝，不能因为 origin 缺失就跳过校验');
    assert.strictEqual(res.statusCode, 403);
});

test('H5：Origin 不在白名单 → 403', () => {
    const req = mockReq({ headers: { origin: 'https://evil.example.com' }, path: '/wxpay_order_h5' });
    const { passed, res } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 403);
});

test('H5：Origin 通过但没有登录态 → 401（仅靠 Origin 不足以保护写接口）', () => {
    const req = mockReq({ headers: { origin: H5_ORIGIN }, path: '/wxpay_order_h5' });
    const { passed, res } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('H5：Referer 可兜底 Origin（老浏览器不发 Origin）', () => {
    const req = mockReq({
        headers: { referer: `${H5_ORIGIN}/pay.html`, authorization: bearer({ provider_sub: 'o_h5_user_123456' }) },
        path: '/wxpay_order_h5',
    });
    const { passed } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.openid, 'o_h5_user_123456');
});

test('H5：Bearer 登录态 + 白名单 Origin → 放行，身份挂到 req.user', () => {
    const req = mockReq({
        headers: { origin: H5_ORIGIN, authorization: bearer({ provider_sub: 'o_h5_user_123456' }) },
        path: '/wxpay_order_h5',
    });
    const { passed } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.openid, 'o_h5_user_123456');
    assert.strictEqual(getOpenId(req), 'o_h5_user_123456');
});

test('H5：Bearer 只有 sub（无 provider_sub）→ 放行，归属用 UID', () => {
    // H5 常在微信外浏览器登录，CloudBase Auth 凭证只有 UID、没有微信 openid。
    // 放行契约：放行 ⇒ getOpenId 或 getUid 至少能取到一个身份。
    const req = mockReq({
        headers: { origin: H5_ORIGIN, authorization: bearer({ sub: 'uid_only_123456' }) },
        path: '/wxpay_order_h5',
    });
    const { passed, res } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, true, 'H5 下单允许 UID-only 身份（H5 不需要 openid）');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(req.user.openid, null);
    assert.strictEqual(getUid(req), 'uid_only_123456', '放行后必须能用 getUid 取到身份');
    assert.strictEqual(getOpenId(req), null, '没有 openid 就是没有，不能拿 UID 冒充');
});

test('⚠️ H5：UID-only 身份不触发 body.payer.openid 回退', () => {
    const req = mockReq({
        headers: { origin: H5_ORIGIN, authorization: bearer({ sub: 'uid_only_123456' }) },
        body: { payer: { openid: 'o_forged_openid_1234' } },
        path: '/wxpay_order_h5',
    });
    const { passed } = withEnv(
        { corsAllowOrigin: H5_ORIGIN, ALLOW_BODY_OPENID: 'true' },
        () => run(h5SecurityMiddleware, req)
    );
    assert.strictEqual(passed, true);
    assert.strictEqual(req.allowBodyOpenid, false, '已有 Bearer 身份，不能再用 body 里的 openid 覆盖');
    assert.strictEqual(getOpenId(req), null, 'body.openid 不能变成登录身份');
});

test('H5：匿名调用默认拒绝，ALLOW_ANONYMOUS_H5=true 才放行', () => {
    const build = () => mockReq({ headers: { origin: H5_ORIGIN }, path: '/wxpay_order_h5' });

    const closed = withEnv({ corsAllowOrigin: H5_ORIGIN, ALLOW_ANONYMOUS_H5: undefined },
        () => run(h5SecurityMiddleware, build()));
    assert.strictEqual(closed.passed, false);
    assert.strictEqual(closed.res.statusCode, 401);

    const opened = withEnv({ corsAllowOrigin: H5_ORIGIN, ALLOW_ANONYMOUS_H5: 'true' },
        () => run(h5SecurityMiddleware, build()));
    assert.strictEqual(opened.passed, true, '显式开关打开后才允许匿名（本地联调用）');
});

test('⚠️ H5：默认不采信 body.payer.openid（客户端可伪造）', () => {
    const req = mockReq({
        headers: { origin: H5_ORIGIN },
        body: { payer: { openid: 'o_forged_openid_1234' } },
        path: '/wxpay_order_h5',
    });
    const { passed } = withEnv({ corsAllowOrigin: H5_ORIGIN }, () => run(h5SecurityMiddleware, req));
    assert.strictEqual(passed, false, '没有登录态就必须 401，不能拿 body 里的 openid 当身份');
});

test('H5：ALLOW_BODY_OPENID=true + 已配 Origin 白名单 才允许 body 回退', () => {
    const build = () => mockReq({
        headers: { origin: H5_ORIGIN },
        body: { payer: { openid: 'o_h5_openid_123456' } },
        path: '/wxpay_order_h5',
    });

    const opened = withEnv(
        { corsAllowOrigin: H5_ORIGIN, ALLOW_BODY_OPENID: 'true' },
        () => run(h5SecurityMiddleware, build())
    );
    assert.strictEqual(opened.passed, true);

    const closed = withEnv(
        { corsAllowOrigin: H5_ORIGIN, ALLOW_BODY_OPENID: undefined },
        () => run(h5SecurityMiddleware, build())
    );
    assert.strictEqual(closed.passed, false, '默认关闭：body.openid 不能作为身份来源');
});

// ========== getOpenId ==========

test('getOpenId：默认不采信 body.payer.openid（客户端可伪造）', () => {
    const req = mockReq({ body: { payer: { openid: 'o_forged_openid_1234' } } });
    assert.strictEqual(getOpenId(req), null);
});

test('getOpenId：body 回退需要显式开关 ALLOW_BODY_OPENID + corsAllowOrigin', () => {
    const build = () => {
        const req = mockReq({ body: { payer: { openid: 'o_h5_openid_123456' } } });
        req.allowBodyOpenid = true;
        return req;
    };

    const opened = withEnv({ ALLOW_BODY_OPENID: 'true', corsAllowOrigin: H5_ORIGIN }, () => getOpenId(build()));
    assert.strictEqual(opened, 'o_h5_openid_123456');

    const closed = withEnv({ ALLOW_BODY_OPENID: undefined, corsAllowOrigin: H5_ORIGIN }, () => getOpenId(build()));
    assert.strictEqual(closed, null, '只置 allowBodyOpenid 不够，必须显式开环境变量');
});

test('getOpenId：中间件放行后必能取到身份（契约一致）', () => {
    const req = mockReq({ headers: { authorization: bearer({ provider_sub: 'o_from_jwt_123456' }) } });
    run(payMiddleware, req);
    assert.strictEqual(getOpenId(req), 'o_from_jwt_123456');
});
