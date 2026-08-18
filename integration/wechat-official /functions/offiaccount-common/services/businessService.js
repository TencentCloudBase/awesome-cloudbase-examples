/**
 * 业务钩子层（开发者落库点）
 *
 * 提供给开发者自定义：
 * - 消息发送前后的日志/风控
 * - 用户关注/取关事件落库
 * - 订阅消息发送记录
 *
 * 默认为空实现，开发者按需填充。
 */

async function beforeSendSubscribe(ctx) { return { pass: true }; }
async function afterSendSubscribe(ctx) {}

async function beforeSendKefu(ctx) { return { pass: true }; }
async function afterSendKefu(ctx) {}

async function onOAuthSuccess(ctx) {}     // openid 成功换取后的钩子

module.exports = {
    beforeSendSubscribe, afterSendSubscribe,
    beforeSendKefu, afterSendKefu,
    onOAuthSuccess,
};
