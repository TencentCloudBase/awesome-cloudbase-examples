/**
 * 素材管理控制器
 *
 * 路由：
 *   POST /media/upload_temp        上传临时素材（media_id 有效期 3 天）
 *   POST /media/add_news           新增永久图文素材
 *   POST /media/batchget_material  获取素材列表
 *
 * 注意：上传文件（图片/音频/视频）需 multipart/form-data，
 *       本接口仅封装 JSON 类型（图文、素材列表查询）。
 *       上传二进制文件建议直接在服务端调用或使用微信官方上传接口。
 */

const { wxPost } = require('../utils/wxApi');
const { getAccessToken } = require('../utils/tokenCache');
const { success, fail } = require('../utils/response');

/**
 * POST /media/upload_temp
 * 上传临时素材
 *
 * 说明：临时素材 media_id 有效期 3 天，发消息时可直接引用。
 * 由于需要 multipart/form-data，此接口返回上传指引，
 * 实际上传需在服务端或通过直传方式实现。
 *
 * Body: { type: 'image' | 'voice' | 'video' | 'thumb' }
 * 返回：上传端点 URL（携带 access_token），供服务端直接上传
 */
exports.uploadTemp = async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) return fail(res, '缺少 type 参数（image/voice/video/thumb）');
    if (!['image', 'voice', 'video', 'thumb'].includes(type)) {
      return fail(res, 'type 必须为 image/voice/video/thumb');
    }

    const token = await getAccessToken();
    const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${token}&type=${type}`;

    success(res, {
      upload_url: uploadUrl,
      note: '使用 multipart/form-data POST 上传，字段名为 media，文件大小限制：图片1MB/音视频2MB',
    });
  } catch (err) {
    console.error('[media/upload_temp]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /media/add_news
 * 新增永久图文素材
 *
 * Body: {
 *   articles: [{
 *     title, thumb_media_id, author?, digest?, show_cover_pic?,
 *     content, content_source_url?, need_open_comment?, only_fans_can_comment?
 *   }]
 * }
 */
exports.addNews = async (req, res) => {
  try {
    const { articles } = req.body;
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return fail(res, '缺少 articles 参数');
    }

    for (const article of articles) {
      if (!article.title || !article.thumb_media_id || !article.content) {
        return fail(res, 'articles 每项必须包含 title / thumb_media_id / content');
      }
    }

    const result = await wxPost('/cgi-bin/material/add_news', { articles });
    success(res, result);
  } catch (err) {
    console.error('[media/add_news]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /media/batchget_material
 * 获取素材列表
 *
 * Body: { type: string, offset?: number, count?: number }
 *   type: image / video / voice / news
 *   offset: 从哪个位置开始，默认 0
 *   count:  每次获取数量（1~20），默认 20
 */
exports.batchGetMaterial = async (req, res) => {
  try {
    const { type, offset = 0, count = 20 } = req.body;
    if (!type) return fail(res, '缺少 type 参数（image/video/voice/news）');
    if (!['image', 'video', 'voice', 'news'].includes(type)) {
      return fail(res, 'type 必须为 image/video/voice/news');
    }

    const result = await wxPost('/cgi-bin/material/batchget_material', { type, offset, count });
    success(res, result);
  } catch (err) {
    console.error('[media/batchget_material]', err);
    fail(res, err.message, 500);
  }
};
