# 错误速查表

## 下单 / 拉起支付

| 错误 | 原因 | 处理 |
|---|---|---|
| `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY` | 道具刚发布，平台同步延迟 | 等几分钟到半小时 |
| `PRODUCT_ID_NOT_PUBLISH` | ① 道具未发布；② **测的是开发版/体验版，但道具只发布了「线上版本」**；③ 不属于当前 offerId；④ 价格与后台不一致 | 微信按小程序版本查**不同道具库**：开发版/体验版 → 「开发版本」道具，正式版 → 「线上版本」道具。后台切到对应 tab 上传/发布后再试（上传一次仅支持一个道具） |
| 道具 ID / 价格校验失败 | `goodsPrice` 或 `productId` 与后台不一致 | 核对道具配置，**单位是分** |
| 当前商户尚未开启 iOS 支付 | iOS 端 IAP 未开通 | MP 后台配置小程序简称 + 开通 IAP |
| 验签失败 / 签名错误 | `signData` 被重新序列化改了键顺序 | **按原样字符串签名，不重排键** |
| `requestVirtualPayment is not a function` | 基础库过低 | 升到 ≥ 2.19.2 |
| `callHTTPFunction is not a function` | 基础库过低 | 升到 ≥ 3.15.2 |
| `code2Session` 41004 `appsecret missing` | 环境变量名没对上：代码读 `appSecret`，集成中心注入 `secret` | 用平台注入名（`secret` / `appKey`），代码已内置旧名回退 |
| `code2Session` 41002 `appid missing` | `appId` 读到空值 | 下单链路优先用请求头 `x-wx-appid`（需走 `callHTTPFunction`），或补 `appId` 环境变量 |
| `code2Session` 40013 `invalid appid` | appid 与 secret 不是一对 | 核对同一应用的 `appId` + `secret`，注意重置与空格 |
| 缺少 code | 前端没调 `wx.login` | 前端先 `wx.login()` 再传 code |
| `code2Session` 40029 | code 无效 / 已使用 / 过期 | 重新 `wx.login()`，`code` 一次性 |
| `code2Session` 45011 | 调用太频繁 | 限频，缓存 sessionKey |

## 回调

| 现象 | 原因 | 处理 |
|---|---|---|
| 微信反复重推同一事件 | 应答体格式与推送格式不一致，或返回非 0 | 按推送格式应答（XML/JSON），或返回空串 / `success` |
| 回调 404 / 收不到推送 | 回调路由被改，或未绑定回调承接资源 | 恢复平台预置路由、完成资源绑定 |
| 收到推送但 `Event` 为空 | XML 未被解析（body 是字符串） | 用 `utils/xml.js` 解析；检查 content-type |
| 解析结果只剩 `{ xml: '...' }` | XML 正则内容部分用了 `[\s\S]*?` | 改用 `[^<]*` |
| 验签不通过 | 安全模式用了 `signature` 校验 | 安全模式必须用 **`msg_signature`** |
| iOS 退款问询被判「不确定」 | 3 次问询均超时 | 应答压进 3 秒（建议判断逻辑 1 秒内） |

## 服务端接口

| 错误 | 原因 | 处理 |
|---|---|---|
| `268490002 签名字段[pay_sig]为空` | `pay_sig` / `signature` 放进了 JSON body | 签名参数放 **query string**：`?access_token=&pay_sig=&signature=` |
| `268490002 数据不存在` | 签名已通过，但该单号在微信侧没有订单 | 先付成功一单再查；代币单查不到（`query_order` 仅现金单） |
| 前端只看到 `system error. code: 400` | 服务端用非 2xx 返回业务错误，`callHTTPFunction` 不把 body 交给前端 | 业务失败统一返回 **HTTP 200 + `code:-1`**（模板已改） |
| 参数错误 | 用了驼峰而非下划线，或字段名照抄了别的接口 | `query_order` 的 body 是 `openid` / `env` / `order_id`，没有 `offer_id`；每个接口各自对文档 |
| `pay_sig` 校验失败（268490003） | uri 用了 `requestVirtualPayment`，或 `post_body` 被重新序列化 | B 端 uri 用**实际接口路径**且不带 query；body 原文即签名基串 |
| `access_token` 失效 | 超过 7200 秒 | 模板已带缓存（提前 5 分钟过期），检查时钟 |
| 获取 token 报 45009 频限 | 冷启动并发同时换 token | 模板已用 in-flight Promise 去重 |
| 重复发货 | 没做幂等或用了内存去重 | 用**平台单号 `wx_order_id`** + 数据库唯一索引（别用 `OutTradeNo`，取消后重下可能复用） |
| 一次失败后订单再也不重推 | 幂等标记先于业务处理写入，或错误全回 `ErrCode=0` | 标记后置 + 业务异常回非 0 |
| 订单 env 校验失败 | `signData.env` / B 端 `env` 被改成非 0 | 模板固定现网，必须传 `0` |
| 接口无需身份即可调用 | 未设 `requireCallerAuth`，或误用可伪造的 header 做鉴权 | 云函数公网暴露时设 `requireCallerAuth=true` |

## 配置

| 现象 | 原因 | 处理 |
|---|---|---|
| 启动告警「配置校验警告」 | 环境变量缺失或名字没对上 | 补齐；不阻断启动，但下单会失败 |
| **所有**候选环境变量为空（`offerId=- appId=- secret=- ...`） | 调用到的不是集成中心托管的函数 | 小程序 `app.js` 的 `functionName` 改为集成中心生成的 `<集成名>-<随机串>` |
| 服务起不来 | 见下方说明 | — |

> 模板的 `validateConfig()` 设计成**只告警不阻断**，支持「先部署、后补凭证」。
> 若服务完全起不来，检查依赖是否安装、端口是否被占，而非凭证。

## 集成边界类

| 现象 | 原因 | 处理 |
|---|---|---|
| 改了云函数名后收不到回调 | 随机串与回调域名子域、环境变量绑定 | **改名即断回调**，恢复原名 |
| 删除集成后云函数还在 | 这是预期行为 | 删除集成只释放回调域名（不可恢复），云函数保留 |
| 改配置后短暂不可用 | 触发重新部署（约 1–2 分钟） | 避开业务高峰 |
