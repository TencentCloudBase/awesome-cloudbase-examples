/**
 * 客服消息控制器
 *
 * 路由：
 *   POST /kefu/send    发送客服消息
 *   POST /kefu/typing  发送输入状态
 *   POST /kefu/add     添加客服账号
 *   POST /kefu/update  修改客服账号
 *   POST /kefu/del     删除客服账号
 *   POST /kefu/list    获取客服账号列表
 */

const { wxPost, wxGet } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /kefu/send
 * 发送客服消息
 *
 * Body: { touser: string, msgtype: string, [msgtype]: { ... } }
 *
 * msgtype 示例：
 *   text:  { content: '...' }
 *   image: { media_id: '...' }
 *   news:  { articles: [...] }
 */
exports.send = async (req, res) => {
  try {
    const { touser, msgtype } = req.body;
    if (!touser || !msgtype) return fail(res, '缺少 touser 或 msgtype 参数');

    const result = await wxPost('/cgi-bin/message/custom/send', req.body);
    success(res, result);
  } catch (err) {
    console.error('[kefu/send]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /kefu/typing
 * 发送客服输入状态（"对方正在输入"）
 *
 * Body: { touser: string, command: 'Typing' | 'CancelTyping' }
 */
exports.typing = async (req, res) => {
  try {
    const { touser, command } = req.body;
    if (!touser || !command) return fail(res, '缺少 touser 或 command 参数');
    if (!['Typing', 'CancelTyping'].includes(command)) return fail(res, 'command 必须为 Typing 或 CancelTyping');

    const result = await wxPost('/cgi-bin/message/custom/typing', { touser, command });
    success(res, result);
  } catch (err) {
    console.error('[kefu/typing]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /kefu/add
 * 添加客服账号
 *
 * Body: { kf_account: string, nickname: string }
 *   kf_account: 格式为 xxx@公众号微信号
 */
exports.addAccount = async (req, res) => {
  try {
    const { kf_account, nickname } = req.body;
    if (!kf_account || !nickname) return fail(res, '缺少 kf_account 或 nickname 参数');

    const result = await wxPost('/customservice/kfaccount/add', { kf_account, nickname });
    success(res, result);
  } catch (err) {
    console.error('[kefu/add]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /kefu/update
 * 修改客服账号信息
 *
 * Body: { kf_account: string, nickname: string }
 */
exports.updateAccount = async (req, res) => {
  try {
    const { kf_account, nickname } = req.body;
    if (!kf_account || !nickname) return fail(res, '缺少 kf_account 或 nickname 参数');

    const result = await wxPost('/customservice/kfaccount/update', { kf_account, nickname });
    success(res, result);
  } catch (err) {
    console.error('[kefu/update]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /kefu/del
 * 删除客服账号
 *
 * Body: { kf_account: string }
 */
exports.delAccount = async (req, res) => {
  try {
    const { kf_account } = req.body;
    if (!kf_account) return fail(res, '缺少 kf_account 参数');

    const result = await wxPost('/customservice/kfaccount/del', { kf_account });
    success(res, result);
  } catch (err) {
    console.error('[kefu/del]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /kefu/list
 * 获取所有客服账号列表
 */
exports.listAccounts = async (req, res) => {
  try {
    const result = await wxGet('/cgi-bin/customservice/getkflist');
    success(res, result);
  } catch (err) {
    console.error('[kefu/list]', err);
    fail(res, err.message, 500);
  }
};
