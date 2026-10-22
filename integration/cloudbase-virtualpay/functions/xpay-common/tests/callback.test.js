const test = require('node:test');
const assert = require('node:assert');

// 用集成中心注入的变量名（appKey / secret），与线上保持一致
process.env.offerId = 'test_offer_123';
process.env.appKey = 'test_app_key_abcdef';
process.env.appId = 'wx_test_appid';
process.env.secret = 'test_secret';

const XpayService = require('../services/xpayService');
const {
    MAX_TRACKED_EVENTS,
    MAX_TRACKED_ORDERS,
    GOODS_MISSING_STATE,
    parseQuantity,
    checkOrderOwnership,
} = require('../services/xpayService');

function svc() {
    // 每个用例独立实例：幂等集合是实例级的
    return new XpayService();
}

function makeEvent(event, outTradeNo, extra = {}) {
    return {
        ToUserName: 'gh_test',
        FromUserName: 'o_official',
        CreateTime: '1760000000',
        MsgType: 'event',
        Event: event,
        OpenId: 'o_user_001',
        OutTradeNo: outTradeNo,
        Env: 0,
        // 默认带发货信息：真实推送里发货事件一定带 GoodsInfo
        GoodsInfo: { ProductId: 'goods_default', Quantity: 1 },
        ...extra,
    };
}

test('发货事件：解析为 deliver 语义并更新订单状态', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'ORDER20261014001'));

    assert.strictEqual(result.biz, 'deliver');
    assert.strictEqual(result.outTradeNo, 'ORDER20261014001');
    assert.strictEqual(result.openid, 'o_user_001');
});

// ---------- 发货字段（官方口径：GoodsInfo.ProductId / GoodsInfo.Quantity） ----------
//
// 只拿到 outTradeNo 无法发货：不知道发哪件道具、发几个。

test('发货字段：JSON 推送的嵌套 GoodsInfo 被正确解析', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'GOODS20261020001', {
        GoodsInfo: { ProductId: 'goods_001', Quantity: 3 },
    }));

    assert.strictEqual(result.goods.productId, 'goods_001');
    assert.strictEqual(result.goods.quantity, 3);
});

test('发货字段：XML 推送平铺到顶层的 ProductId / Quantity 也要认', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'GOODS20261020002', {
        // XML 形态：没有嵌套 GoodsInfo，字段被平铺到顶层
        GoodsInfo: {},
        ProductId: 'goods_002',
        Quantity: '2',
    }));

    assert.strictEqual(result.goods.productId, 'goods_002');
    assert.strictEqual(result.goods.quantity, 2, '字符串数量要转成数字');
});

test('发货字段：数量字段缺失时按 1 发放，并在返回体里标记待对账', async () => {
    const s = svc();
    const noQty = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'GOODS20261020003', {
        GoodsInfo: { ProductId: 'goods_001' },
    }));

    assert.strictEqual(noQty.goods.quantity, 1, '字段完全缺失时按 1 兜底');
    assert.strictEqual(noQty.goodsValid, false, '必须让业务侧知道数量是兜底来的');
    assert.deepStrictEqual(noQty.missingFields, ['Quantity']);
});

test('⚠️ 发货字段：数量非法时抛错（不能静默改成 1 造成少发货资损）', async () => {
    const s = svc();
    const badCases = ['abc', '2 个', 1.5, 0, -3, {}];

    for (const raw of badCases) {
        await assert.rejects(
            () => s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'GOODS20261020004', {
                GoodsInfo: { ProductId: 'goods_001', Quantity: raw },
            })),
            (err) => {
                assert.ok(/Quantity 非法/.test(err.message), `Quantity=${JSON.stringify(raw)} 应被拒绝`);
                assert.strictEqual(err.nonRetryable, undefined, '形态问题交给微信重推，不是结构性错误');
                return true;
            }
        );
    }
});

test('⚠️ 发货字段：缺少 ProductId 时抛 nonRetryable，并标记异常订单待对账', async () => {
    const s = svc();
    const tradeNo = 'NOPRODUCT20261020001';

    await assert.rejects(
        () => s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo, {
            GoodsInfo: { Quantity: 2 },
        })),
        (err) => {
            assert.strictEqual(err.nonRetryable, true, '重推也补不上字段，不要刷 15 次');
            assert.deepStrictEqual(err.missingFields, ['ProductId']);
            return true;
        }
    );

    // 必须留下「钱收了、货没发」的痕迹，供对账任务扫描
    assert.strictEqual(s.orders.get(tradeNo)?.state, GOODS_MISSING_STATE);
});

test('退款事件：商品信息缺失也要更新状态，但标记 missingFields 供对账', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('xpay_refund_notify', 'REFUND20261020001', {
        GoodsInfo: {},
    }));

    // 退款状态必须流转（钱已退、订单还写着已发货 = 更大资损）
    assert.strictEqual(result.biz, 'refund');
    assert.strictEqual(s.orders.get('REFUND20261020001')?.state, 'REFUNDED');
    // 但「回收了什么」不知道，要留痕
    assert.strictEqual(result.goodsValid, false);
    assert.deepStrictEqual(result.missingFields, ['ProductId', 'Quantity']);
});

// 代币 / 退款事件此前对「Quantity 非法」完全漏判：missingFields 只记缺失、不记非法，
// 于是 missingFields 为空 → 既不记 error 日志也不抛错，末尾又被 `valid ? value : 1`
// 静默改成 1，还对外宣称 goodsValid: true（对账扫不到，微信也不重推）。
test('⚠️ 退款事件：Quantity 非法时不能静默按 1 回收，须标记 goodsValid=false 供对账', async () => {
    const s = svc();
    const tradeNo = 'REFUND20261020002';
    const result = await s.handleCallback(makeEvent('xpay_refund_notify', tradeNo, {
        GoodsInfo: { ProductId: 'goods_001', Quantity: 1.5 },
    }));

    // 退款状态必须照常流转（钱已退、订单还写着已发货 = 更大资损）
    assert.strictEqual(s.orders.get(tradeNo)?.state, 'REFUNDED');
    // 但数量不可信：绝不能静默按 1 回收
    assert.strictEqual(result.goods.quantity, null, '非法数量必须显式为 null，不能兜底成 1');
    assert.strictEqual(result.goodsValid, false, '必须让对账任务扫到');
    assert.deepStrictEqual(result.missingFields, ['Quantity']);
});

test('⚠️ 代币事件：Quantity 非法时不能静默入账 1 个代币', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('xpay_coin_pay_notify', 'COIN20261020002', {
        GoodsInfo: { ProductId: 'coin_pack_001', Quantity: '2 个' },
    }));

    assert.strictEqual(s.orders.get('COIN20261020002')?.state, 'COIN_PAID');
    assert.strictEqual(result.goods.quantity, null);
    assert.strictEqual(result.goodsValid, false);
    assert.deepStrictEqual(result.missingFields, ['Quantity']);
});

test('parseQuantity：区分缺失与非法', () => {
    assert.deepStrictEqual(parseQuantity(undefined), { value: 1, valid: true, missing: true });
    assert.deepStrictEqual(parseQuantity(''), { value: 1, valid: true, missing: true });
    assert.deepStrictEqual(parseQuantity('5'), { value: 5, valid: true, missing: false });
    assert.deepStrictEqual(parseQuantity(0), { value: null, valid: false, missing: false });
    assert.deepStrictEqual(parseQuantity(1.5), { value: null, valid: false, missing: false });
    assert.deepStrictEqual(parseQuantity('abc'), { value: null, valid: false, missing: false });
});

test('发货字段：attach 原样透传（下单时传入的业务数据）', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'GOODS20261020005', {
        GoodsInfo: { ProductId: 'goods_001', Quantity: 1 },
        Attach: 'uid=123',
    }));

    assert.strictEqual(result.goods.attach, 'uid=123');
});

test('幂等：同一 OutTradeNo 重复投递被忽略', async () => {
    const s = svc();
    const body = makeEvent('xpay_goods_deliver_notify', 'DUP20261014001');

    const first = await s.handleCallback(body);
    const second = await s.handleCallback(body);

    assert.strictEqual(first.duplicated, undefined);
    assert.strictEqual(second.duplicated, true);
});

test('⚠️ 幂等：以平台单号 wx_order_id 为准（同一 outTradeNo 不同平台单号不算重复）', async () => {
    const s = svc();
    const tradeNo = 'SAME20261014001';

    const first = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo, {
        WeChatPayInfo: { MchOrderNo: 'WXORDER001' },
    }));
    const second = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo, {
        WeChatPayInfo: { MchOrderNo: 'WXORDER002' },
    }));

    assert.strictEqual(first.duplicated, undefined);
    assert.strictEqual(second.duplicated, undefined,
        '同一 outTradeNo 但平台单号不同 = 两笔真实交易，不能去重');
});

test('幂等：平台单号相同时必须去重', async () => {
    const s = svc();
    const body = makeEvent('xpay_goods_deliver_notify', 'WXONLY20261014001', {
        WeChatPayInfo: { MchOrderNo: 'WXORDER_SAME' },
    });

    const first = await s.handleCallback(body);
    const second = await s.handleCallback(body);

    assert.strictEqual(first.duplicated, undefined);
    assert.strictEqual(second.duplicated, true);
});

test('幂等：XML 解析后平台单号被平铺成 MchOrderNo 时也能取到', async () => {
    const s = svc();
    // xmlToObject 只做一层提取，<WeChatPayInfo> 内的 <MchOrderNo> 会被平铺到顶层
    const body = makeEvent('xpay_goods_deliver_notify', 'FLAT20261014001', {
        MchOrderNo: 'WXORDER_FLAT',
    });

    const first = await s.handleCallback(body);
    const second = await s.handleCallback({ ...body });

    assert.strictEqual(first.wxOrderId, 'WXORDER_FLAT');
    assert.strictEqual(second.duplicated, true);
});

test('幂等：没有平台单号时回退用 OutTradeNo', async () => {
    const s = svc();
    const body = makeEvent('xpay_goods_deliver_notify', 'FALLBACK20261014001');

    const first = await s.handleCallback(body);
    const second = await s.handleCallback(body);

    assert.strictEqual(first.wxOrderId, undefined);
    assert.strictEqual(second.duplicated, true);
});

test('⚠️ 幂等标记在业务处理成功后才写入（失败不应留下标记）', async () => {
    const s = svc();
    const tradeNo = 'RETRY20261014001';

    // 模拟业务处理失败
    const origin = s._updateOrderState.bind(s);
    s._updateOrderState = () => { throw new Error('模拟发货失败'); };

    await assert.rejects(
        () => s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo)),
        /模拟发货失败/
    );

    // 幂等键 = 事件类型 + 单号（同一单号的不同事件不能互相吞并）
    const idemKey = `xpay_goods_deliver_notify|${tradeNo}`;

    // 关键：失败后不能留下幂等标记，否则微信重推会被当作重复事件丢弃 → 永久丢单
    assert.strictEqual(
        s.processedEvents.has(idemKey), false,
        '业务失败时不应写入幂等标记'
    );

    // 恢复后重推应当能正常处理
    s._updateOrderState = origin;
    const retry = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo));
    assert.strictEqual(retry.duplicated, undefined, '重推应被正常处理而非判定重复');
    assert.strictEqual(s.processedEvents.has(idemKey), true, '成功后应写入标记');
});

// 发货与退款带的是同一个单号，只用单号做 key 会让退款被当作重复事件丢弃
test('同一订单的退款事件不会被发货事件吞并', async () => {
    const s = svc();
    const tradeNo = 'MIXED20261014001';

    const deliver = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo));
    assert.strictEqual(deliver.biz, 'deliver');

    const refund = await s.handleCallback(makeEvent('xpay_refund_notify', tradeNo));
    assert.strictEqual(refund.duplicated, undefined, '退款事件必须被正常处理');
    assert.strictEqual(refund.biz, 'refund');

    // 同一事件重复推送仍要去重
    const again = await s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo));
    assert.strictEqual(again.duplicated, true, '同类型事件重复推送应去重');
});

// 回调路径兜底创建的订单记录必须带 openid：否则「记录存在但归属为空」，
// checkOrderOwnership 无法判断归属 → 他人可用该单号查单（越权读）
test('⚠️ 回调创建的订单记录必须带 openid，供归属校验', async () => {
    const s = svc();
    const tradeNo = 'OWNER20261020001';

    await s.handleCallback(makeEvent('xpay_goods_deliver_notify', tradeNo));

    assert.strictEqual(s.orders.get(tradeNo)?.openid, 'o_user_001', '推送里的 OpenId 必须写入归属');
    assert.strictEqual(
        checkOrderOwnership(s.orders.get(tradeNo), 'o_other_user'),
        '订单不属于当前用户'
    );
});

// Map.set 对已存在的 key 只更新值、不改变迭代顺序 —— 若按「首次插入」淘汰，
// 被 _updateOrderState 更新的活跃订单会一直停在迭代首位，
// 淘汰时删掉的正是「已支付、正在等回调」的订单，连带丢掉 openid 归属与退款决策依据。
test('⚠️ 容量淘汰按「最近更新」而非「首次插入」：活跃订单不得被淘汰', () => {
    const s = svc();
    const active = 'ACTIVE20261020001';

    s._trackOrder(active, { outTradeNo: active, openid: 'o_user_001', state: 'PAID' });

    let i = 0;
    while (s.orders.size < MAX_TRACKED_ORDERS) {
        i += 1;
        s._trackOrder(`FILL${i}`, { outTradeNo: `FILL${i}` });
    }

    // 回调路径：_updateOrderState → _trackOrder（对已存在的 key 再次 set）
    s._updateOrderState(active, 'DELIVERED', 'o_user_001');

    // 再记一单触发淘汰
    s._trackOrder('NEW20261020001', { outTradeNo: 'NEW20261020001' });

    assert.ok(
        s.orders.has(active),
        '刚更新的活跃订单不应被淘汰：淘汰必须针对最久未更新的订单'
    );
    assert.ok(
        !s.orders.has('FILL1'),
        '被淘汰的应当是最久未更新的 FILL1，而非刚更新的活跃订单'
    );
});

test('代币支付 / 退款事件分发正确', async () => {
    const s = svc();
    const coin = await s.handleCallback(makeEvent('xpay_coin_pay_notify', 'COIN20261014001'));
    const refund = await s.handleCallback(makeEvent('xpay_refund_notify', 'REFUND20261014001'));

    assert.strictEqual(coin.biz, 'coin');
    assert.strictEqual(refund.biz, 'refund');
});

test('投诉 / 风控事件不参与幂等去重（可多次记录）', async () => {
    const s = svc();
    const body = makeEvent('xpay_complaint_notify', 'CPL20261014001');

    const first = await s.handleCallback(body);
    const second = await s.handleCallback(body);

    assert.strictEqual(first.biz, 'complaint');
    assert.strictEqual(second.duplicated, undefined);
});

test('⛔ iOS 退款问询：本地查不到订单默认拦截（result_code=1）', async () => {
    const s = svc();
    const result = await s.handleCallback(
        makeEvent('xpay_subscribe_ios_refund_query_notify', 'IOS20261014001')
    );

    assert.ok(result.iosRefundQueryResponse, 'iOS 退款问询必须带 IosRefundQueryResponse');

    const resp = result.iosRefundQueryResponse;
    // 云函数冷启动后 orders 必为空，按「未发货」放过 = 默认放过已发货订单
    assert.strictEqual(resp.result_code, 1, '查不到记录必须拦截，不能默认放过');
    assert.ok(resp.result_info);
    assert.ok(resp.evidence, 'evidence 必填，用于退款审计');
});

test('XPAY_GUARD=off 时才放过无记录订单（仅联调，与查单同一个开关）', async () => {
    process.env.XPAY_GUARD = 'off';
    try {
        const s = svc();
        const result = await s.handleCallback(
            makeEvent('xpay_subscribe_ios_refund_query_notify', 'IOS20261014003')
        );
        assert.strictEqual(result.iosRefundQueryResponse.result_code, 0);
    } finally {
        delete process.env.XPAY_GUARD;
    }
});

test('iOS 退款问询：已发货订单应拦截（result_code=1）', async () => {
    const s = svc();
    // 先模拟已发货
    await s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'IOS20261014002'));

    const result = await s.handleCallback(
        makeEvent('xpay_subscribe_ios_refund_query_notify', 'IOS20261014002')
    );

    assert.strictEqual(result.iosRefundQueryResponse.result_code, 1);
});

test('⛔ iOS 退款问询：GOODS_MISSING（钱已收、货未发）必须拦截', async () => {
    const s = svc();
    // 发货事件缺 ProductId → 落 GOODS_MISSING（对账异常单）并显式抛错（让微信重推），
    // 但钱已经收了：状态已写入，退款问询必须能读到
    await assert.rejects(
        () => s.handleCallback(makeEvent('xpay_goods_deliver_notify', 'IOS20261014009', {
            GoodsInfo: { Quantity: 1 },
        })),
        /ProductId/
    );

    const result = await s.handleCallback(
        makeEvent('xpay_subscribe_ios_refund_query_notify', 'IOS20261014009')
    );

    const resp = result.iosRefundQueryResponse;
    assert.strictEqual(resp.result_code, 1, '钱已收、货未发不能建议退款（退款 + 未发货双重损失）');
    assert.match(resp.evidence, /GOODS_MISSING/);
});

test('未订阅的事件被忽略', async () => {
    const s = svc();
    const result = await s.handleCallback(makeEvent('some_unknown_event', 'X20261014001'));
    assert.strictEqual(result.ignored, true);
});

test('缺少 Event 字段：抛 nonRetryable 错误（重推无意义）', async () => {
    const s = svc();

    await assert.rejects(
        () => s.handleCallback({ OutTradeNo: 'X20261014001' }),
        (err) => {
            assert.strictEqual(err.nonRetryable, true, '应标记为不可重试');
            return true;
        }
    );
});

test('网关把明文放在 ParsedContent 时也能正确解析', async () => {
    const s = svc();
    const result = await s.handleCallback({
        ParsedContent: makeEvent('xpay_goods_deliver_notify', 'GW20261014001'),
    });
    assert.strictEqual(result.biz, 'deliver');
    assert.strictEqual(result.outTradeNo, 'GW20261014001');
});

test('内存追踪有容量上限：超限后淘汰最早记录且不无限增长', async () => {
    const s = svc();

    // 写入超过上限的量
    for (let i = 0; i < MAX_TRACKED_EVENTS + 50; i++) {
        s._markProcessed(`EVT${i}`);
    }

    assert.strictEqual(s.processedEvents.size, MAX_TRACKED_EVENTS, '不应超过上限');
    assert.strictEqual(s.processedEvents.has('EVT0'), false, '最早的记录应被淘汰');
    assert.strictEqual(
        s.processedEvents.has(`EVT${MAX_TRACKED_EVENTS + 49}`), true,
        '最新的记录应保留'
    );
});

// Map.set 对已存在的 key 不改变迭代顺序：按插入顺序淘汰会把「刚更新过状态、
// 正在等回调」的活跃订单当成最旧的删掉，归属 openid 与 iOS 退款依据一起丢失
test('⚠️ 订单淘汰按最近访问：更新过的订单不能被当成最旧的淘汰', () => {
    const s = svc();
    s._trackOrder('KEEP001', { outTradeNo: 'KEEP001', state: 'PENDING' });
    for (let i = 0; i < MAX_TRACKED_ORDERS - 1; i++) {
        s._trackOrder(`FILL${i}`, { outTradeNo: `FILL${i}` });
    }

    // 模拟回调更新状态（应把它移到「最近访问」）
    s._updateOrderState('KEEP001', 'DELIVERED', 'o_user_001');

    // 再插一笔新订单，触发一次淘汰
    s._trackOrder('NEW001', { outTradeNo: 'NEW001' });

    assert.strictEqual(s.orders.size, MAX_TRACKED_ORDERS, '容量仍受上限约束');
    assert.ok(s.orders.has('KEEP001'), '刚更新过的订单不能被淘汰');
    assert.strictEqual(s.orders.get('KEEP001').openid, 'o_user_001', '归属信息不能丢');
});
