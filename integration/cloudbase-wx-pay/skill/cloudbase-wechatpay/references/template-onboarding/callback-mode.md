# 回调处理：谁验签、怎么判定

> 判定依据只有一个：平台注入的 `notifyURLCallbackType`。
> 回调地址在哪一侧、由谁验签解密，都由它决定；没有第二个开关。

## 三个取值

| 取值 | 回调地址在哪 | 谁验签 / 解密 | 函数侧需要什么 |
|---|---|---|---|
| `system` | 集成中心分配的地址 | 集成中心网关 | 不需要 `token` / `msgSecret`；**不要给函数开公网入口** |
| `ownservice` | 自己的域名 / HTTP 访问服务 | 本函数 | `token` + `msgSecret` 必填；开 HTTP 访问服务 |
| 空（未声明） | 同 `ownservice` | 本函数（fail closed） | 同上 |

代码判定（`payService._resolveCallbackPayload`）：

```javascript
const trustsGateway = notifyUrlCallbackType === 'system';
// system  → 采信 body.ParsedContent（网关已解密）；仍做「时间戳必须有且在 5 分钟内」+ 结构校验
// 其它    → strategy.verifySign() + AES-GCM 解密，验不过直接拒
```

## 变量名以平台注入为准

| 集成类型 | 注入名 |
|---|---|
| 微信支付（本模板） | `notifyURLCallbackType`（URL 全大写） |

> 代码里对 `notifyUrlCallbackType`（驼峰）做了兜底读取，但那只是兼容旧写法，**不要手工填**。
> 不同集成注入的名字不同（例如小程序虚拟支付用的是驼峰），按各自集成的实际注入名为准。

## 两条部署路径

**① 集成中心创建实例（推荐）**

平台会自动注入 `notifyURLCallbackType=system` 和三个回调地址（支付 / 退款 / 转账）。
你要做的只有一件事：**不要给这个函数开 HTTP 访问服务**。

**② 自建公网回调**

- 回调地址填自己的（必须 HTTPS、不带 `?` 参数）
- `token` / `msgSecret` 必须配
- 开 HTTP 访问服务，并在安全组放行微信回调 IP 段
- 保持不声明 `notifyURLCallbackType`（或显式 `ownservice`）

## 主动请求不受影响

下单 / 退款 / 转账**永远**走 SDK 自签名直连微信，与回调由谁验签无关。
验签方式（`verifyMode`）只看是否配置了 `wxPayPublicKey`：

| 配置 | verifyMode | 含义 |
|---|---|---|
| 配了 `wxPayPublicKey` + `wxPayPublicKeyId` | `publickey` | 用微信支付公钥验签 |
| 只配了商户私钥 | `certificate` | SDK 自动拉取并刷新平台证书 |

## 安全边界（必读）

声明只证明「这个实例的回调托管在网关」，**证明不了「本次请求来自网关」**。
如果函数开了公网入口，任何人都能 `POST /unifiedOrderTrigger` 一段：

```json
{"ParsedContent":{"out_trade_no":"X","trade_state":"SUCCESS"}}
```

在 `system` 模式下这段会被当成「支付成功」—— 所以 `system` 模式**必须不开公网入口**。
这条是部署约束，代码强制不了（函数无法自查是否开放了公网入口）。

反过来失败也是安全侧的：声明缺失或拼错 → 按自验签处理 → 网关转发的明文没有 `signature`
→ 401 → 微信重推 15 次后放弃。启动日志会打印当前读到的声明值，先看它再看别的。

## 排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 400 + 日志「缺少/非法 wechatpay-timestamp」 | 网关未转发原始时间戳头 / 代理削掉了头 | 确认转发链保留 `wechatpay-*` 头（缺头一律拒绝，避免重放） |
| 401 `invalid signature` / `missing signature`（网关回调） | 声明不是 `system`（未注入 / 拼错 / 大小写不符） | 确认 `notifyURLCallbackType=system` 已注入；启动日志里看 `[Callback]` 判定 |
| 日志出现「收到网关明文…但平台未声明 system」 | 同上，明文被忽略后走自验签 | 同上 |
| 自建回调 401 | `token` 与微信后台不一致 | 核对 `token`；确认 `msgSecret` 长度 43 位 |
| 回调压根没到 | 地址不对 / 安全组没放行 / 没开 HTTP 访问服务 | 见 [deploy-cloud-function.md](../deployment/deploy-cloud-function.md) |

## 从旧版本升级

历史版本有一个 `signMode`（`sdk` / `gateway`）环境变量，用来手工表达同一件事。
它 **已删除**：平台既然会注入 `notifyURLCallbackType`，再让人维护一份副本只会产生
「声明与配置不一致 → 全拒」的故障。升级时把 `notifyURLCallbackType` 从环境变量里删掉即可，留着也不会被读取。
