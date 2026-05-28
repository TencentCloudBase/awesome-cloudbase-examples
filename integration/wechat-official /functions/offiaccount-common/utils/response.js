/**
 * 统一响应格式工具
 */

/**
 * 成功响应
 * @param {object} res   - Express res 对象
 * @param {any}    data  - 响应数据
 * @param {string} msg   - 可选提示信息
 */
function success(res, data, msg = 'ok') {
  res.status(200).json({ code: 0, msg, data });
}

/**
 * 失败响应
 * @param {object} res     - Express res 对象
 * @param {string} msg     - 错误信息
 * @param {number} status  - HTTP 状态码（默认 400）
 */
function fail(res, msg, status = 400) {
  res.status(status).json({ code: -1, msg, data: null });
}

module.exports = { success, fail };
