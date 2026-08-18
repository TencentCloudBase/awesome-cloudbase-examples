/**
 * 消息管理控制器
 *
 * 路由：
 *   POST /message/template_send  发送模板消息
 *   POST /message/mass_send      发送群发消息
 */

const { wxPost } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /message/template_send
 * 发送模板消息
 *
 * Body:
 *   touser:      string   接收者 openid
 *   template_id: string   模板 ID
 *   url?:        string   点击模板消息跳转链接
 *   miniprogram?: { appid, pagepath }  跳转小程序
 *   data:        object   模板数据，格式 { key: { value: '...', color?: '#...' } }
 *
 * 示例：
 * {
 *   "touser": "OPENID",
 *   "template_id": "ngqIpbwh8bUfcSsECmogfXcV14J0tQlEpBO27izEYqY",
 *   "url": "http://weixin.qq.com/download",
 *   "data": {
 *     "first":    { "value": "恭喜你购买成功！", "color": "#173177" },
 *     "keyword1": { "value": "巧克力", "color": "#173177" },
 *     "remark":   { "value": "欢迎再次购买！", "color": "#173177" }
 *   }
 * }
 */
exports.templateSend = async (req, res) => {
  try {
    const { touser, template_id, data } = req.body;
    if (!touser || !template_id || !data) return fail(res, '缺少 touser / template_id / data 参数');

    const result = await wxPost('/cgi-bin/message/template/send', req.body);
    success(res, result);
  } catch (err) {
    console.error('[message/template_send]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /message/mass_send
 * 群发消息（按标签或 openid 列表）
 *
 * Body 示例（按标签群发文本）：
 * {
 *   "filter": { "is_to_all": false, "tag_id": 2 },
 *   "text": { "content": "你好" },
 *   "msgtype": "text"
 * }
 *
 * Body 示例（按 openid 列表）：
 * {
 *   "touser": ["OPENID1", "OPENID2"],
 *   "text": { "content": "你好" },
 *   "msgtype": "text"
 * }
 */
exports.massSend = async (req, res) => {
  try {
    const { msgtype } = req.body;
    if (!msgtype) return fail(res, '缺少 msgtype 参数');

    // 根据是否有 touser 决定使用哪个群发接口
    const path = req.body.touser
      ? '/cgi-bin/message/mass/send'          // 按 openid 列表群发
      : '/cgi-bin/message/mass/sendall';      // 按标签群发

    const result = await wxPost(path, req.body);
    success(res, result);
  } catch (err) {
    console.error('[message/mass_send]', err);
    fail(res, err.message, 500);
  }
};
