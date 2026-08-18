/**
 * POST /wechat/notify — 统一回调入口
 *
 * 集成中心网关已完成验签/解密，这里只打印回调信息，方便观察。
 */

const { Router } = require('express');

const router = Router();

// GET /wechat/notify — 微信 URL 验证（echostr）
router.get('/notify', (req, res) => {
  console.log('🔔 [GET /wechat/notify] URL 验证请求');
  console.log('  query:', JSON.stringify(req.query));

  const echostr = req.query.echostr;
  if (echostr) {
    // 微信验证 URL 有效性时会带 echostr，原样返回即可
    console.log('  ✅ 返回 echostr:', echostr);
    return res.status(200).send(echostr);
  }

  // 没有 echostr，可能是其他 GET 请求
  res.status(200).json({ code: 0, msg: 'wechat notify endpoint ready' });
});

// POST /wechat/notify — 接收微信推送的消息/事件
router.post('/notify', (req, res) => {
  const ts = new Date().toISOString();
  const body = req.body;

  console.log('');
  console.log('🔥🔥🔥 收到微信回调推送 🔥🔥🔥');
  console.log(`📨 [POST /wechat/notify] ${ts}`);
  console.log('📦 headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  console.log('🔥🔥🔥 回调处理完毕 🔥🔥🔥');
  console.log('');

  // 返回 success（微信要求，否则会重试）
  res.status(200).send('success');
});

module.exports = router;
