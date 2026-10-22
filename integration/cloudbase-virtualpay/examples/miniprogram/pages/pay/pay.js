// pages/pay/pay.js
const app = getApp();

// 道具直购固定值；代币充值为 short_series_coin
// ⚠️ 个人主体小程序不开放代币充值（仅支持道具直购），代币路径仅企业 / 个体户主体可用
const MODE_GOODS = 'short_series_goods';
const MODE_COIN = 'short_series_coin';

/**
 * ⚠️ 示例道具清单
 * productId 与 goodsPrice（单位：分）必须与 MP 后台「虚拟支付 → 道具管理」配置完全一致，
 * 否则下单会报「道具 ID / 价格校验失败」。
 *
 * 🚨 生产环境中商品与价格必须从后端数据库查询，严禁使用前端传值 ——
 *    攻击者可篡改请求把价格改成 1 分。
 */
const PRODUCTS = [
  // ⚠️ 下面三条是本项目联调用的真实道具，clone 本项目的人必须换成自己后台的道具
  //    id / price 必须与 MP 后台「虚拟支付 → 道具管理」线上版本完全一致，price 单位是「分」
  //    写错 id → PRODUCT_ID_NOT_PUBLISH；写错 price → 价格校验失败
  { id: 'goods_001', name: '高级会员月卡', price: 100 },
  { id: 'goods_002', name: '加速卡10张', price: 200 },
  { id: 'goods_003', name: '尊贵标识永久', price: 300 },
];

/**
 * requestVirtualPayment 失败归因表：错误码 → 可执行建议（命中第一条即停）
 *
 * ⚠️ 关键：所有失败都带 `requestVirtualPayment:fail` 前缀（API 名 + fail），
 *    按前缀匹配会把所有错误塞进同一个「万能可能原因」里，等于没有归因。
 *    必须按后面的**具体错误码**匹配。
 */
const PAY_FAIL_HINTS = [
  ['cancel', '用户取消支付（不是故障，不需要改配置）'],
  ['PRODUCT_ID_NOT_PUBLISH', '道具未发布或不属于当前 offerId → MP 后台「虚拟支付 → 道具管理」确认「线上版本」已发布'],
  ['COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY', '道具刚创建/发布，平台仍在同步 → 等 5–30 分钟再试'],
  ['尚未开启 iOS 支付', 'iOS 支付能力未开通 → MP 后台开通 iOS 支付 + 配置小程序简称'],
  ['暂不支持iOS', 'iOS 支付能力未开通 → 同上'],
  ['APP_NOT_AUTHORIZED', '小程序未授权虚拟支付 → MP 后台确认已签约'],
  ['signature', '用户态签名不一致 → 检查 signature 是否用当前用户 sessionKey 计算'],
  ['pay_sig', '支付签名不一致 → 检查 signData 原文、uri（C 端固定 requestVirtualPayment）、AppKey 与 env 是否匹配'],
];

/** 版本号比较：v1 > v2 返回 1 */
function compareVersion(v1, v2) {
  const a = String(v1).split('.').map(Number);
  const b = String(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** 运行环境信息（新 API 优先，兼容旧基础库） */
function getEnvInfo() {
  const base = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
  const device = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
  return {
    platform: device.platform || '',       // ios / android / devtools
    wxVersion: base.version || '',         // 微信版本号，如 8.0.68
    sdkVersion: base.SDKVersion || '',     // 基础库版本
  };
}

/**
 * 通过 wx.cloud.callHTTPFunction 调用 xpay-common 云函数
 * 平台自动鉴权并注入 x-wx-openid，无需 accessToken
 */
function callXpay(action, data) {
  const { functionName, envId } = app.globalData;

  // 每次调用都打出来：日志落在哪个环境，以此为准（比在控制台翻环境可靠）
  console.log('[xpay] callHTTPFunction →', { env: envId, functionName, action });

  return new Promise((resolve, reject) => {
    wx.cloud.callHTTPFunction({
      name: functionName,
      config: { env: envId },
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      path: `/xpay/${action}`,
      data,
      success(res) {
        // callHTTPFunction 部分场景下 data 是字符串，需容错解析。
        // ⚠️ 解析必须 try/catch：网关错误页 / 空串会让 JSON.parse 在 success 回调里同步抛错，
        //    这个异常既不会进 fail 回调，也不会被外层 try/catch 捕获 → Promise 永久挂起、
        //    loading 卡在 true，页面彻底点不动
        if (typeof res.data !== 'string') {
          return resolve(res.data);
        }
        try {
          resolve(JSON.parse(res.data));
        } catch (err) {
          reject(new Error(`响应解析失败：${res.data.slice(0, 100)}`));
        }
      },
      fail(err) {
        console.error('[xpay] 请求失败:', err);
        reject(err);
      },
    });
  });
}

/** wx.login → code（一次性，下单与查单都要重新取） */
function loginOnce() {
  return new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
  });
}

/** 拉起虚拟支付收银台 */
function launchVirtualPayment(payData) {
  return new Promise((resolve, reject) => {
    wx.requestVirtualPayment({
      signData: payData.signData,
      mode: payData.mode,
      paySig: payData.paySig,
      signature: payData.signature,
      success: resolve,
      fail: reject,
    });
  });
}

Page({
  data: {
    products: PRODUCTS,
    productIndex: 0,
    buyQuantity: 1,
    mode: MODE_GOODS,
    modeLabel: '道具直购',

    outTradeNo: '',
    result: '',
    loading: false,

    // 环境提示
    envTip: '',
    isIOS: false,
  },

  onLoad() {
    const env = getEnvInfo();
    const isIOS = env.platform === 'ios';

    const tips = [`微信 ${env.wxVersion || '未知'} / 基础库 ${env.sdkVersion || '未知'}`];

    // 基础库要求：requestVirtualPayment ≥ 2.19.2；callHTTPFunction ≥ 3.15.2
    if (compareVersion(env.sdkVersion, '3.15.2') < 0) {
      tips.push('⚠️ 基础库低于 3.15.2，callHTTPFunction 不可用');
    }
    if (isIOS) {
      // iOS 端需 iOS 15+、微信 ≥ 8.0.68、已开通 IAP；且 Apple 支付最低金额 1 元
      if (compareVersion(env.wxVersion, '8.0.68') < 0) {
        tips.push('⚠️ iOS 支付需微信 8.0.68 及以上');
      } else {
        tips.push('ℹ️ iOS 端走 Apple IAP，退款需用户在 App Store 申请');
        tips.push('⚠️ Apple 支付最低金额 1 元：低于 1 元的道具档位在 iOS 上无法支付');
      }
    }

    this.setData({
      isIOS,
      envTip: tips.join('\n'),
    });
  },

  onProductChange(e) {
    // 越界会取到 undefined，后面解引用 product.price 直接抛 TypeError
    const index = Number(e.detail.value);
    if (!Number.isInteger(index) || index < 0 || index >= PRODUCTS.length) {
      return;
    }
    this.setData({ productIndex: index });
  },

  onQuantityInput(e) {
    this.setData({ buyQuantity: Math.max(1, parseInt(e.detail.value, 10) || 1) });
  },

  onModeChange(e) {
    const isCoin = e.detail.value === 'coin';
    this.setData({
      mode: isCoin ? MODE_COIN : MODE_GOODS,
      modeLabel: isCoin ? '代币充值' : '道具直购',
    });
  },

  // ========== 下单 + 拉起支付 ==========
  async handlePay() {
    if (this.data.loading) return;
    this.setData({ loading: true, result: '准备中...' });

    try {
      // 1️⃣ wx.login 拿 code：服务端要用它换 sessionKey 计算 signature
      wx.showLoading({ title: '登录中...' });
      const loginRes = await loginOnce();
      if (!loginRes.code) throw new Error('wx.login 未返回 code');
      wx.hideLoading();

      // 2️⃣ 请求服务端下单（服务端只出签名，不下单）
      this.setData({ result: '生成支付参数中...' });
      const product = PRODUCTS[this.data.productIndex];
      if (!product) throw new Error('商品选择无效，请重新选择');

      const isCoin = this.data.mode === MODE_COIN;

      // 🚨 Apple 支付最低金额 1 元（100 分）：低价档位在 iOS 上必然失败，提前拦掉
      if (this.data.isIOS && !isCoin && product.price < 100) {
        throw new Error(
          `iOS 端 Apple 支付最低 1 元，当前档位 ¥${(product.price / 100).toFixed(2)} 不可支付。\n`
          + '请改用安卓/鸿蒙/Windows 测试，或把该道具价格调到 ≥ 1 元'
        );
      }

      const orderRes = await callXpay('create_order', {
        code: loginRes.code,
        // 🚨 演示用：真实场景 productId / goodsPrice 必须由后端根据前端传的 SKU 查出
        productId: isCoin ? undefined : product.id,
        goodsPrice: isCoin ? undefined : product.price,
        buyQuantity: Number(this.data.buyQuantity),
        mode: isCoin ? 'coin' : 'goods',
      });

      if (orderRes.code !== 0) {
        throw new Error(orderRes.msg || '下单失败');
      }

      const payData = orderRes.data || {};
      this.setData({ outTradeNo: payData.outTradeNo });

      // 3️⃣ 客户端自行拉起收银台（基础库内部完成下单，服务端不参与）
      this.setData({
        result: `已获取支付参数：\n业务单号：${payData.outTradeNo}\nmode：${payData.mode}\n\n拉起收银台中...`,
      });

      await launchVirtualPayment(payData);

      this.setData({
        result: `✅ 支付完成\n业务单号：${payData.outTradeNo}\n\n⚠️ 前端 success 不作为发货依据，请以服务端发货推送为准，点击「查询订单」确认。`,
      });
      wx.showToast({ title: '支付成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      console.error('[xpay] 支付失败:', err);

      // ⚠️ 保留原始 errMsg（含错误码和 rid），只在后面追加精确建议 ——
      //    别用「道具未发布 / 价格不一致 / iOS 未开通」这种万能猜测覆盖掉真因
      const raw = err.errMsg || err.message || JSON.stringify(err);
      const hit = PAY_FAIL_HINTS.find(([code]) => raw.includes(code));

      // 三条路径都要有反馈：命中 cancel → toast；
      // 命中其他错误码 / 未命中 → modal（带建议）。旧实现漏了「命中非 cancel」这条，
      // 恰恰是最需要引导的那批错误码反而没有弹窗
      if (hit && hit[0] === 'cancel') {
        wx.showToast({ title: '已取消', icon: 'none' });
      } else {
        wx.showModal({
          title: '支付失败',
          content: hit ? `${raw}\n\n👉 ${hit[1]}` : String(raw),
          showCancel: false,
        });
      }

      this.setData({
        result: hit ? `❌ 失败：\n${raw}\n\n👉 ${hit[1]}` : `❌ 失败：\n${raw}`,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ========== 查单（发货兜底）==========
  async handleQuery() {
    if (!this.data.outTradeNo) {
      wx.showToast({ title: '请先下单', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '查询中...' });
    try {
      // code 是一次性的，查单需重新换取
      const loginRes = await loginOnce();
      // 与 handlePay 保持一致：没有 code 就别发请求，否则服务端换不到 sessionKey，
      // 报错会指向「签名错误」，掩盖真正的原因
      if (!loginRes.code) throw new Error('wx.login 未返回 code');

      const res = await callXpay('query_order', {
        code: loginRes.code,
        outTradeNo: this.data.outTradeNo,
      });

      wx.hideLoading();

      if (res.code !== 0) {
        throw new Error(res.msg || '查单失败');
      }

      this.setData({ result: `订单查询结果：\n${JSON.stringify(res.data, null, 2)}` });
    } catch (err) {
      wx.hideLoading();
      console.error('[xpay] 查单失败:', err);
      this.setData({ result: `查单失败：\n${err.errMsg || err.message || JSON.stringify(err)}` });
      wx.showModal({
        title: '查单失败',
        content: err.message || '请稍后重试',
        showCancel: false,
      });
    }
  },

  // ========== iOS 退款引导 ==========
  handleRefundGuide() {
    wx.showModal({
      title: 'iOS 退款说明',
      content: 'iOS 订单开发者无法主动退款。\n请前往 App Store → 购买记录 申请，Apple 审批通过后平台会推送退款事件。',
      showCancel: false,
    });
  },

  onCopyTradeNo() {
    if (!this.data.outTradeNo) return;
    wx.setClipboardData({
      data: this.data.outTradeNo,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },
});
