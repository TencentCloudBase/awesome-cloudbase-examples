// 虚拟支付前端封装：下单 → 拉起支付 → 查询订单
// iOS 端微信版本门槛：8.0.68 及以上
const IOS_MIN_VERSION = [8, 0, 68]

/**
 * iOS 端微信版本校验（不满足则提示并阻断）
 * 微信客户端版本字段：wx.getAppBaseInfo().version（基础库 2.20.1+）
 * 兼容旧基础库：fallback 到 wx.getSystemInfoSync().version
 * 字段对照：
 *   SDKVersion = 基础库版本（与微信客户端版本不同！）
 *   version    = 微信客户端版本
 */
function checkIosVersion() {
  return new Promise((resolve) => {
    const base = (wx.getAppBaseInfo && wx.getAppBaseInfo()) || {}
    const sys = (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {}
    const platform = (base.platform || sys.platform || '').toLowerCase()
    if (platform !== 'ios') {
      resolve(true)
      return
    }
    // 优先取微信客户端版本号；基础库版本不对外暴露客户端版本
    const ver = base.version || sys.version || ''
    const parts = ver.split('.').map((n) => parseInt(n, 10) || 0)
    const ok =
      parts[0] > IOS_MIN_VERSION[0] ||
      (parts[0] === IOS_MIN_VERSION[0] &&
        (parts[1] > IOS_MIN_VERSION[1] ||
          (parts[1] === IOS_MIN_VERSION[1] && parts[2] >= IOS_MIN_VERSION[2])))
    if (!ok) {
      wx.showModal({
        title: '提示',
        content: `iOS 端虚拟支付需要微信 ${IOS_MIN_VERSION.join('.')} 及以上版本，请先升级微信（当前 ${ver || '未知'}）`,
        showCancel: false
      })
    }
    resolve(ok)
  })
}

/**
 * 调用云函数下单，返回服务端签好的 payData
 * @param {object} product 商品 { productId, price, name }
 * @param {number} quantity 购买数量
 */
function createOrder(product, quantity = 1) {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        wx.cloud
          .callFunction({
            name: 'createOrder',
            data: {
              code: loginRes.code,
              productId: product.productId,
              buyQuantity: quantity
            }
          })
          .then((res) => {
            const r = res.result
            if (r && r.ok) {
              resolve(r.data)
            } else {
              reject(new Error((r && r.error) || '下单失败'))
            }
          })
          .catch(reject)
      },
      fail: reject
    })
  })
}

/**
 * 拉起虚拟支付
 * @param {object} payData { mode, signData, paySig, signature }
 */
function requestVirtualPayment(payData) {
  return new Promise((resolve, reject) => {
    wx.requestVirtualPayment({
      mode: payData.mode,
      signData: payData.signData,
      paySig: payData.paySig,
      signature: payData.signature,
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 完整购买流程：iOS 版本校验 → 下单 → 拉起支付
 */
async function buyGoods(product, quantity = 1) {
  if (!(await checkIosVersion())) return null
  const payData = await createOrder(product, quantity)
  await requestVirtualPayment(payData)
  return payData
}

/**
 * 查询订单状态（可作支付完成后刷新用）
 */
function queryOrder(outTradeNo) {
  return wx.cloud.callFunction({
    name: 'queryOrder',
    data: { outTradeNo }
  })
}

module.exports = { buyGoods, createOrder, requestVirtualPayment, queryOrder, checkIosVersion }
