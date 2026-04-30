# 快速开始：5 分钟从零到下单成功

> 基于 `pay-common/README.md` Step 1‑6 + `pay-common-best-practices.md` 整理。

---

## 前提条件

在开始之前，确认你已具备以下条件：

| 条件 | 说明 | 获取方式 |
|------|------|---------|
| 微信支付商户号 | 10 位数字 | [商户平台](https://pay.weixin.qq.com/) → 账户中心 |
| API 证书（私钥） | `apiclient_key.pem` 文件 | 商户平台 → API 安全 → API 证书 |
| 微信支付公钥 + 公钥 ID | 用于验签回调 | 商户平台 → API 安全 → 微信支付公钥 |
| APIv3 密钥 | 32 字节字符串 | 商户平台 → API 安全 → APIv3 密钥 |
| AppID | 已绑定商户号的小程序/公众号 AppID | 微信公众平台 |
| CloudBase CLI | 用于部署云函数 | `npm install -g @cloudbase/cli` |

> **注意**：微信支付公钥 ≠ 商户公钥。前者用于验签微信回调，后者是证书配对用的。搞混会导致签名失败！

---

## Step 1：获取模板

```bash
# 方式一：从 GitHub 官方仓库克隆（推荐）
git clone https://github.com/TencentCloudBase/awesome-cloudbase-examples.git
cd awesome-cloudbase-examples/integration/cloudbase-wx-pay/functions/pay-common

# 方式二：如果你已有本地 pay-common 目录，直接使用
cd your-project-name/pay-common

# 安装依赖
npm install
```

> 小程序前端 Demo 在同一仓库的 `example/miniprogram/` 目录。

## Step 2：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env`，填入你的商户参数。**根据部署方式选择签名模式**：

### 方式 A：SDK 模式（自行验签解密）

适用于：HTTP 云函数 + HTTP 访问服务、云托管直连部署、自建服务器。

> ⚠️ **SDK 模式的 3 条硬性约束**：
>
> | # | 约束 | 说明 |
> |---|------|------|
> | 1 | **回调必须走 HTTP 访问服务**，不能走云 API 网关 | 微信服务器直接 POST 回调到你的服务 |
> | 2 | **HTTP 访问服务的回调路由不能开启身份认证** | 微信回调不带 Token，开了会被拦截 |
> | 3 | **回调 URL 必须带完整路径** | 域名后带环境子路径，如 `/xxx-env/wx-pay/unifiedOrderTrigger` |
>
> **简单总结**：SDK 模式 = 开 HTTP 访问服务 → 关掉回调路由身份认证 → 回调 URL 写完整路径。

```env
signMode=sdk
appId=你的AppID
merchantId=你的商户号
merchantSerialNumber=你的证书序列号
apiV3Key=你的APIv3密钥
# ⚠️⚠️⚠️ APIv3 密钥不仅是请求签名的密钥，更是接收回调通知的前提条件！
#    未在商户平台设置 → 微信支付不会发送任何回调（支付结果、退款、转账通知全部收不到！）
#    设置路径：商户平台 → 账户中心 → API 安全 → APIv3 密钥 → 设置（32 字符字符串）
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_PEM_CONTENT\n-----END PRIVATE KEY-----
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_WX_PAY_PUBLIC_KEY_PEM_CONTENT\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID

# 回调地址 = HTTP 访问服务域名 + 路由Path + API路径
# 完整格式见下方 Step 4.3「填写回调 URL」章节
#
# 示例（假设路由 Path 为 /pay/wx-pay）：
#   https://{envId}-{appId}.{region}.app.tcloudbase.com/pay/wx-pay/unifiedOrderTrigger
#    ───────────────────────────────────────────────────────────   ────  ─────────────────────
#    从控制台 HTTP访问服务 页面复制                                   路由Path  pay-common 的回调 API 路径
#
notifyURLPayURL=https://你的HTTP访问服务域名/你的路由Path/unifiedOrderTrigger
notifyURLRefundsURL=https://你的HTTP访问服务域名/你的路由Path/refundTrigger
transferNotifyUrl=https://你的HTTP访问服务域名/你的路由Path/transferTrigger

corsAllowOrigin=https://your-frontend-domain.com
```

### 方式 B：Gateway 模式（集成中心代签）

适用于：CloudBase 集成中心，回调经集成中心解密转发。

```env
signMode=gateway
appId=你的AppID
merchantId=你的商户号
merchantSerialNumber=你的证书序列号
apiV3Key=你的APIv3密钥
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_PEM_CONTENT\n-----END PRIVATE KEY-----
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_WX_PAY_PUBLIC_KEY_PEM_CONTENT\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID
# 回调地址指向集成中心（由集成中心解密后转发明文）
notifyURLPayURL=https://integration-xxx.tcloudbase.com/wechatpay/order
notifyURLRefundsURL=https://integration-xxx.tcloudbase.com/wechatpay/refund
transferNotifyUrl=https://integration-xxx.tcloudbase.com/wechatpay/transfer
corsAllowOrigin=https://your-frontend-domain.com
```

> **关键区别**：凭证完全相同，只有回调 URL 不同。详见 [sign-mode.md](sign-mode.md)。

## Step 3：本地测试

```bash
# 启动本地开发服务器
npm start
# 服务启动在 http://localhost:3000

# 测试下单（JSAPI）
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_order \
  -H "Content-Type: application/json" \
  -d '{
    "description": "测试商品",
    "out_trade_no": "TEST'$(date +%Y%m%d%H%M%S)'",
    "amount": {"total": 1, "currency": "CNY"},
    "payer": {"openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o"}
  }'
```

预期返回：
```json
{"code": 0, "msg": "success", "data": {"prepay_id": "wx201410272009395522657a690389285100", ...}}
```

如果返回 `code: -1`，检查 `.env` 配置是否正确。可运行诊断脚本：

```bash
bash scripts/validate_env.sh .env
```

## Step 3.5：理解 CloudBase 云函数的三种调用方式 ⭐

> **这是部署前必须搞清的概念。** 很多新手问：「为什么不能用 `wx.cloud.callFunction`？」答案就在这里。

### 三种调用方式总览

> **术语对照**：**「事件型函数」=「普通型函数」** = `cloudbaserc.json` 中不声明 `"type": "HTTP"` 的默认函数类型。这是 CloudBase 官方文档的叫法，本质就是你日常用 `wx.cloud.callFunction()` 调用的那种普通云函数。

CloudBase 云函数支持**三种外部调用路径**，它们在域名、鉴权、适用场景上完全不同：

| | **① 事件型（普通型）调用** `callFunction` | **② HTTP 云 API 网关** | **③ HTTP 访问服务** |
|---|---|---|---|
| **调用方式** | `wx.cloud.callFunction()` / Web SDK `app.callFunction()` | `POST https://{envId}.api.tcloudbasegateway.com/v1/functions/{name}?webfn=true` | `POST https://{自定义域名}/{路由Path}`` |
| **协议** | CloudBase 内部私有协议 | 标准 HTTPS + JSON | 标准 HTTP(S)，任意客户端可访问 |
| **鉴权** | SDK 自动携带登录态（openId） | 手动传 `Authorization: Bearer {token}` | 无内置鉴权（自行处理或关闭） |
| **公网可达** | ❌ 不暴露公网地址 | ✅ 需 Token 才能调用 | ✅ 域名直接暴露，任何人可 POST |
| **函数类型要求** | **事件型 / 普通型**（cloudbaserc.json **无** `type` 字段） | **HTTP 函数**（`type: "HTTP"`） | **HTTP 函数**（`type: "HTTP"` + 路由配置） |
| **能否接收微信回调** | ❌ 不能（无公网入口） | ❌ 不能（微信不会带 Token） | ✅ **唯一能接收微信回调的方式** |

### 调用方式详解

#### ① 事件型（普通型）调用（`callFunction`）

小程序中最常见的调用方式，通过微信/CloudBase SDK 内部通道直连云函数：

```javascript
// 小程序端
wx.cloud.callFunction({
  name: 'myFunc',
  data: { a: 1 },
  success: res => console.log(res.result)   // 直接拿到返回值
})

// Web 端
const app = tcb.init({ env: 'env-id' })
await app.auth().signInAnonymously()
const res = await app.callFunction({ name: 'myFunc', data: { a: 1 } })
```

**特点**：
- 自动携带用户 openId → 云函数中通过 `event.userInfo.openId` 获取
- 无需管理 Token、域名、CORS 等问题
- 但**无法被外部系统（如微信支付服务器）直接访问**

#### ② HTTP 云 API 网关

将 HTTP 函数作为标准 REST API 调用，走 CloudBase 内部网关：

```bash
# cURL 调用示例
curl -L 'https://{envId}.api.tcloudbasegateway.com/v1/functions/pay-common?webfn=true' \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"_action": "wxpay_order", ...}'
```

```javascript
// 小程序端封装（见 Step 5.2）
const API_GATEWAY = `https://${envId}.api.tcloudbasegateway.com`
wx.request({
  url: `${API_GATEWAY}/v1/functions/pay-common?webfn=true`,
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`  // 必须手动携带
  },
  data: { _action: 'wxpay_order', ... }
})
```

**关键点**：
- URL 中**必须带 `?webfn=true` 参数**，否则网关会按事件型格式解析请求体，导致参数丢失
- Token 通过 `auth.signInWithOpenId()` 登录后从 session 获取
- **微信服务器无法通过此路径回调**——因为微信不知道你的 Token，也不会带 Authorization 头

#### ③ HTTP 访问服务

为 HTTP 函数分配一个**公网自定义域名**，任何客户端都能直接访问：

```bash
# 微信支付服务器回调（无需 Token）
curl -X POST 'https://{domain}/{path}/unifiedOrderTrigger' \
  -H "Content-Type: application/json" \
  -d '{...微信回调 XML/JSON...}'

# 浏览器端 / H5 页面直接调用
fetch('https://{domain}/{path}/wxpay_order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
})
```

**配置要求**：
1. 控制台 → 环境管理 → **开启 HTTP 访问服务**
2. 配置**路由 Path**（如 `/pay/wx-pay`），绑定到 pay-common 函数
3. 回调路由的**身份认证必须关闭**（微信不带鉴权信息）
4. （可选）配置 CORS 允许前端跨域

### 为什么 pay-common 不能用事件型调用？

```
┌──────────────────────────────────────────────────────────────┐
│  问题：微信支付回调如何到达你的云函数？                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ❌ wx.cloud.callFunction()                                  │
│     → 内部通道，无公网地址                                    │
│     → 微信服务器根本无法访问                                 │
│                                                              │
│  ❌ HTTP API 网关（带 ?webfn=true）                           │
│     → 需要 Bearer Token 鉴权                                │
│     → 微信支付回调不带 Token → 401 拦截                     │
│                                                              │
│  ✅ HTTP 访问服务                                             │
│     → 公网域名，无需 Token                                   │
│     → 微信服务器可直接 POST 回调                             │
│     → 这是唯一的可行方案！                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**结论**：pay-common 在 `cloudbaserc.json` 中必须声明 `"type": "HTTP"`，原因不是前端调用需要，而是**只有 HTTP 类型函数才能通过 HTTP 访问服务接收微信支付的异步回调通知**。

> 前端仍然可以用 `wx.cloud.callFunction()` 调用其他普通事件型云函数（如数据库操作），但涉及**接收外部回调**的场景（支付、退款、转账通知），必须使用 HTTP 函数 + HTTP 访问服务。

---

## Step 4：部署

### 4.0 理解 SDK 模式的双通道架构 ⭐

> **这是最关键的概念，理解了就不会配错！**

SDK 验签模式下，小程序 Demo 的请求走 **两个完全不同的通道**：

```
┌─────────────────────────────────────────────────────────────────────┐
│                      小程序 SDK 模式双通道架构                        │
│                                                                     │
│  通道一：前端 → 后端（主动请求）                                        │
│  ─────────────────────────────                                      │
│  小程序 wx.request                                                  │
│       ↓                                                             │
│  云 API 网关（鉴权层：Bearer Token）                                   │
│  https://{envId}.api.tcloudbasegateway.com                          │
│       ↓                                                             │
│  pay-common 云函数                                                   │
│       ↓                                                             │
│  微信支付 API（下单 / 查单 / 退款 / 转账）                             │
│                                                                     │
│  通道二：微信服务器 → 你的服务（回调通知）                               │
│  ───────────────────────────────────                                 │
│  微信支付服务器 POST                                                  │
│       ↓                                                             │
│  HTTP 访问服务域名（无鉴权！）                                         │
│  https://{envId}-{appId}.tcloudbasegateway.com/{path}               │
│       ↓                                                             │
│  pay-common 云函数（验签 + 解密 + 业务处理）                            │
│                                                                     │
│  ⚠️ 两个通道的域名不同、鉴权方式不同、配置位置不同！                       │
└─────────────────────────────────────────────────────────────────────┘
```

| | **通道一（前端主动请求）** | **通道二（微信回调）** |
|---|---|---|
| **发起方** | 小程序 / Web 前端 | 微信支付服务器 |
| **目标域名** | 云 API 网关域名 | **HTTP 访问服务域名** |
| **鉴权方式** | Bearer Token（登录后获取） | **无鉴权**（微信不带 Token） |
| **路由路径** | `/v1/functions/pay-common` | `/{你的路径}/unifiedOrderTrigger` |
| **配置位置** | 前端代码写死 | **环境变量 `.env` 的 `notifyURL*`** |

### 4.1 配置 cloudbaserc.json 并部署云函数 ⭐

> **`cloudbaserc.json` 是 CloudBase 部署的核心配置文件，定义了云函数名称、类型、运行时、环境变量等关键信息。**

编辑项目根目录下的 `cloudbaserc.json`（基于官方 pay-common 模板）：

```json
{
  "$schema": "https://static.cloudbase.net/cli/cloudbaserc.schema.json",
  "envId": "your-env-id",
  "functions": [
    {
      "name": "pay-common",
      "type": "HTTP",
      "runtime": "Nodejs18.15",
      "handler": "index.main",
      "timeout": 30,
      "memorySize": 256,
      "installDependency": true,
      "ignore": ["node_modules", ".git", ".env"],
      "envVariables": {
        "signMode": "sdk",
        "appId": "YOUR_APP_ID",
        "merchantId": "YOUR_MERCHANT_ID",
        "merchantSerialNumber": "YOUR_MERCHANT_SERIAL_NUMBER",
        "apiV3Key": "YOUR_API_V3_KEY",
        "privateKey": "YOUR_PRIVATE_KEY_CONTENT",
        "wxPayPublicKey": "YOUR_WX_PAY_PUBLIC_KEY_CONTENT",
        "wxPayPublicKeyId": "YOUR_WX_PAY_PUBLIC_KEY_ID",
        "notifyURLPayURL": "https://YOUR_DOMAIN/wx-pay/unifiedOrderTrigger",
        "notifyURLRefundsURL": "https://YOUR_DOMAIN/wx-pay/refundTrigger",
        "transferNotifyUrl": "https://YOUR_DOMAIN/wx-pay/transferTrigger"
      }
    }
  ],
  "cloudrun": {
    "name": "pay-common"
  }
}
```

**关键字段说明**（⭐ = 最重要）：

| 字段 | 值 | 说明 |
|------|:---:|------|
| `envId` | 你的环境 ID | CloudBase 环境唯一标识 |
| **`"type": "HTTP"`** ⭐ | `"HTTP"` | **声明为 HTTP 云函数！没有此字段或值为其他则无法通过 HTTP 访问服务访问** |
| `runtime` | `"Nodejs18.15"` | Node.js 运行时版本（建议 18+） |
| `handler` | `"index.main"` | 入口函数，对应 `index.js` 的 `exports.main` |
| `timeout` | `30` | 超时时间（秒），回调处理建议设大些 |
| **`envVariables`** ⭐ | 见上方 | **环境变量可在此声明，也可在控制台配置（见下方 Step 4.4）** |

#### 方式 A：HTTP 云函数（推荐，SDK 模式必选此方式处理回调）

```bash
# 1. 登录 CloudBase
tcb login

# 2. 编辑 cloudbaserc.json（填入 envId + envVariables，见上方）
# 3. 部署
tcb fn deploy pay-common

# 4. 确认部署成功（应看到 type=HTTP）
tcb fn list
```

预期输出：
```
✓ 部署成功: pay-common (version: 20260429173000, type: HTTP)
```

> ⚠️ 如果 `tcb fn list` 显示的 type 不是 HTTP → 检查 cloudbaserc.json 里是否有 `"type": "HTTP"`

#### 方式 B：云托管

```bash
tcb cloudrun deploy pay-common --path .
```

> 详细部署步骤见 `references/部署/deploy-cloud-function.md` 或 `deploy-cloud-run.md`。

### 4.2 开启 HTTP 访问服务并配置路由 ⭐⭐

> **SDK 模式必须执行此步骤！没有 HTTP 访问服务，微信回调无法到达你的函数。**

#### 方式 A：控制台操作（可视化）

1. 进入 [CloudBase 控制台](https://console.cloud.tencent.com/tcb/env) → 左侧菜单 → **环境管理** → **HTTP 访问服务**
2. 打开开关「HTTP 访问服务」（首次开启会分配公网域名）
3. 记录下分配的域名，格式为：
   ```
   https://{envId}-{appId}.{region}.app.tcloudbase.com
   ```
   例如：
   ```
   https://test-wxpay-5gy4ugzreef15cfe-1326375956.ap-shanghai.app.tcloudbase.com
   ```
4. 在下方「**路由管理**」→ 「**添加路由**」：

   | 配置项 | 填写值 | 说明 |
   |--------|--------|------|
   | **路径（Path）** | `/pay/wx-pay` | 自定义，建议用有语义的前缀 |
   | **关联资源类型** | 云函数 (SCF) | 选择刚部署的 pay-common |
   | **关联资源** | `pay-common-xx` | 选择对应版本/别名 |
   | **身份认证** | **关闭** ⚠️ | **回调路由必须关闭，否则微信回调被 401 拦截** |

5. 点击确认创建路由

> 截图示例：控制台 → 环境管理 → HTTP访问服务 → 路由管理 → 找到你的路径行 → 查看「身份认证」列应为「未开启」

#### 方式 B：CLI 命令行（自动化）

```bash
# 查看当前已有路由
tcb routes list -e your-env-id

# 创建路由（指向 pay-common 云函数，不开启身份认证）
tcb routes add -e your-env-id --data '{
  "domain": "test-wxpay-5gy4ugzreef15cfe-1326375956.ap-shanghai.app.tcloudbase.com",
  "routes": [{
    "path": "/pay/wx-pay",
    "upstreamResourceType": "SCF",
    "upstreamResourceName": "pay-common",
    "enableAuth": false
  }]
}'

# 验证路由创建成功
tcb routes list -e your-env-id --filter "Path=/pay/wx-pay"
```

> **关键字段说明**：
> - `"enableAuth": false` — **必须设为 false**！回调路由不能开身份认证
> - `upstreamResourceName` — 云函数名称，通常就是 `pay-common`
> - `domain` — 从控制台「HTTP 访问服务」页面复制完整域名

#### 4.3 填写回调 URL（基于上面获得的真实地址）

拿到 HTTP 访问服务域名 + 路由路径后，拼装回调 URL 并填入 `.env`：

```env
# ============================================================
# 回调 URL 组装公式（SDK 模式）
# ============================================================
#
# 完整格式：{HTTP访问服务域名} + {路由Path} + {API路径}
#
# 以实际例子说明（假设你配的路由 path 是 /pay/wx-pay）：
#
#   基础地址 = https://test-wxpay-xxx.ap-shanghai.app.tcloudbase.com/pay/wx-pay
#
#   支付回调 = {基础地址}/unifiedOrderTrigger
#   退款回调 = {基础地址}/refundTrigger
#   转账回调 = {基础地址}/transferTrigger
#
# ============================================================

notifyURLPayURL=https://test-wxpay-5gy4ugzreef15cfe-1326375956.ap-shanghai.app.tcloudbase.com/pay/wx-pay/unifiedOrderTrigger
notifyURLRefundsURL=https://test-wxpay-5gy4ugzreef15cfe-1326375956.ap-shanghai.app.tcloudbase.com/pay/wx-pay/refundTrigger
transferNotifyUrl=https://test-wxpay-5gy4ugzreef15cfe-1326375956.ap-shanghai.app.tcloudbase.com/pay/wx-pay/transferTrigger
```

> **验证回调 URL 是否正确**：
> ```bash
> # 用 curl 测试回调路由是否可达（应返回 200 或业务错误响应，不应是 404）
> curl -X POST https://your-domain.com/pay/wx-pay/unifiedOrderTrigger \
>   -H "Content-Type: application/json" \
>   -d '{"event_type":"TEST"}'
>
> # 如果返回 404 → 路由 Path 配错了或没部署成功
> # 如果返回 401/403 → 身份认证没关掉！
> ```

### 4.4 同步环境变量到线上 ⭐⭐

> **`.env` 改了 ≠ 线上生效！** 必须显式同步到 CloudBase 控制台或重新部署。

#### 环境变量配置的两种方式

| 方式 | 适用场景 | 优先级 | 说明 |
|------|---------|:---:|------|
| **cloudbaserc.json 的 `envVariables`** | 开发测试 / 首次部署 | 低 | 部署时自动写入；**修改后需重新 `tcb fn deploy` 才生效** |
| **CloudBase 控制台** | **生产环境推荐** | **高**（覆盖 cloudbaserc） | 控制台配置的值会覆盖 cloudbaserc.json 中同名变量 |

> ⚠️ **最佳实践：生产环境统一用控制台管理环境变量**，cloudbaserc.json 只保留占位符或不写 envVariables。

#### 方式 A：通过控制台（推荐，生产必选）

**操作路径（5 步）**：

1. 进入 [CloudBase 控制台](https://console.cloud.tencent.com/tcb/env) → 选择你的环境
2. 左侧菜单 → **函数管理** → 找到 `pay-common`
3. 点击进入 **函数详情**
4. 点击顶部标签 → **函数配置**（或「编辑」按钮）
5. 在 **环境变量** 区域 → 点击 **编辑** → 逐条添加/修改变量

**从 `.env` 映射到控制台的对照表**：

```
.env 文件格式（key=value）          控制台界面
─────────────────────────────────  ──────────────────────────────
signMode=sdk                        变量名: signMode    值: sdk
appId=wx1234567890                  变量名: appId       值: wx1234567890
merchantId=YOUR_MERCHANT_ID               变量名: merchantId  值: YOUR_MERCHANT_ID
privateKey=-----BEGIN...            变量名: privateKey  值: （粘贴完整 PEM 内容）
notifyURLPayURL=https://xxx         变量名: notifyURLPayURL  值: https://...
...                                 ...
```

**关键注意事项**：
- 私钥和公钥的值要包含 `-----BEGIN/END ...` 头尾标记，换行用 `\n` 表示
- 修改完成后点击 **保存** → 等待几秒生效
- **不需要重新部署云函数**，控制台改环境变量实时生效

#### 方式 B：重新部署（开发阶段可用）

```bash
# 修改 cloudbaserc.json 的 envVariables 后重新部署
tcb fn deploy pay-common

# ⚠️ 这种方式会触发一次完整的部署流程（上传代码 + 更新配置）
#    仅适合开发阶段频繁迭代时使用
```

#### 验证环境变量是否生效

```bash
# 方法一：调用一个依赖环境变量的接口，看是否报错
curl -X POST https://your-http-domain/wx-pay/wxpay_order \
  -H "Content-Type: application/json" \
  -d '{"description":"test","out_trade_no":"TEST'$(date +%Y%m%d%H%M%S)'","amount":{"total":1,"currency":"CNY"},"payer":{"openid":"test"}}'

# 如果返回 "appId 不能为空" / "merchantId 格式错误" → 环境变量没生效！

# 方法二：运行一致性检查脚本（对比 .env 与线上）
python3 scripts/check_deploy_config.py /path/to/pay-common
```

> ⚠️ **每次修改 .env 后都必须同步到线上，否则线上用的是旧配置！这是新手最容易踩的坑！**

### 4.5 回调处理注意事项 ⭐⭐⭐

> **这些是微信支付官方强制要求，违反会导致回调丢失或重复扣款！**

#### ⏱️ 5 秒超时应答规则

```
⚠️ 回调应答铁律：

1. 必须在 5 秒内返回 HTTP 200 或 204
   → 超过 5 秒微信认为通知失败，触发重试

2. 正确模式：先返回成功 → 再异步执行业务逻辑
   ❌ 错误：收到回调 → 查数据库 → 更新订单 → 发货 → 返回 200（可能超时！）
   ✅ 正确：收到回调 → 立即返回 200 → 异步队列处理后续业务

3. 重试频次（微信支付官方规定）：
   15s × 2 次 → 30s × 1 次 → 3min × 1 次 → 10min × 1 次
   → 20min × 1 次 → 30min × 1 次 → 1h × 1 次 → 2h × 1 次
   → 6h × 1 次 → 15h × 1 次
   总共约 15 次重试，最长持续约 24 小时
```

> **pay-common 已内置「快速返回 + 异步处理」机制**：收到回调后立即验签并返回 200，
> 再异步执行 `handlerUnifiedTrigger` 业务逻辑。你只需要确保业务逻辑不阻塞即可。

#### 🔍 签名探测请求

```
💡 签名探测（正常现象，不要惊慌）：

微信支付会偶尔发送签名值含 WECHATPAY/SIGNTEST/ 前缀的探测请求。
这是微信用来验证你的服务器是否能正确处理验签失败的请求。

→ 收到此类请求时，pay-common SDK 验签失败后会自动返回错误响应码
→ 这是正常行为，直接忽略即可，等待正常回调通知到来

日志中可能出现类似记录：
  [WARN] Signature verification failed: WECHATPAY/SIGNTEST/...
  → 不影响业务，无需处理
```

#### 📋 回调接入检查清单

| # | 检查项 | 验证方法 | 常见问题 |
|---|--------|---------|---------|
| 1 | APIv3 密钥已设置 | 商户平台 → API 安全 → 查看 | 未设置 = 收不到任何回调 |
| 2 | HTTP 访问服务已开启 | 控制台 → 环境管理 → HTTP 访问服务 | 未开启 = 域名不存在 |
| 3 | 路由 Path 已创建且指向 pay-common | `tcb routes list -e your-env-id` | 路径错误 = 404 |
| 4 | 身份认证已关闭 | 控制台路由管理查看 / CLI list 结果 | 未关 = 401/403 |
| 5 | 回调 URL 含完整路径 | `.env` 中 notifyURL* 值 | 缺 path = 404 |
| 6 | 安全组放行微信 IP | 云服务器安全组配置 | IP 白名单未开放 |
| 7 | 应答时间 < 5 秒 | 日志查看 handler 执行耗时 | 超时 = 重试风暴 |

## Step 5：接入前端（小程序示例）

### 5.1 安装 SDK 并配置登录

```javascript
// app.js
const cloudbase = require('@cloudbase/js-sdk')
const ENV_ID = 'your-env-id'
const PUBLISHABLE_KEY = ''  // 控制台 → 身份认证 → API Key 管理

App({
  globalData: { accessToken: '', openid: '', loginReady: false },
  _cbApp: null,

  async onLaunch() {
    if (!this._cbApp) {
      const initOptions = { env: ENV_ID }
      if (PUBLISHABLE_KEY) initOptions.accessKey = PUBLISHABLE_KEY
      this._cbApp = cloudbase.init(initOptions)
    }
    // 静默登录获取 accessToken 和 openid
    const { data, error } = await this._cbApp.auth.signInWithOpenId()
    if (!error && data) {
      this.globalData.accessToken = data.session?.access_token || ''
      this.globalData.openid = data.user?.identities?.[0]?.identity_data?.provider_user_id || ''
    }
    this.globalData.loginReady = true
  }
})
```

### 5.2 封装调用函数

```javascript
// utils/pay.js
const app = getApp()
const API_GATEWAY = `https://${app.globalData.envId}.api.tcloudbasegateway.com`

function callPayCommon(action, data) {
  return app.getAccessToken().then((accessToken) => {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_GATEWAY}/v1/functions/pay-common?webfn=true`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        data: { _action: action, ...data },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            let payload = res.data
            // 解包双层响应结构
            const inner = payload?.data
            if (inner && typeof inner === 'object' && 'status' in inner && 'data' in inner) {
              payload = { ...payload, data: inner.data }
            }
            resolve(payload)
          } else {
            reject({ code: -1, msg: `HTTP ${res.statusCode}` })
          }
        },
        fail: reject,
      })
    })
  })
}

module.exports = { callPayCommon }
```

### 5.3 下单并调起支付

```javascript
// pages/pay/index.js
const { callPayCommon } = require('../../utils/pay')
const app = getApp()

Page({
  async handlePay() {
    try {
      const res = await callPayCommon('wxpay_order', {
        description: '商品名称',
        out_trade_no: 'ORDER' + Date.now(),
        amount: { total: 100, currency: 'CNY' },  // ⚠️ 单位是分！
        payer: { openid: app.globalData.openid },
      })

      if (res.code !== 0) {
        wx.showToast({ title: res.msg || '下单失败', icon: 'none' })
        return
      }

      // 提取调起支付的参数
      const payData = res.data?.data || res.data
      await wx.requestPayment({
        timeStamp: payData.timeStamp,
        nonceStr: payData.nonceStr,
        package: payData.package || ('prepay_id=' + payData.prepay_id),
        signType: 'RSA',
        paySign: payData.paySign,
      })

      wx.showToast({ title: '支付成功', icon: 'success' })
      // ⚠️ 支付成功后建议主动查单确认，不要仅依赖前端回调
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('cancel')) {
        console.log('用户取消支付')
      } else {
        wx.showToast({ title: err.msg || '支付失败', icon: 'none' })
      }
    }
  }
})
```

> 完整小程序 Demo 见 [GitHub 官方示例](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/example/miniprogram)。
> Web 测试页（React）见本地 `example/react/`。
> H5 / Native 端接入见 `references/前端集成/` 对应文档。

## Step 6：接入业务逻辑（可选）

编辑 `services/orderService.js`，将支付结果写入你的数据库：

```javascript
class OrderService {
  async handlerUnified(params) {
    // 下单成功 → 写入待支付订单
    await db.collection('orders').add({
      out_trade_no: params.out_trade_no,
      description: params.description,
      amount: params.amount.total,
      status: 'PENDING',
      created_at: new Date()
    })
    return true
  }

  async handlerUnifiedTrigger(params) {
    // ⚠️ 必须幂等：先查状态，已处理则跳过
    const order = await db.collection('orders')
      .where({ out_trade_no: params.out_trade_no }).get()

    if (order.data[0]?.status === 'PAID') return true  // 已处理

    // 校验金额防篡改
    if (order.data[0]?.amount !== params.amount.total) {
      console.error('金额不一致！可能被篡改')
      return false
    }

    // 更新为已支付 → 发货/发放权益
    await db.collection('orders').where({ out_trade_no: params.out_trade_no })
      .update({ status: 'PAID', paid_at: new Date() })
    return true
  }
}
```

> 详细的数据库集成方案见 `references/业务开发/order-service.md`。

---

## 铁律提醒

> 在整个流程中，必须遵守以下三条铁律（违反即导致严重问题）：

1. **金额单位 = 分**：所有金额字段（`amount.total`、退款 `amount.refund`）均为整数分，禁止浮点数或元为单位
2. **订单号全局唯一**：`out_trade_no` 不能重复；`out_refund_no` 重试时必须复用原单号
3. **下单与调起使用同一私钥**：下单签名和调起支付签名必须使用同一把商户 API 私钥

---

*详细配置说明见 [env-config.md](env-config.md) | 签名模式详解见 [sign-mode.md](sign-mode.md)*
