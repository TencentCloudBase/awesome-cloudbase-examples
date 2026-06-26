/**
 * 订阅通知控制器
 *
 * 路由：
 *   POST /subscribe/bizsend                发送订阅通知
 *   POST /subscribe/addtemplate            选用模板
 *   POST /subscribe/deltemplate            删除模板
 *   POST /subscribe/getcategory            获取公众号类目
 *   POST /subscribe/getpubtemplatetitles   获取模板标题列表
 *   POST /subscribe/getpubtemplatekeywords 获取模板关键词列表
 *   POST /subscribe/list                   获取私有模板列表
 */

const { wxPost, wxGet } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /subscribe/bizsend
 * 发送订阅通知
 *
 * Body: { touser, template_id, page?, miniprogram?, data: { key: { value } } }
 */
exports.bizsend = async (req, res) => {
  try {
    const { touser, template_id, data } = req.body;
    if (!touser || !template_id || !data) return fail(res, '缺少 touser / template_id / data 参数');

    const result = await wxPost('/cgi-bin/message/subscribe/bizsend', req.body);
    success(res, result);
  } catch (err) {
    console.error('[subscribe/bizsend]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /subscribe/addtemplate
 * 选用模板（从模板库选用到私有模板列表）
 *
 * Body: { tid: string, kidList: number[], sceneDesc?: string }
 */
exports.addTemplate = async (req, res) => {
  try {
    const { tid, kidList } = req.body;
    if (!tid || !kidList) return fail(res, '缺少 tid 或 kidList 参数');

    const result = await wxPost('/wxaapi/newtmpl/addtemplate', req.body);
    success(res, result);
  } catch (err) {
    console.error('[subscribe/addtemplate]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /subscribe/deltemplate
 * 删除私有模板
 *
 * Body: { priTmplId: string }
 */
exports.delTemplate = async (req, res) => {
  try {
    const { priTmplId } = req.body;
    if (!priTmplId) return fail(res, '缺少 priTmplId 参数');

    const result = await wxPost('/wxaapi/newtmpl/deltemplate', { priTmplId });
    success(res, result);
  } catch (err) {
    console.error('[subscribe/deltemplate]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /subscribe/getcategory
 * 获取公众号类目（用于搜索模板）
 */
exports.getCategory = async (req, res) => {
  try {
    const result = await wxGet('/wxaapi/newtmpl/getcategory');
    success(res, result);
  } catch (err) {
    console.error('[subscribe/getcategory]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /subscribe/getpubtemplatetitles
 * 获取模板标题列表
 *
 * Body: { ids: string, start: number, limit: number }
 *   ids: 类目 id 列表，逗号分隔
 */
exports.getPubTemplateTitles = async (req, res) => {
  try {
    const { ids, start = 0, limit = 30 } = req.body;
    if (!ids) return fail(res, '缺少 ids 参数（类目 id 列表）');

    const result = await wxGet('/wxaapi/newtmpl/getpubtemplatetitles', { ids, start, limit });
    success(res, result);
  } catch (err) {
    console.error('[subscribe/getpubtemplatetitles]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /subscribe/getpubtemplatekeywords
 * 获取模板关键词列表
 *
 * Body: { tid: string }
 */
exports.getPubTemplateKeywords = async (req, res) => {
  try {
    const { tid } = req.body;
    if (!tid) return fail(res, '缺少 tid 参数');

    const result = await wxGet('/wxaapi/newtmpl/getpubtemplatekeywords', { tid });
    success(res, result);
  } catch (err) {
    console.error('[subscribe/getpubtemplatekeywords]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /subscribe/list
 * 获取当前账号的私有模板列表
 */
exports.listTemplates = async (req, res) => {
  try {
    const result = await wxGet('/wxaapi/newtmpl/gettemplate');
    success(res, result);
  } catch (err) {
    console.error('[subscribe/list]', err);
    fail(res, err.message, 500);
  }
};
