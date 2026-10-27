---
name: cloudbase-xpay
description: |
  Guide WeChat Mini Program Virtual Payment (小程序虚拟支付) integration on CloudBase
  using the xpay-common template. Covers 道具直购 / 代币支付 / 发货推送 / 退款 / iOS IAP.
  Trigger when user mentions: "虚拟支付", "xpay", "xpay-common", "requestVirtualPayment",
  "道具直购", "代币支付", "代币充值", "iOS 内购", "IAP", "Apple 佣金",
  "signData", "paySig", "signature", "双签名", "sessionKey", "code2Session",
  "发货推送", "xpay_goods_deliver_notify", "幂等发货", "iOS 退款问询",
  "OfferID", "AppKey", "米大师", "Midas", "沙箱", "PAYMENT_ILLEGAL_IN_SANDBOX",
  "小程序消息推送", "EncodingAESKey".
  For 实物商品 微信支付 (wx.requestPayment / V3 接口), defer to cloudbase-wechatpay skill.
---

# 小程序虚拟支付接入（xpay-common 模板）

面向**虚拟商品**（道具直购、代币支付、会员订阅）的微信小程序虚拟支付能力（米大师 Midas）。
封装 `paySig` / `signature` 双签名、出支付参数（不代下单）、发货推送、查单、退款事件处理与 iOS 退款问询；客户端统一用
`wx.requestVirtualPayment`。iOS 端能否拉起收银台由平台侧开通的「虚拟支付 iOS 能力」决定，
服务端只处理签名与推送，不是本模板「打通 IAP」。

---

## Setup（首次使用引导）

首次被调用时，按顺序确认：

1. **确认商品类型**：虚拟商品走本 Skill；**实物商品请改用 `cloudbase-wechatpay`**
2. **确认主体与类目**：企业 / 个体户 / 个人。个人主体需服务类目含「工具」、已完成认证备案，全终端月支付限额 **10 万元**，且**仅支持道具直购（`short_series_goods`），不开放代币充值**
3. **确认终端**：是否需要 iOS（需开通 IAP + 微信 ≥ 8.0.68 + 配置小程序简称）
4. **确认凭证齐备**：OfferID、现网 AppKey、AppID、AppSecret（见 `references/template-onboarding/env-config.md`）
5. **选择接入方式**：有集成中心 → `references/template-onboarding/integration-center.md`；无 → `references/template-onboarding/quick-start.md`

---

## 全局规范

1. **服务端不参与下单**：虚拟支付由客户端 `wx.requestVirtualPayment` 自行完成下单，服务端只负责出签名。这与普通微信支付「服务端调统一下单拿 prepay_id」**完全相反**
2. **签名用原样字符串**：任何 `JSON.parse` → `stringify` 重排键顺序都会让签名失效。所有签名入口只接收字符串
3. **凭证只走环境变量**：AppSecret 是小程序最高权限凭证，禁止硬编码、禁止进客户端、禁止提交仓库
4. **发货以推送为主、查单兜底**：前端 `success` 回调不可靠（用户异常退出即丢），不能作为发货依据
5. **Demo 优先**：回答前端问题时优先引用 `examples/miniprogram/`

## 关联技能

| 技能 | 负责范围 |
|------|---------|
| `cloudbase-wechatpay` | 实物商品的普通微信支付（pay-common 模板） |

本 Skill **专注范围**：CloudBase 平台上用 `xpay-common` 模板的部署、配置、签名、回调、排障。

---

## Gotchas（踩坑清单）

> 按「翻车概率 × 后果严重度」排序。

| # | 陷阱 | 正确做法 | 后果 |
|---|------|---------|------|
| 1 | 把 signData 当对象 `JSON.parse` 再 `stringify` | **按原样字符串签名**，不重排键 | 签名失效，下单失败 |
| 2 | 应答格式与推送格式不一致 | 推送 XML 就回 XML，JSON 就回 JSON | 微信**重推最多 15 次** |
| 3 | iOS 退款问询超时 | 3 秒内应答，且 `evidence` 必填 | Apple 连问 3 次后退款决定权交给 Apple |
| 4 | 用前端 `success` 作为发货依据 | 以 `xpay_goods_deliver_notify` 为准，查单兜底 | 用户异常退出 → 漏发货 |
| 5 | 没做幂等 / 用错去重键 | 以平台单号 `wx_order_id`（`WeChatPayInfo.MchOrderNo`）去重，缺失时回退 `OutTradeNo`；生产用数据库唯一索引 | 重推导致重复发货；用商家单号去重会在复用单号时漏发 |
| 6 | `goodsPrice` 单位搞错 | **单位是分** | 道具价格校验失败 |
| 7 | 道具刚发布就下单 | 等几分钟到半小时等平台同步 | `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY` |
| 8 | 服务端接口用了驼峰 | B 端接口用下划线（`offer_id`），C 端 signData 用驼峰（`offerId`） | 参数错误 |
| 9 | 该由谁验签解密搞错 | 集成中心托管 → 网关做完，业务只拿明文；**直连 HTTP 访问服务 → 必须自实现**（URL 校验 + `msg_signature` 验签 + AES 解密） | 前者重复实现、拿不到 Token/EncodingAESKey；后者不自实现 → 回调 URL 存不上、Event 解析不出来 |
| 10 | 前端传金额给后端 | 价格必须由后端按 SKU 查出 | 攻击者可篡改为 1 分 |
| 11 | 改了云函数随机串 | 与回调域名子域、环境变量绑定 | **改名即断回调** |
| 12 | 把 `x-tcb-integration-id` / 未验签 JWT 当鉴权凭据 | 自定义 header 与 JWT payload 都可伪造；模板只读平台注入的 `x-wx-openid`，公网暴露时在上游网关做鉴权 | 鉴权被绕过 |
| 13 | 先写幂等标记再处理业务 | **业务成功后才落标记**，失败要抛出让微信重推 | 处理失败后重推被当重复忽略 → 永久丢单 |
| 14 | 回调出错一律返回 `ErrCode=0` | 结构性错误回 0，**业务异常回非 0** 触发重推 | 静默丢单 |
| 15 | 集成中心上线后回调「静默丢单」 | 网关 `POST /wechat/notify` 的明文可能包在 `ParsedNotify`，取 `Event` 要 `ParsedContent \|\| ParsedNotify \|\| body` | 只认 `ParsedContent` → 判缺 `Event` → 回 `ErrCode=0` → 微信不重推，日志只有一条 error |

---

## 路由速查

函数内路径；完整 URL = HTTP 访问服务地址（含路径前缀）+ `/xpay/xxx`。

| 路由 | 身份来源 | 说明 |
|---|---|---|
| `POST /xpay/create_order` | 平台注入 `x-wx-openid`；`code2Session` 换出的权威 openid 必须与之相同 | 返回 `payData`（signData / mode / paySig / signature） |
| `POST /xpay/query_order` | 同上 + 订单归属校验（`XPAY_GUARD=on` 时查不到单即拒绝） | 查单，推送丢失时兜底补发货 |
| `POST /xpay/callback` | `notifyURLCallbackType=system` → 网关验签；`ownservice`/未声明 → 本函数自验签（fail closed，见 Gotcha 9） | 所有 `xpay_*` 事件统一入口 |

## 回调事件速查

| Event | 处理 |
|---|---|
| `xpay_goods_deliver_notify` | **核心**：幂等发货 |
| `xpay_coin_pay_notify` | 更新代币余额 |
| `xpay_refund_notify` | 更新订单 + 回收道具 |
| `xpay_complaint_notify` | 记录，人工跟进 |
| `xpay_wxpay_callback_notify` | 记录风控，按需申诉 |
| `xpay_subscribe_ios_refund_query_notify` | 3 秒内应答退款决策 |

---

## References

| 分类 | 文档 |
|------|------|
| 方案选型 | [cloudbase-pay-overview.md](references/solution-selection/cloudbase-pay-overview.md) |
| 模板接入 | [quick-start.md](references/template-onboarding/quick-start.md) · [env-config.md](references/template-onboarding/env-config.md) · [integration-center.md](references/template-onboarding/integration-center.md) · [dual-signature.md](references/template-onboarding/dual-signature.md) · [callback-events.md](references/template-onboarding/callback-events.md) |
| 业务开发 | [idempotent-deliver.md](references/business-logic/idempotent-deliver.md) · [refund.md](references/business-logic/refund.md) · [coin.md](references/business-logic/coin.md) |
| 前端集成 | [miniprogram.md](references/frontend-integration/miniprogram.md) |
| 问题排查 | [error-patterns.md](references/troubleshooting/error-patterns.md) · [troubleshooting.md](references/troubleshooting/troubleshooting.md) |
| 核心速查 | [env-quick-ref.md](references/quick-reference/env-quick-ref.md) · [api-routes.md](references/api-routes.md) |
| 架构图 | [architecture.md](assets/architecture.md) |
