# 双签名（虚拟支付的核心）

> 这是虚拟支付与普通微信支付**最本质的差异**。普通支付后端调接口拿 `prepay_id` 就完事；
> 虚拟支付要求业务侧自己构造 `signData` 并计算两个签名。

## 两套签名

| 签名 | 密钥 | 基串 | 语义 |
|---|---|---|---|
| `paySig` | **AppKey** | `<uri> & <signData>` | 商户侧身份 |
| `signature` | **sessionKey** | `<signData>` | 用户态签名 |

算法都是 **HMAC-SHA256**，输出 hex。

## signData 字段

```json
{
  "offerId": "xxx",
  "buyQuantity": 1,
  "env": 0,
  "currencyType": "CNY",
  "productId": "xxx",
  "goodsPrice": 100,
  "outTradeNo": "xxx",
  "attach": "xxx"
}
```

| 字段 | 说明 |
|---|---|
| `offerId` | OfferID |
| `buyQuantity` | 购买数量（代币充值时即代币数量） |
| `env` | **固定 0（现网）**。协议上 1 表示沙箱，但本模板不提供沙箱切换，`env` 是硬编码常量 |
| `currencyType` | 固定 `CNY` |
| `productId` | 道具 ID，**道具直购必填，须与后台一致** |
| `goodsPrice` | 单价，**单位：分**，**须与后台一致** |
| `outTradeNo` | 业务单号，8–32 位、唯一、不能以下划线开头 |
| `attach` | **必填**，透传数据，发货推送时原样返回。模板在调用方不传时用 `outTradeNo` 兜底，保证字段始终存在 |

**代币充值（`short_series_coin`）不需要 `productId` / `goodsPrice`**，只有道具直购（`short_series_goods`）需要。

## C 端 vs B 端

| | C 端下单 | B 端调 `/xpay/*` |
|---|---|---|
| 签名参数位置 | 返回给客户端，由 `wx.requestVirtualPayment` 带走 | **query string**，整串是 `?access_token=xxx&pay_sig=xxx&signature=xxx`，**不进 body** |
| `paySig` 的 uri | **固定 `requestVirtualPayment`** | **实际接口路径**，如 `/xpay/query_order`（不带 query） |
| `signature` 基串 | `signData` | `post_body`（= 实际发出的 body 原文，不含任何签名字段） |
| 命名风格 | **驼峰**（`offerId` / `outTradeNo`） | **下划线**（`order_id` / `offer_id`） |

> 🚨 **实测踩过**：把 `pay_sig` 塞进 JSON body → 微信返回 `268490002 签名字段[pay_sig]为空`。
> 官方原文：「签名参数为 `pay_sig`，加在 `query` 后面」。body 里只有业务字段。

> ⚠️ 命名风格不一致是高频错误来源。C 端 signData 用驼峰，服务端接口参数用下划线。

> ⚠️ **每个接口的 body 字段要各自对照官方文档**，不要互相复制。例如 `/xpay/query_order` 的 body 只有 `openid` / `env` / `order_id`（或 `wx_order_id`），**没有 `offer_id`、没有 `out_trade_no`** —— 订单号字段名是 `order_id`。

## 代码实现

```js
// ✅ 正确：signData 是字符串，全程不重排
const signData = JSON.stringify({
    offerId, buyQuantity, env: 0, currencyType: 'CNY',
    productId, goodsPrice, outTradeNo, attach,
});

const paySig    = HmacSHA256(appKey,    `requestVirtualPayment&${signData}`);
const signature = HmacSHA256(sessionKey, signData);
```

```js
// ❌ 错误：重新序列化会打乱键顺序
const obj = JSON.parse(signData);
const bad = JSON.stringify(obj);        // 可能重排 → 签名作废
const paySig = HmacSHA256(appKey, `requestVirtualPayment&${bad}`);
```

## 🚨 头号坑：原样字符串

官方文档把「验签失败」直接归因于：**`post_body` 与签名时的原始串不一致（被格式化 / 改了键顺序）**。

`signService.js` 的应对设计：**所有签名入口只接收 `string`，不接收 object**。
这样从接口签名上就杜绝了调用方传对象进来、内部再自行序列化的可能。

```js
signForClient(signData: string, sessionKey: string, mode?)   // ← 字符串
signForServer(uri: string, postBody: string, sessionKey)     // ← 字符串
```

> 对比 Stripe：Stripe 是**验签时**要用原始 body（不能被 parse 再 stringify）；
> 虚拟支付是**签名时**要保证字符串不被改动。方向相反，但都栽在「序列化改变了字节」上。

## sessionKey 从哪来

```
前端 wx.login() → code
       ↓ 传给云函数
云函数 code2Session(appId, appSecret, code) → sessionKey + openid
       ↓
signature = HMAC-SHA256(signData, sessionKey)
```

`code2Session`：

```
GET https://api.weixin.qq.com/sns/jscode2session
    ?appid=APPID&secret=SECRET&js_code=CODE&grant_type=authorization_code
```

> 云函数的 `getWXContext()` **不提供 sessionKey**（只给 OPENID/APPID/UNIONID/ENV），
> 所以 AppSecret 必须在服务端，code 必须由前端传。

常见 errcode：

| errcode | 含义 |
|---|---|
| 40029 | code 无效（可能已用过或过期） |
| 45011 | API 调用太频繁 |
| 40226 | code 被限频 |

## B 端接口签名示例

```js
const uri = '/xpay/query_order';
const bizParams = { openid, offer_id, out_trade_no, env };

const postBody = JSON.stringify(bizParams);              // 签名基串（原样）
const { signature, paySig } = signForServer(uri, postBody, sessionKey);

const finalBody = JSON.stringify({ ...bizParams, signature, pay_sig: paySig });
// POST https://api.weixin.qq.com/xpay/query_order?access_token=TOKEN
```

⚠️ `post_body` 指**除 signature / pay_sig 之外**的请求体原样字符串，不是最终发出的完整 body。

## 自测方法

用已知密钥手工算一遍比对：

```js
const crypto = require('crypto');
const expect = crypto.createHmac('sha256', appKey)
    .update(`requestVirtualPayment&${signData}`, 'utf8')
    .digest('hex');
assert.strictEqual(paySig, expect);
```

`tests/sign.test.js` 已覆盖：键顺序稳定、C 端 uri 固定、B 端 uri 为路径、缺 sessionKey 抛错、
**键顺序改变导致签名不同**（证明坑的存在）。
