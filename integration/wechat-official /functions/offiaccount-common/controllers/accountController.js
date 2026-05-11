/**
 * 账号管理控制器
 *
 * 路由：
 *   POST /account/shorturl  生成短链接
 */

const { wxPost } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /account/shorturl
 * 将长链接转成短链接（短链接有效期永久，但功能已逐步弃用）
 *
 * Body: { long_url: string }
 *
 * 注意：微信官方已停止为新注册公众号提供短链接服务，
 *       建议使用带参数二维码或自定义 URL 方案替代。
 */
exports.shortUrl = async (req, res) => {
  try {
    const { long_url } = req.body;
    if (!long_url) return fail(res, '缺少 long_url 参数');
    if (!/^https?:\/\//.test(long_url)) return fail(res, 'long_url 必须以 http:// 或 https:// 开头');

    const result = await wxPost('/cgi-bin/shorturl', {
      action: 'long2short',
      long_url,
    });
    success(res, result);
  } catch (err) {
    console.error('[account/shorturl]', err);
    fail(res, err.message, 500);
  }
};
