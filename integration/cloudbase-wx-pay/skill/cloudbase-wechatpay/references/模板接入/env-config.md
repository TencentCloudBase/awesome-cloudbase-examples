# 环境变量完整配置指南

> 基于 `pay-common/README.md` §Step 3 + `开发注意事项与模板使用指南.md` §二 整理。

---

## 配置文件位置

`.env` 文件位于 `pay-common` 项目根目录。首次使用时从模板复制：

```bash
cp .env.example .env
```

**重要**：`.env` 包含敏感信息（私钥、密钥），务必加入 `.gitignore`。

---

## 全量配置项清单

### 基础信息

| 变量名 | 必填 | 示例值 | 说明 |
|--------|:----:|--------|------|
| `signMode` | 是 | `sdk` \| `gateway` | 签名模式。`sdk`=SDK 自验签（自己部署时用）；`gateway`=集成中心代签（控制台创建时用，**也是代码级默认值**）。详见 [sign-mode.md](sign-mode.md) |
| `appId` | 是 | `YOUR_APP_ID` | 小程序/公众号 AppID，需已在商户平台绑定 |
| `merchantId` | 是 | `YOUR_MERCHANT_ID` | 微信支付商户号（10 位数字） |

### 凭证（PEM 格式）

| 变量名 | 必填 | 格式说明 | 注意事项 |
|--------|:----:|---------|---------|
| `merchantSerialNumber` | 是 | `YOUR_SERIAL_NUMBER` | API 证书序列号，40 位十六进制 |
| `apiV3Key` | 是 | `YOUR_API_V3_KEY`（32 字节） | APIv3 密钥，用于回调解密 |
| `privateKey` | 是 | PEM 字符串，换行用 `\n` 表示 | **最易出错项**，详见下方格式说明 |
| `wxPayPublicKey` | 是 | PEM 字符串，换行用 `\n` 表示 | 微信支付公钥（不是商户公钥！）|
| `wxPayPublicKeyId` | 是 | `YOUR_WX_PAY_PUBLIC_KEY_ID` | 微信支付公钥 ID |

### 回调地址

| 变量名 | 必填 | 说明 | 格式要求 |
|--------|:----:|------|---------|
| `notifyURLPayURL` | 是 | 支付回调通知 URL | HTTPS，不能 localhost，不能带 `?` 参数 |
| `notifyURLRefundsURL` | 是 | 退款回调通知 URL | 同上 |
| `transferNotifyUrl` | 是 | 转账回调通知 URL | 同上 |

### 可选配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|:----:|--------|------|
| `corsAllowOrigin` | 否 | 空（允许所有来源）| CORS 允许的前端域名，多个逗号分隔。生产环境建议填写 |

---

## 私钥格式详解（最容易踩坑）

### 正确格式

```env
# .env 中 privateKey 的正确写法：
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_PEM_CONTENT\n-----END PRIVATE KEY-----
```

**要点**：
- 整个 PEM 内容写在一行中
- 每行之间的换行用字面字符串 `\n` 表示（两个字符：反斜杠 + n）
- 不是真正的换行符

### 常见错误

| 错误写法 | 问题 |
|---------|------|
| 换行写成真换行（多行） | `.env` 解析可能出错，或被截断 |
| 用 `\\n`（四个字符）| 双重转义导致 `\n` 变成字面文本 |
| 复制了多余空格 | PEM 解析失败 |

### 验证方法

运行诊断脚本检查格式是否正确：

```bash
python3 scripts/check_pem_format.py '你的privateKey值'
```

或启动服务后查看日志输出 `[Config Debug] privateKey 包含真换行: true`。

> **为什么用 `\n`？** 因为 `config.js` 会做 `.replace(/\\n/g, '\n')` 转换，
> 将字面 `\n` 还原为真换行后再传给 SDK 使用。

---

## 公钥陷阱：微信支付公钥 vs 商户公键

这是第二常见的签名问题：

| 类型 | 用途 | 来源 |
|------|------|------|
| **微信支付公钥** (`wxPayPublicKey`) | ✅ 验签微信回调 | 商户平台 → API 安全 → 微信支付公钥 |
| 商户 API 公钥 | ❌ 不用于本模板 | 申请 API 证书时生成的一对公钥之一 |

**混淆后果**：用商户公钥验签微信回调 → 签名验证始终失败。

---

## 回调 URL 规则

| 规则 | 说明 |
|------|------|
| 必须 HTTPS | 微信不支持 HTTP 回调 |
| 不能是 localhost | 本地调试需用 ngrok 等内网穿透 |
| 不能带查询参数 `?` | 如 `?token=xxx`，微信会拒绝请求 |
| 必须公网可达 | 云函数需开启 HTTP 访问服务；云托管自动有公网域名 |

### 各模式的回调 URL 差异

| signMode | notifyURLPayURL 指向 | 谁来验签/解密 |
|----------|-------------------|-------------|
| `sdk` | 你自己的服务域名（从控制台「HTTP 访问服务」获取，替换 `<YOUR_HTTP_DOMAIN>`） | 你的服务自行验签 + AES-GCM 解密 |
| `gateway` | 集成中心域名（如 `https://integration-xxx.tcloudbase.com/wechatpay/order`） | 集成中心验签解密后转发明文给你 |

---

## SDK 模式 vs Gateway 模式配置对比

### 相同点

两种模式的**凭证配置完全相同**（都需要 appId、merchantId、privateKey、公钥等），因为**主动请求都走 SDK 自签名直连微信**。

### 不同点

| 配置项 | SDK 模式 | Gateway 模式 |
|--------|---------|-------------|
| `signMode` | `sdk` | `gateway` |
| 回调 URL | 指向自己的服务 | 指向集成中心 |
| 回调处理 | 自己验签 + AES-GCM 解密 | 读集成中心转发过来的明文 |
| 适用场景 | 云托管直连、自建服务器 | CloudBase 集成中心 |

> 详细对比见 [sign-mode.md](sign-mode.md)。

---

## 完整配置示例（复制即用）

### 最小可用配置（SDK 模式，仅支付功能）

```env
signMode=sdk
appId=YOUR_APP_ID
merchantId=YOUR_MERCHANT_ID
merchantSerialNumber=YOUR_SERIAL_NUMBER
apiV3Key=YOUR_API_V3_KEY
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_PEM_CONTENT\n-----END PRIVATE KEY-----
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_WX_PAY_PUBLIC_KEY_PEM_CONTENT\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID
notifyURLPayURL=https://<YOUR_HTTP_DOMAIN>/cloudrun/v1/pay/unifiedOrderTrigger
notifyURLRefundsURL=https://<YOUR_HTTP_DOMAIN>/cloudrun/v1/pay/refundTrigger
```

### 含转账功能的完整配置

在上面基础上增加：

```env
transferNotifyUrl=https://<YOUR_HTTP_DOMAIN>/cloudrun/v1/pay/transferTrigger
corsAllowOrigin=https://your-mini-program-domain.com
```

---

## 配置校验

完成 `.env` 编写后，运行校验脚本检查完整性：

```bash
bash scripts/validate_env.sh /path/to/your/.env
```

脚本会检查：
- 所有必填变量是否存在
- `signMode` 是否为合法值（`sdk`/`gateway`）
- `privateKey` 和 `wxPayPublicKey` 是否符合 PEM 格式
- 回调 URL 是否为 HTTPS 格式
- `appId` 和 `merchantId` 格式是否合理

*签名模式深度说明见 [sign-mode.md](sign-mode.md)*
