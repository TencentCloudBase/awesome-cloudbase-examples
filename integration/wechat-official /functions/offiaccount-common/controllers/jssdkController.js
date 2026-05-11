/**
 * JS-SDK 配置控制器
 *
 * 路由：
 *   POST /jssdk/config  生成 wx.config 签名包
 */

const crypto = require('crypto');
const { appId } = require('../config/config');
const { getJsapiTicket } = require('../utils/tokenCache');
const { success, fail } = require('../utils/response');

/**
 * POST /jssdk/config
 * 生成 wx.config 所需的签名包
 *
 * Body: { url: string }  前端当前页面完整 URL（不含 # 及其后部分）
 *
 * 签名算法：
 *   string1 = "jsapi_ticket=xxx&noncestr=xxx&timestamp=xxx&url=xxx"（字典序）
 *   signature = sha1(string1)
 */
exports.getConfig = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return fail(res, '缺少 url 参数（当前页面完整 URL）');
    if (!appId) return fail(res, '未配置 OA_APPID');

    const ticket = await getJsapiTicket();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(8).toString('hex');

    // 字典序拼接（jsapi_ticket < noncestr < timestamp < url）
    const string1 = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(string1).digest('hex');

    success(res, {
      appId,
      timestamp,
      nonceStr,
      signature,
    });
  } catch (err) {
    console.error('[jssdk/config]', err);
    fail(res, err.message, 500);
  }
};
