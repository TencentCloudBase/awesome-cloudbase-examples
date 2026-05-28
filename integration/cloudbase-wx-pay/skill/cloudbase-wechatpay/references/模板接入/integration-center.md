# 集成中心模式接入指南

> 通过 CloudBase 控制台「集成中心」一键创建微信支付集成，平台自动生成云函数、注入凭证、托管回调域名。
> **适合不想手动部署、希望最快跑通支付链路的开发者。**

---

## ⚡ 5 分钟快速路径

> 已有商户号 + 已知如何获取凭证的开发者可直接按以下步骤操作：

1. 控制台创建集成，填入 7 项凭证 → [第二步](#第二步在-cloudbase-创建集成)
2. `app.js` 中填入 `ENV_ID` + `FUNCTION_NAME`（集成生成的真实函数名）
3. 复制下单代码，改 `description` 和 `amount` → [miniprogram-cloud-api.md](../前端集成/miniprogram-cloud-api.md)
4. 真机调试，完成支付 ✅

---

## 集成中心 vs 手动部署

| 维度 | 集成中心模式 | 手动部署（CLI / 云托管） |
|------|:----------:|:-------------------:|
| 凭证管理 | 控制台统一托管，环境变量自动注入 | 自行配置 `cloudbaserc.json` / 控制台环境变量 |
| 回调域名 | 平台自动生成 HTTPS 域名 | 需自行开启 HTTP 访问服务 + 拼装 URL |
| 回调验签 | 集成中心代验签 + 代解密（`signMode=gateway`） | 自行验签 + AES-GCM 解密（`signMode=sdk`） |
| 部署方式 | 一键创建，自动部署 HTTP 云函数 | CLI 部署 / Docker 构建 |
| 灵活度 | 配置修改需通过控制台表单 | 完全自主控制 |
| 适合谁 | 新手 / 只做小程序支付 / 快速验证 | 需要多端支付 / 自定义部署 / 高级控制 |

---

## 第一步 · 准备商户凭证

> 详细步骤见 [merchant-credentials.md](merchant-credentials.md)

完成后应获得以下 **7 项凭证**：

| # | 集成中心字段 / 环境变量 | 形态 | 取值出处 |
|---|------|------|------|
| 1 | `appId` | 小程序 AppID，形如 `wxc1546068399a59fc` | 微信公众平台 |
| 2 | `merchantId` | 10 位数字商户号 | 商户平台首页 |
| 3 | `apiV3Key` | 32 字符 APIv3 密钥 | 商户平台 → 账户中心 → API 安全 |
| 4 | `merchantSerialNumber` | 40 位十六进制证书序列号 | 商户平台 → API 安全 → API 证书 |
| 5 | `privateKey` | `apiclient_key.pem` 完整内容（PEM 文本） | 下载 API 证书后解压获得 |
| 6 | `wxPayPublicKey` | 微信支付公钥 PEM 内容 | 商户平台 → API 安全 → 微信支付公钥 |
| 7 | `wxPayPublicKeyId` | 公钥 ID（`PUB_KEY_ID_...`） | 同上页面展示 |

**公钥与平台证书的区别**：微信支付 V3 验签存在两种方案——「微信支付公钥」（一次下载，长期有效，**推荐**）与「微信支付平台证书」（X.509 证书，会过期，需调接口轮换）。**集成中心表单中填写了微信支付公钥，pay-common 则用公钥方案；否则将按平台证书方案处理。**

---

## 第二步 · 在 CloudBase 创建集成

### 2.1 进入集成中心

路径：[CloudBase 控制台](https://console.cloud.tencent.com/tcb) → 选择环境 → 集成中心 → 微信支付 → 创建集成。

### 2.2 填写集成信息

控制台向导需填写以下内容：

- **集成名称**（自定义，例如 `miniapp-wxpay`）
- 第一步获取的 **7 项凭证**：`appId` / `merchantId` / `apiV3Key` / `merchantSerialNumber` / `privateKey` / `wxPayPublicKey` / `wxPayPublicKeyId`

集成中心将统一托管上述凭证，并用于代处理回调的验签与解密。

### 2.3 自动生成云函数资源

创建成功后，系统自动完成两项操作：

1. **自动创建 HTTP 云函数**——函数名形如 `<集成标识>-<随机串>`，例如 `miniapp-wxpay-rwmx67sc`（本文统称 `pay-common`）
2. **生成回调域名与回调 URL**——用于接收微信支付的异步通知：

| 资源 | 说明 |
|------|------|
| 回调基础域名 | 形如 `https://<集成标识>.integration-callback.tcloudbase.com` |
| 支付回调 | `/wechatpay/order` |
| 退款回调 | `/wechatpay/refund` |
| 转账回调 | `/wechatpay/transfer`（当前版本**暂不支持**，集成中心尚未代处理转账回调；如有需求需自行接管） |

⚠️ 支付回调 URL 需同步填入微信支付商户平台的「支付结果通知 URL」（商户平台 → 产品中心 → 开发配置）。退款回调由 V3 退款接口请求中携带的 `notify_url` 决定，pay-common 已自动使用集成中心生成的对应 URL，无需手动填写。

---

## 第三步 · 了解自动注入的环境变量

创建集成时，平台已经把表单中的全部参数（AppID、商户号、APIv3 密钥、证书、私钥、回调地址等）作为**环境变量**注入到云函数。运行时通过 `process.env` 读取，**业务代码中不会出现明文凭证，用户无需维护任何配置文件**。

如需修改配置，进入「集成中心 → 对应集成 → 编辑」，保存后平台将自动重新部署云函数。

### 集成中心自动注入的环境变量

| 变量 | 是否必填 | 说明 |
|------|---------|------|
| `signMode` | 是 | 模式开关，集成中心默认为 **`gateway`** |
| `appId` | 是 | 小程序 AppID |
| `merchantId` | 是 | 商户号 |
| `apiV3Key` | 是 | APIv3 密钥 |
| `merchantSerialNumber` | 是 | 商户证书序列号 |
| `privateKey` | 是 | `apiclient_key.pem` 内容 |
| `wxPayPublicKey` | 是 | 微信支付公钥 PEM |
| `wxPayPublicKeyId` | 是 | 微信支付公钥 ID |
| `notifyURLPayURL` | 是 | 集成中心支付回调 URL（**自动注入**） |
| `notifyURLRefundsURL` | 是 | 集成中心退款回调 URL（**自动注入**） |
| `transferNotifyUrl` | 否 | 集成中心转账回调 URL。当前版本暂不支持，留空即可 |

> 与手动部署的关键区别：
> - **回调 URL 由平台自动生成**——格式为 `https://<集成标识>.integration-callback.tcloudbase.com/wechatpay/*`
> - **signMode 固定为 `gateway`**——回调由集成中心代验签、代解密，业务代码直接读明文
> - **`cloudbaserc.json` 和 `Dockerfile` 不使用**——集成中心自动管理部署

---

## 第四步 · signMode=gateway 的特殊行为

集成中心模式下 `signMode` 注入为 `gateway`，这影响两个方面：

### 主动请求（下单/退款/转账）

**不受影响**——仍由 `sdkStrategy` 使用商户 API 私钥在云函数内本地签名并直连微信支付 API。

### 回调处理

**与 SDK 模式不同**——`gateway` 模式下：

| 步骤 | SDK 模式（`signMode=sdk`） | Gateway 模式（`signMode=gateway`） |
|------|--------------------------|----------------------------------|
| 接收回调 | 自己的 HTTP 访问服务域名 | 集成中心域名（`integration-callback.tcloudbase.com`） |
| 验签 | 自己验签（`wechatpay-node-v3` SDK） | 集成中心代验签 ✅ |
| 解密 | 自己 AES-GCM 解密 | 集成中心代解密 ✅ |
| 传给云函数 | 原始密文 | **明文**（集成中心解密后通过云函数调用传入 `body.ParsedContent`） |

业务代码无需关心验签与解密细节，`pay-common` 的路由层已自动适配两种模式。

---

## 第五步 · 接入前端

集成中心创建完成后，前端接入方式与手动部署相同：

| 前端场景 | 参考文档 |
|---------|---------|
| 小程序（推荐 `callHTTPFunction`） | [miniprogram-cloud-api.md](../前端集成/miniprogram-cloud-api.md) |
| 微搭低码小程序 | [weda-miniprogram.md](../前端集成/weda-miniprogram.md) |
| H5 支付 | [web-h5.md](../前端集成/web-h5.md) |
| Native 扫码 | [web-native.md](../前端集成/web-native.md) |
| APP 支付 | [app.md](../前端集成/app.md) |

⚠️ **函数名注意**：前端代码中的函数名必须使用**集成创建后生成的真实函数名**（形如 `miniapp-wxpay-rwmx67sc`），而非默认的 `pay-common`。在控制台 → 集成中心 → 对应集成详情页中查看。

---

## 第六步 · 源码查看与自定义

如需查看或下载自动生成的云函数源码，可使用 `tcb fn code <函数名> --download` 或在控制台查看。

目录结构：

```
pay-common/
├── index.js                      HTTP 云函数入口（CLI 部署入口）
├── app.js                        Express 应用入口，路由分发（_action）
├── scf_bootstrap                 HTTP 云函数启动脚本（监听 9000 端口）
├── bin/
│   └── www                       本地/容器启动脚本（监听 3000 端口）
├── Dockerfile                    云托管部署配置（集成中心模式下不使用）
├── cloudbaserc.json              CloudBase CLI 部署配置（集成中心模式下无需修改）
├── package.json
├── config/
│   └── config.js                 读取 process.env，处理 PEM 规范化与凭证校验
├── controllers/
│   └── payController.js          路由控制器（下单、查单、退款、转账、回调）
├── routes/
│   └── pay.js                    对外路由定义
├── services/
│   ├── payService.js             统一入口，按 signMode 路由到策略
│   ├── orderService.js           回调处理（需对接业务系统）
│   └── strategies/
│       └── sdkStrategy.js        SDK 自签名策略（主动请求均走此策略）
├── utils/
│   ├── validator.js              参数校验
│   └── cloudbaseAuth.js          从请求 header 中提取 openid
└── tests/                        单元/集成测试
```

**业务对接位置**：在 `services/orderService.js` 中实现回调处理方法，其他文件通常无需修改。详见 [order-service.md](../业务开发/order-service.md)。

---

## 集成中心专属 FAQ

### Q1：创建集成报 NOT_ENOUGH / 平台证书已过期失效

详见 [troubleshooting.md §3.7 集成创建问题](../问题排查/troubleshooting.md)

### Q2：下单返回 MISSING_CREDENTIALS

`MISSING_CREDENTIALS` 通常来自云函数侧凭证缺失。回到「集成中心 → 对应集成 → 编辑」，对照上方凭证清单逐项核对：7 项**均为必填**。保存后会触发自动重部署，1–2 分钟后可再次验证。

### Q3：下单返回 DECODER routines unsupported

PEM 私钥被 OpenSSL 拒绝解码。通常为集成中心表单中粘贴时缺失首尾行或换行被替换导致。检查项：

- 是否包含完整的 `-----BEGIN PRIVATE KEY-----` 与 `-----END PRIVATE KEY-----` 头尾行
- 中间内容的换行是否被替换为空格（建议直接复制 `apiclient_key.pem` 文件内容整段粘贴）
- 首尾是否存在多余空格

修改后在集成中心保存以触发重新部署。`config/config.js` 的 `normalizePem()` 会将字面 `\n` 还原为真实换行，正常情况下无需手动处理。

### Q4：未收到回调通知（集成中心模式）

按顺序排查：

1. **回调 URL 是否正确**：商户平台的通知 URL 是否指向集成中心（`https://<集成标识>.integration-callback.tcloudbase.com/wechatpay/order`）
2. **APIv3 密钥是否一致**：集成中心填写的 APIv3 密钥是否与商户平台设置的一致
3. **集成状态是否正常**：集成中心详情页状态是否为「已激活」
4. **函数日志是否有调用**：函数日志中是否出现 `handlerUnifiedTrigger`；若无，请在商户平台「交易中心 → 通知查询」中查看微信侧状态

### Q5：修改凭证后未生效

在集成中心编辑并保存后，平台会自动触发重新部署。部署过程约需 1-2 分钟，期间服务可能短暂不可用。可在云函数列表中查看部署状态。

---

## 延伸阅读

| 主题 | 链接 |
|------|------|
| JSAPI 下单（小程序/公众号支付） | https://pay.weixin.qq.com/doc/v3/merchant/4012791897 |
| 支付回调协议 | https://pay.weixin.qq.com/doc/v3/merchant/4012791901 |
| `wx.requestPayment` API | https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestPayment.html |
| `wx.cloud.callHTTPFunction` | https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/utils/Cloud.callHTTPFunction.html |

---

*手动部署方式见 [quick-start.md](quick-start.md) | 环境变量配置见 [env-config.md](env-config.md) | 签名模式见 [sign-mode.md](sign-mode.md)*
