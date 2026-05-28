# 环境变量速查

> 完整配置说明见 `references/模板接入/env-config.md`。

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
| `wxPayPublicKey` | 条件必填* | 不需要 | 微信支付公钥（非商户公钥！）。详见 [verify-mode.md](../模板接入/verify-mode.md) |
| `wxPayPublicKeyId` | 条件必填* | 不需要 | 微信支付公钥 ID（与 wxPayPublicKey 成对） |
| `notifyURLPayURL` | 自己的域名（含完整 path） | 集成中心自动生成 | 支付回调地址 |
| `notifyURLRefundsURL` | 自己的域名（含完整 path） | 集成中心自动生成 | 退款回调地址 |
| `transferNotifyUrl` | 自己的域名（含完整 path） | 集成中心自动生成 | 转账回调地址 |
| `corsAllowOrigin` | 选填 | 选填 | CORS 允许来源（多域逗号分隔） |

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
