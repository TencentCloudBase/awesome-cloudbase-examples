/**
 * 带参数二维码控制器
 *
 * 路由：
 *   POST /qrcode/create  创建二维码 ticket
 *   POST /qrcode/show    根据 ticket 获取二维码图片 URL
 */

const { wxPost } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /qrcode/create
 * 创建带参数二维码（临时 or 永久）
 *
 * Body:
 *   action_name: 'QR_SCENE' | 'QR_STR_SCENE'          # 临时整型/字符串
 *              | 'QR_LIMIT_SCENE' | 'QR_LIMIT_STR_SCENE' # 永久整型/字符串
 *   expire_seconds?: number  # 临时二维码有效期（最大 2592000 = 30天），永久二维码不填
 *   scene_id?: number        # 整型参数（QR_SCENE / QR_LIMIT_SCENE）
 *   scene_str?: string       # 字符串参数（QR_STR_SCENE / QR_LIMIT_STR_SCENE）
 *
 * 示例（临时整型）：
 * { "action_name": "QR_SCENE", "expire_seconds": 604800, "scene_id": 123 }
 *
 * 示例（永久字符串）：
 * { "action_name": "QR_LIMIT_STR_SCENE", "scene_str": "user_channel_a" }
 */
exports.create = async (req, res) => {
  try {
    const { action_name, expire_seconds, scene_id, scene_str } = req.body;
    if (!action_name) return fail(res, '缺少 action_name 参数');

    const validActions = ['QR_SCENE', 'QR_STR_SCENE', 'QR_LIMIT_SCENE', 'QR_LIMIT_STR_SCENE'];
    if (!validActions.includes(action_name)) {
      return fail(res, `action_name 无效，支持: ${validActions.join(' / ')}`);
    }

    // 构建 action_info
    let sceneValue;
    if (action_name.includes('STR')) {
      if (!scene_str) return fail(res, '字符串 scene 类型需提供 scene_str 参数');
      sceneValue = { scene: { scene_str } };
    } else {
      if (scene_id === undefined) return fail(res, '整型 scene 类型需提供 scene_id 参数');
      sceneValue = { scene: { scene_id } };
    }

    const payload = {
      action_name,
      action_info: sceneValue,
    };
    if (expire_seconds && !action_name.startsWith('QR_LIMIT')) {
      payload.expire_seconds = expire_seconds;
    }

    const result = await wxPost('/cgi-bin/qrcode/create', payload);
    // 拼接完整的二维码图片 URL
    if (result.ticket) {
      result.qrcode_url = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(result.ticket)}`;
    }

    success(res, result);
  } catch (err) {
    console.error('[qrcode/create]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /qrcode/show
 * 根据 ticket 返回二维码图片 URL
 *
 * Body: { ticket: string }
 */
exports.show = async (req, res) => {
  try {
    const { ticket } = req.body;
    if (!ticket) return fail(res, '缺少 ticket 参数');

    const qrcode_url = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
    success(res, { qrcode_url });
  } catch (err) {
    console.error('[qrcode/show]', err);
    fail(res, err.message, 500);
  }
};
