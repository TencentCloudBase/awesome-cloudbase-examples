/**
 * payMiddleware 鉴权口径测试
 *
 * 核心断言：**凡是客户端能自己填的东西，都不能作为放行依据**。
 * 覆盖三类曾经的假保护（伪造 header / 恒真环境变量），以及凭证内容的校验。
 */

const test = require('node:test');
const assert = require('node:assert');

// config 在模块加载时读 env：先给一份格式合法的假 sk，避免启动校验噪音
process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
process.env.notifyURLCallbackType = 'system';

const { payMiddleware } = require('../controllers/stripeController');
const { getUserEmail, normalizeEmail, isValidAuthPayload, pickSubject } = require('../utils/cloudbaseAuth');

// JWT 的 payload 段按规范是 base64url（无 padding、无 +/），生产链路也按 base64url 解码
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const bearer = (payload) => 'Bearer ' + [b64({ alg: 'HS256' }), b64(payload), 'sig'].join('.');
const future = () => Math.floor(Date.now() / 1000) + 3600;
const past = () => Math.floor(Date.now() / 1000) - 3600;

function mockReq({ headers = {}, method = 'POST', path = '/stripe/create_session' } = {}) {
    return { headers, method, path };
}

function mockRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function run(mw, req) {
    const res = mockRes();
    let passed = false;
    mw(req, res, () => { passed = true; });
    return { passed, res };
}

function withEnv(vars, fn) {
    const backup = {};
    for (const [k, v] of Object.entries(vars)) {
        backup[k] = process.env[k];
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    try {
        return fn();
    } finally {
        for (const [k, v] of Object.entries(backup)) {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        }
    }
}

// ========== 假保护：必须全部失效 ==========

test('⛔ 无任何凭证：401', () => {
    const { passed, res } = run(payMiddleware, mockReq());
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('⛔ 伪造 x-tcb-integration-id：401（自定义 header 客户端随便加）', () => {
    const { passed } = run(payMiddleware, mockReq({ headers: { 'x-tcb-integration-id': 'anything' } }));
    assert.strictEqual(passed, false);
});

test('⛔ 伪造 x-wx-source: wx_devtools：401', () => {
    const { passed } = run(payMiddleware, mockReq({ headers: { 'x-wx-source': 'wx_devtools' } }));
    assert.strictEqual(passed, false);
});

test('⛔ 伪造 x-authmethod: WX_SERVER_AUTH：401', () => {
    const { passed } = run(payMiddleware, mockReq({ headers: { 'x-authmethod': 'WX_SERVER_AUTH' } }));
    assert.strictEqual(passed, false);
});

// 🚨 曾是「优先级最高的可信来源」：只有 10-64 位字符的格式校验，没有任何来源证明。
//    只要函数存在公网直连路径，curl -H 'x-wx-openid: attacker001' 就能以他人身份下单，
//    与上面被删除的伪造 header 强度等价 —— 本模板统一只认 Bearer JWT。
test('⛔ 伪造 x-wx-openid（合法格式）：401，格式校验不是来源证明', () => {
    const req = mockReq({ headers: { 'x-wx-openid': 'o_platform_user_001' } });
    const { passed, res } = run(payMiddleware, req);
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(req.user, undefined, '不得把可伪造 header 当身份挂载');
});

test('⛔ 云函数运行时环境变量存在时仍然 401（原来该分支恒命中 = 无条件放行）', () => {
    const { passed } = withEnv(
        { TENCENTCLOUD_RUNENV: 'SCF', SCF_RUNTIME: 'Nodejs18.15' },
        () => run(payMiddleware, mockReq())
    );
    assert.strictEqual(passed, false, '云函数里恒存在的变量不能当鉴权依据');
});

// ========== 可信来源：网关注入的已认证身份 ==========
// 2026-11-05 实测：客户端伪造 x-userid / x-usertype / x-administrator 会被网关覆盖，
// 未认证请求拿到的是 x-userid=null + x-authmethod=UNAUTHORIZED。

test('✅ 网关鉴权通过（x-userid + x-authmethod≠UNAUTHORIZED）：放行并挂载 uid', () => {
    const req = mockReq({
        headers: { 'x-userid': 'uid_123456', 'x-authmethod': 'JWT' },
    });
    const { passed } = run(payMiddleware, req);
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.uid, 'uid_123456');
    assert.strictEqual(req.user.source, 'gateway');
});

// 🚨 这就是之前的鉴权绕过：函数侧只 base64 解码 payload，不验签名，
//    伪造 x.<自己拼的payload>.y 就能冒用任意 uid。现在只认网关注入的身份头。
test('⛔ 只有伪造的 Bearer JWT、没有网关身份头：401', () => {
    const req = mockReq({
        headers: { authorization: bearer({ sub: 'attacker001', exp: future() }) },
    });
    const { passed, res } = run(payMiddleware, req);
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(req.user, undefined);
});

test('⛔ x-userid 存在但 x-authmethod=UNAUTHORIZED（回调入口/未认证）：401', () => {
    const req = mockReq({
        headers: { 'x-userid': 'attacker001', 'x-authmethod': 'UNAUTHORIZED' },
    });
    const { passed, res } = run(payMiddleware, req);
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
});

test('⛔ 只有 x-userid、缺 x-authmethod：401（缺判据时 fail closed）', () => {
    const { passed } = run(payMiddleware, mockReq({ headers: { 'x-userid': 'uid_123456' } }));
    assert.strictEqual(passed, false);
});

// ========== 凭证内容校验 ==========

test('⛔ 空 payload（Bearer a.<base64("{}")>.b）：401，不能靠拼串绕过', () => {
    const { passed } = run(payMiddleware, mockReq({ headers: { authorization: bearer({}) } }));
    assert.strictEqual(passed, false);
});

test('⛔ exp 已过期：401，且提示可区分（不是「未授权」笼统文案）', () => {
    const { passed, res } = run(payMiddleware, mockReq({
        headers: { authorization: bearer({ sub: 'uid_123456', exp: past() }) },
    }));
    assert.strictEqual(passed, false);
    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.msg, /已过期|无效/);
});

test('⛔ AUTH_EXPECTED_ISSUER 不匹配：401', () => {
    const { passed } = withEnv({ AUTH_EXPECTED_ISSUER: 'https://cloudbase.example' }, () =>
        run(payMiddleware, mockReq({
            headers: { authorization: bearer({ sub: 'uid_123456', exp: future(), iss: 'https://evil.example' }) },
        }))
    );
    assert.strictEqual(passed, false);
});

test('⛔ x-wx-openid 格式非法（过短）：401，不能当身份往下传', () => {
    const { passed } = run(payMiddleware, mockReq({ headers: { 'x-wx-openid': 'x' } }));
    assert.strictEqual(passed, false);
});

test('⛔ 只带 x-wx-openid 且开了 ALLOW_ANONYMOUS_DEV：放行但 uid=null（身份不被采信）', () => {
    const req = mockReq({ headers: { 'x-wx-openid': 'o_platform_user_001' } });
    const { passed } = withEnv({ ALLOW_ANONYMOUS_DEV: 'true' }, () => run(payMiddleware, req));
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.uid, null, 'header 里的 openid 不能变成用户身份');
    assert.strictEqual(req.user.source, 'anonymous-dev');
});

// ========== 显式联调开关 ==========

test('ALLOW_ANONYMOUS_DEV=true：放行，但 source 标记为 anonymous-dev', () => {
    const req = mockReq();
    const { passed } = withEnv({ ALLOW_ANONYMOUS_DEV: 'true' }, () => run(payMiddleware, req));
    assert.strictEqual(passed, true);
    assert.strictEqual(req.user.source, 'anonymous-dev');
    assert.strictEqual(req.user.uid, null);
});

test('ALLOW_ANONYMOUS_DEV 取其它值（如 1）不等于 true：仍 401', () => {
    const { passed } = withEnv({ ALLOW_ANONYMOUS_DEV: '1' }, () => run(payMiddleware, mockReq()));
    assert.strictEqual(passed, false);
});

// ========== exp 是强制字段 ==========
// 🚨 曾用 `if (payload.exp !== undefined)`，缺 exp 的 payload 跳过全部过期判断，
//    等于接受一张永不过期的身份凭证

test('⛔ JWT payload 缺少 exp：401（有 sub 也不能放行）', () => {
    const { passed } = run(payMiddleware, mockReq({
        headers: { authorization: bearer({ sub: 'uid_123456' }) },
    }));
    assert.strictEqual(passed, false);
});

test('isValidAuthPayload：sub / exp / iss 三者缺一不可', () => {
    const ISS = 'https://cloudbase.example';

    // 缺主体 / 缺 exp / 缺 iss 全部 fail closed
    assert.strictEqual(isValidAuthPayload({ exp: future(), iss: ISS }), false);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', iss: ISS }), false);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: future() }), false, '缺 iss 必须拒绝');
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: future(), iss: '   ' }), false);

    // 三者齐备才通过
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: future(), iss: ISS }), true);

    // exp 非法 / 过期仍然拒绝
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: 'abc', iss: ISS }), false);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: past(), iss: ISS }), false);
});

// ========== email 归一化 ==========
// 🚨 email 在 customer_email 的 EMAIL_RE 校验之后才回填，本身必须自带类型 + 格式 + 长度判断

test('normalizeEmail：非字符串 / 格式非法 / 超长一律 null，合法值 trim 后返回', () => {
    assert.strictEqual(normalizeEmail(['a@b.com']), null);
    assert.strictEqual(normalizeEmail({ email: 'a@b.com' }), null);
    assert.strictEqual(normalizeEmail(123), null);
    assert.strictEqual(normalizeEmail('not-an-email'), null);
    assert.strictEqual(normalizeEmail('a'.repeat(250) + '@b.com'), null);
    assert.strictEqual(normalizeEmail('  user@example.com  '), 'user@example.com');
});

test('getUserEmail：email 与 provider_email 都先归一化，脏值不回填', () => {
    const authed = (auth) => ({ user: { uid: 'uid_123456' }, cloudbaseAuth: auth });

    assert.strictEqual(getUserEmail(authed({ email: ['evil@b.com'] })), null);
    assert.strictEqual(getUserEmail(authed({ email: 'bad', provider_email: 'ok@example.com' })), 'ok@example.com');
    assert.strictEqual(getUserEmail(authed({ email: 'a@b.com' })), 'a@b.com');
});

test('⛔ 未通过网关鉴权时 getUserEmail 返回 null（自拼 Bearer 也拿不到邮箱）', () => {
    assert.strictEqual(getUserEmail({ cloudbaseAuth: { email: 'a@b.com' } }), null);
    assert.strictEqual(
        getUserEmail({ headers: { authorization: bearer({ sub: 'attacker', exp: future(), iss: 'x' }) } }),
        null
    );
});

// ========== payload 形态：类型守卫必须挡住隐式转换 ==========
// JWT payload 由客户端构造、本函数不验签，任何能被 Number() / String()
// 隐式转换的畸形类型都必须在校验入口拒绝（fail closed）。

test('⛔ exp 为数组 / 对象 / 布尔 / 非纯数字字符串：拒绝', () => {
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: [future()] }), false);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: { 0: future() } }), false);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: true }), false);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: '1e21' }), false);
});

test('✅ exp 为 number 或纯数字字符串：通过', () => {
    const ISS = 'https://cloudbase.example';
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: future(), iss: ISS }), true);
    assert.strictEqual(isValidAuthPayload({ sub: 'uid_123456', exp: String(future()), iss: ISS }), true);
});

test('⛔ sub 为数字 / 数组 / 对象：拒绝，不允许 String() 后当 uid', () => {
    assert.strictEqual(pickSubject({ sub: 12345678901234567890 }), null);
    assert.strictEqual(pickSubject({ sub: 1e21 }), null);
    assert.strictEqual(pickSubject({ sub: ['uid_123456'] }), null);
    assert.strictEqual(pickSubject({ sub: { uid: 'uid_123456' } }), null);
    assert.strictEqual(pickSubject({ sub: '  uid_123456  ' }), 'uid_123456');
    assert.strictEqual(isValidAuthPayload({ sub: 12345678901234567890, exp: future() }), false);
});
