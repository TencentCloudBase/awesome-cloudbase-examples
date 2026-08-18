/**
 * 开放接口管理控制器
 *
 * 路由：
 *   POST /openapi/clear_quota      重置接口调用次数
 *   POST /openapi/get_quota        查询接口调用次数
 *   POST /openapi/get_rid          查询 rid 信息
 *   POST /openapi/reset_appsecret  重置 AppSecret（⚠️ 高危操作）
 */

const { wxPost, wxGet } = require('../utils/wxApi');
const { appId } = require('../config/config');
const { success, fail } = require('../utils/response');

/**
 * POST /openapi/clear_quota
 * 重置公众号的接口调用次数
 *
 * Body: { appid?: string }  默认使用配置的 appId
 */
exports.clearQuota = async (req, res) => {
  try {
    const data = await wxPost('/cgi-bin/clear_quota', {
      appid: req.body?.appid || appId,
    });
    success(res, data);
  } catch (err) {
    console.error('[openapi/clear_quota]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /openapi/get_quota
 * 查询接口调用次数
 *
 * Body: { cgi_path: string }  例如 /cgi-bin/message/custom/send
 */
exports.getQuota = async (req, res) => {
  try {
    const { cgi_path } = req.body;
    if (!cgi_path) return fail(res, '缺少 cgi_path 参数');

    const data = await wxPost('/cgi-bin/openapi/quota/get', { cgi_path });
    success(res, data);
  } catch (err) {
    console.error('[openapi/get_quota]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /openapi/get_rid
 * 查询 rid 信息（排查接口调用错误）
 *
 * Body: { rid: string }
 */
exports.getRid = async (req, res) => {
  try {
    const { rid } = req.body;
    if (!rid) return fail(res, '缺少 rid 参数');

    const data = await wxPost('/cgi-bin/openapi/rid/get', { rid });
    success(res, data);
  } catch (err) {
    console.error('[openapi/get_rid]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /openapi/reset_appsecret
 * 重置 AppSecret（⚠️ 高危操作，请谨慎调用）
 *
 * Body: { appid?: string }
 */
exports.resetAppsecret = async (req, res) => {
  try {
    console.warn('[openapi/reset_appsecret] ⚠️ 高危操作：重置 AppSecret，appid:', appId);
    const data = await wxPost('/cgi-bin/appsecret/reset', {
      appid: req.body?.appid || appId,
    });
    success(res, data);
  } catch (err) {
    console.error('[openapi/reset_appsecret]', err);
    fail(res, err.message, 500);
  }
};
