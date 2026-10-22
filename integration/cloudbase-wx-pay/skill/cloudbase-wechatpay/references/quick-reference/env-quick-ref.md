# 环境变量速查

> 完整配置说明见 `references/template-onboarding/env-config.md`。

---

## 变量速查表

| 变量 | SDK 模式 | Gateway 模式 | 说明 |
|------|---------|-------------|------|
| `signMode` | `sdk` | `gateway` | 签名模式切换 |
| `appId` | 必填 | 必填 | 小程序/公众号 AppID |
| `merchantId` | 必填 | 必填 | 商户号（10 位数字） |
| `merchantSerialNumber` | 必填 | 必填 | API 证书序列号 |
| `apiV3Key` | 必填 | 必填 | APIv3 密钥（32 字节） |
| `privateKey` | 必填 | 必填 | 商户 API 私钥（PEM，换行用 `\n`） |
| `wxPayPublicKey` | 条件必填* | 不需要 | 微信支付公钥（非商户公钥！）。详见 [verify-mode.md](../template-onboarding/verify-mode.md) |
| `wxPayPublicKeyId` | 条件必填* | 不需要 | 微信支付公钥 ID（与 wxPayPublicKey 成对） |
| `notifyURLPayURL` | 自己的域名（含完整 path） | 集成中心自动生成 | 支付回调地址 |
| `notifyURLRefundsURL` | 自己的域名（含完整 path） | 集成中心自动生成 | 退款回调地址 |
| `transferNotifyUrl` | 自己的域名（含完整 path） | 集成中心自动生成 | 转账回调地址 |
| `corsAllowOrigin` | 选填 | 选填 | CORS 允许来源（多域逗号分隔） |
| `PAY_GUARD` | 联调选填 | `on`（部署配置已预置）| **全模板唯一的开关**。`off` = 跳过 4 个钩子（金额核定 + 订单归属 / 转账权限）；`on` 或不设 = 全部拒绝（下单退款 400、查单退款转账 403）。见下方小节 |

---

## 联调开关（`PAY_GUARD`，唯一一个）

模板 `orderService` 的 4 个钩子**默认全返回 `{ ok: false }`**，所以不改代码直接跑会得到：

| 操作 | 默认结果 |
|---|---|
| 下单 | `400 订单金额校验失败` |
| 退款 | `400 退款金额校验失败` |
| 查单 / 关单 / 退款 / 查退款 | `403 查单被拒绝…` |
| 转账 / 查转账单 | `403 转账被拒绝…` |

这是 fail closed 的预期行为，不是配置错了。联调阶段（还没有商品表 / 订单表）打开**这一个**开关即可全部放行。

> 🔒 只有 `PAY_GUARD=off` 才放行；`on`、不设、拼错的值（`dev` / `true`）一律按生产处理。
> `cloudbaserc.json` / `Dockerfile` 已预置 `PAY_GUARD=on`，部署后即使忘了改也保持拒绝。
> 本地联调直接 `npm run dev`，不用手工配变量。

| 使用方式 | 加在哪 | 生效时机 |
|---|---|---|
| 集成中心创建云函数 → 下载 example 联调 | 控制台 → 函数管理 → `pay-common` → 函数配置 → 环境变量（云上还要加 `PAY_ALLOW_INSECURE_BOOT=true`，否则拒绝启动） | 保存即生效，不用重新部署 |
| example 代码 → CLI 部署 → 绑定后联调 | `cloudbaserc.json` → `functions[0].envVariables` | 部署时写入，改完要重新 `tcb fn deploy` |
| 云托管 | 控制台 → 服务配置 → 环境变量 | 保存后重启实例 |
| 本地 `npm start` | `export PAY_GUARD=off`（无 dotenv，`.env` 不自动加载） | 启动即生效 |

> 仓库自带的 `cloudbaserc.json` / `Dockerfile` 已预置 `PAY_GUARD=on`（不设也是 on），
> 直接部署不会把金额与订单归属交给客户端；要联调只能显式改成 `off`。

**上线前必须**：① 删除该变量 ② 在 `verifyAmount` / `verifyRefundAmount` / `verifyOrderOwner` /
`verifyTransferAllowed` 里接数据库核定并返回 `{ ok: true }`。
详见 [order-service.md](../business-logic/order-service.md) 与 [security-checklist.md](../business-logic/security-checklist.md)。

---

## 关键差异

- **凭证基本相同**，但 SDK 模式下 `wxPayPublicKey` / `wxPayPublicKeyId` 可选（不配则自动走证书验签）
- 区别主要在于**回调 URL 和部署要求**
- **SDK 模式**：回调指向自己的服务（HTTP 访问服务域名，**必须包含路由 Path**）；回调路由不能开身份认证；回调不能走云 API 网关
  - URL 组装公式：`{HTTP访问服务域名}/{路由Path}/{API路径}`
  - 真实示例：`https://test-wxpay-xxx.ap-shanghai.app.tcloudbase.com/pay/wx-pay/unifiedOrderTrigger`
  - 详见 `quick-start.md` Step 4.2-4.3
- **Gateway 模式**：回调地址指向集成中心，由控制台自动生成，**直接复制填入即可**；无特殊部署约束；前端可走云 API 网关

---

## Demo 索引

| Demo | 来源 | 调用方式 | 适用部署 |
|------|------|---------|---------|
| **小程序（云函数版）** | [GitHub](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/examples/miniprogram) | `wx.cloud.callHTTPFunction` | HTTP 云函数 |
| **小程序（云托管版）** | [GitHub](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/examples/miniprogram-cloudrun) | `wx.cloud.callContainer` | 云托管 |
| **React Web** | 本地 `examples/react/` | React + Vite 直连 | 静态托管 + HTTP 访问服务 |

> 小程序 Demo 前置条件：已开通 CloudBase 环境 + pay-common 已部署 + 商户号已配置 + 基础库 ≥ 3.15.2 + 无需 npm 构建
