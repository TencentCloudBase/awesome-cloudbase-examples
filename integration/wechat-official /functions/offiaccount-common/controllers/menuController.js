/**
 * 自定义菜单控制器
 *
 * 路由：
 *   POST /menu/create  创建自定义菜单
 *   POST /menu/get     查询菜单
 *   POST /menu/delete  删除菜单
 */

const { wxPost, wxGet } = require('../utils/wxApi');
const { success, fail } = require('../utils/response');

/**
 * POST /menu/create
 * 创建自定义菜单（覆盖现有菜单）
 *
 * Body: { button: Array }
 * 菜单结构参考微信官方文档：https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Creating_Custom-Defined_Menu.html
 *
 * 示例：
 * {
 *   "button": [
 *     { "type": "view", "name": "官网", "url": "https://example.com" },
 *     {
 *       "name": "更多",
 *       "sub_button": [
 *         { "type": "click", "name": "点击事件", "key": "V1001_GOOD" }
 *       ]
 *     }
 *   ]
 * }
 */
exports.create = async (req, res) => {
  try {
    const { button } = req.body;
    if (!button) return fail(res, '缺少 button 参数');

    const result = await wxPost('/cgi-bin/menu/create', { button });
    success(res, result);
  } catch (err) {
    console.error('[menu/create]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /menu/get
 * 查询自定义菜单配置
 */
exports.get = async (req, res) => {
  try {
    const result = await wxGet('/cgi-bin/menu/get');
    success(res, result);
  } catch (err) {
    console.error('[menu/get]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /menu/delete
 * 删除自定义菜单（删除后菜单立即失效）
 */
exports.del = async (req, res) => {
  try {
    const result = await wxGet('/cgi-bin/menu/delete');
    success(res, result);
  } catch (err) {
    console.error('[menu/delete]', err);
    fail(res, err.message, 500);
  }
};
