/**
 * 用户管理控制器
 *
 * 路由：
 *   POST /user/info   获取用户基本信息
 *   POST /user/list   获取关注者列表
 *   POST /user/tags   标签管理（创建/删除/查询）
 */

const { wxGet, wxPost } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /user/info
 * 获取用户基本信息（需用户关注公众号）
 *
 * Body: { openid: string, lang?: string }
 */
exports.getUserInfo = async (req, res) => {
  try {
    const { openid, lang = 'zh_CN' } = req.body;
    if (!openid) return fail(res, '缺少 openid 参数');

    const result = await wxGet('/cgi-bin/user/info', { openid, lang });
    success(res, result);
  } catch (err) {
    console.error('[user/info]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /user/list
 * 获取关注者列表（每次最多返回 10000 个 openid）
 *
 * Body: { next_openid?: string }  第一次不填，翻页时填上一次返回的 next_openid
 */
exports.getUserList = async (req, res) => {
  try {
    const params = {};
    if (req.body?.next_openid) params.next_openid = req.body.next_openid;

    const result = await wxGet('/cgi-bin/user/get', params);
    success(res, result);
  } catch (err) {
    console.error('[user/list]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /user/tags
 * 标签管理（根据 action 字段分发）
 *
 * Body: { action: 'create' | 'list' | 'delete', name?: string, id?: number }
 *
 * action=create: 创建标签  Body: { action: 'create', name: '标签名' }
 * action=list:   查询标签  Body: { action: 'list' }
 * action=delete: 删除标签  Body: { action: 'delete', id: 100 }
 */
exports.tags = async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) return fail(res, '缺少 action 参数（create/list/delete）');

    let result;
    switch (action) {
      case 'create': {
        const { name } = req.body;
        if (!name) return fail(res, '创建标签需提供 name 参数');
        result = await wxPost('/cgi-bin/tags/create', { tag: { name } });
        break;
      }
      case 'list': {
        result = await wxGet('/cgi-bin/tags/get');
        break;
      }
      case 'delete': {
        const { id } = req.body;
        if (!id) return fail(res, '删除标签需提供 id 参数');
        result = await wxPost('/cgi-bin/tags/delete', { tag: { id } });
        break;
      }
      default:
        return fail(res, `不支持的 action: ${action}，请使用 create/list/delete`);
    }

    success(res, result);
  } catch (err) {
    console.error('[user/tags]', err);
    fail(res, err.message, 500);
  }
};
