# SDK 模式 vs Gateway 签名模式详解

> 基于 `pay-common/README.md` §签名模式详解 + `开发注意事项与模板使用指南.md` §2.3 整理。

---

## 核心概念

pay-common 通过环境变量 `signMode` 切换两种签名模式。**两种模式的区别仅在于回调处理方式**——主动请求（下单/退款/转账）均走 SDK 自签名直连微信。

> 💡 **选型取决于你的云函数创建方式**：
> - **通过 CloudBase 控制台 → 集成中心创建函数** → 自动走 **Gateway 模式**（集成中心代为验签解密），这是**大多数用户的实际路径**
> - **自己手动部署代码到 HTTP 云函数 / 云托管** → 走 **SDK 模式**（自己验签解密）
>
> ⚠️ `config.js` 中 `signMode` 的代码级 fallback 为 **`'gateway'`**。如果你是通过控制台集成中心创建的函数，不需要改这个值；如果是自己部署的代码但漏配了此环境变量，会静默走 Gateway 模式导致回调 URL 对不上。

---

## 模式对比总览

| 维度 | SDK 模式 (`signMode=sdk`) | Gateway 模式 (`signMode=gateway`) |
|------|--------------------------|-------------------------------|
| **主动请求签名** | SDK 自签名 → 直连微信 | SDK 自签名 → 直连微信（相同） |
| **回调接收方** | 自己的服务器 | CloudBase 集成中心 |
| **回调验签** | 自己验签 + AES-GCM 解密 | 集成中心已解密，读取明文即可 |
| **回调 URL** | 指向自己的服务域名 | 指向集成中心域名 |
| **适用场景** | 自己部署云函数 / 云托管 / 自建服务器 | **CloudBase 控制台 → 集成中心创建（主流）** |
| **运维复杂度** | 需管理证书和验签逻辑 | 集成中心统一管理，开箱即用 |
| **灵活性** | 高，完全自主 | 低，依赖集成中心能力 |

---

## 何时选哪种模式？

```
你的云函数是怎么创建的？
├── CloudBase 控制台 → 集成中心创建（★ 主流方式）
│   └── 自动走 Gateway 模式
│       → 回调由集成中心代理验签解密
│       → 无需自己管理证书和验签逻辑
│       → 回调 URL 直接用控制台生成的集成中心地址
│
├── 自己部署代码（CLI / IDE / 手动上传）
│   ├── 部署到 HTTP 云函数（非集成中心）
│   │   └── 用 SDK 模式
│   │       → 回调指向自己的服务，自己验签解密
│   │       → 需要开启 HTTP 访问服务 + 配回调 URL
│   │
│   ├── 部署到云托管（Docker）
│   │   └── 用 SDK 模式
│   │       → 容器自己收回调、自己验签解密
│   │       → 完全控制，不依赖外部服务
│   │
│   └── 自建服务器
│       └── 只能用 SDK 模式
│           → 没有集成中心可用
│
└── 本地开发 / 调试
    └── 用 SDK 模式（需要 ngrok 穿透回调）
        → 本地无法使用集成中心
```

---

## SDK 模式详解

### 工作原理

```
微信支付服务器
    │
    ├── 主动请求路径（下单/退款/转账）
    │   ← 你的服务 → SDK 自签名 → 直连微信 API ✓（两种模式相同）
    │
    └── 回调路径（支付结果通知）
        ↓ HTTPS POST
        你的服务（pay-common）
        ↓
        ① 接收回调密文
        ↓
        ② SDK 验签（用 wxPayPublicKey）
        ↓  签名不通过 → 返回 FAIL
        ③ AES-GCM 解密（用 apiV3Key）
        ↓
        ④ 得到明文 JSON（订单状态、金额等）
        ↓
        ⑤ 业务处理（更新订单状态 / 发货）
        ↓
        ⑥ 5 秒内返回 { code: "SUCCESS", message: "成功" }
```

### 配置要点

```env
signMode=sdk
# 回调指向你自己
notifyURLPayURL=https://你的域名/cloudrun/v1/pay/unifiedOrderTrigger
notifyURLRefundsURL=https://你的域名/cloudrun/v1/pay/refundTrigger
transferNotifyUrl=https://你的域名/cloudrun/v1/pay/transferTrigger
```

### 优缺点

**优点**：
- 完全自主可控，不依赖任何中间层
- 适合云托管、自建服务器等独立部署
- 可以自定义回调处理逻辑

**缺点**：
- 需要确保回调 URL 可被微信访问（HTTPS、公网可达）
- 需要正确配置公钥进行验签
- 本地调试需要 ngrok/frp 等内网穿透工具

### 注意事项

1. **回调路由不能开身份认证**：微信回调是服务器间通信，没有 JWT Token。
   如果开了身份认证，微信的回调请求会被拦截。
   
2. **必须在防火墙放行微信 IP 白名单**：
   - 上海：`101.226.33.0/24`, `101.226.72.0/24`, `58.250.106.0/24`
   - 深圳：`183.131.95.0/24`, `121.14.96.0/24`, `183.232.238.0/24`
   - 广州腾讯云：`43.142.194.0/24`, `119.147.79.0/24`, `43.163.241.0/24`

3. **先应答后处理**：收到回调后立即返回 SUCCESS，再异步处理业务。
   模板已实现此机制（`services/payService.js` 中的 `handleNotification`）。

---

## Gateway 模式详解

### 工作原理

```
微信支付服务器
    │
    ├── 主动请求路径
    │   ← 你的服务 → SDK 自签名 → 直连微信 API ✓（相同）
    │
    └── 回调路径
        ↓ HTTPS POST
        CloudBase 集成中心
        ↓
        ① 集成中心用自己的证书验签
        ↓
        ② 集成中心用自己的密钥解密
        ↓
        ③ 将明文通过 HTTP POST 转发到你的服务
        ↓     Header 中带 x-tcb-wechatpay-decrypted 标记
        你的服务（pay-common）
        ↓
        ④ 直接读明文（无需验签和解密）
        ↓
        ⑤ 业务处理
        ↓
        ⑥ 返回 { code: "SUCCESS" }
```

### 配置要点

```env
signMode=gateway
# 回调指向集成中心（由它代为验签解密）
notifyURLPayURL=https://integration-xxx.tcloudbase.com/wechatpay/order
notifyURLRefundsURL=https://integration-xxx.tcloudbase.com/wechatpay/refund
transferNotifyUrl=https://integration-xxx.tcloudbase.com/wechatpay/transfer
```

### 优缺点

**优点**：
- 不需要管理验签逻辑，集成中心统一处理
- 回调 URL 固定为集成中心域名，不需要额外配置 HTTPS
- 自动获得重试、日志等集成中心能力

**缺点**：
- 依赖 CloudBase 集成中心的可用性
- 回调数据经过一层转发，延迟略增
- 仅适用于 CloudBase 平台

### 注意事项

1. **集成中心域名格式**：通常为 `https://integration-{envId}.tcloudbase.com/wechatpay/{type}`
   其中 type 为 `order`(支付)、`refund`(退款)、`transfer`(转账)

2. **仍然需要配置完整的凭证**：虽然回调由集成中心处理，但**主动请求仍需 SDK 自签名**
   所以 `privateKey`、`wxPayPublicKey` 等一个都不能少。

3. **商户平台回调地址配置**：需要在商户平台将回调地址设置为集成中心的 URL，
   而非你自己服务的 URL。

---

## 切换模式

切换模式只需修改 `.env` 中的一个变量 + 更改三个回调 URL：

```bash
# 从 SDK 切换到 Gateway
# 1. 修改 signMode
sed -i '' 's/signMode=sdk/signMode=gateway/' .env

# 2. 修改三个回调 URL 为集成中心地址
# （具体地址请在 CloudBase 控制台的集成中心页面查看）
```

**不需要**重新安装依赖、不需要改代码。

---

## 如何判断当前用的是哪种模式？

| 方法 | 说明 |
|------|------|
| 查看 `.env` 的 `signMode` 值 | 最直接 |
| 查看启动日志 | 会打印当前签名模式 |
| 看回调 URL | 指向自己 = SDK；指向 integration-* = Gateway |
| 看回调处理代码路径 | `sdkStrategy.js` 的 handleNotification = SDK；直接读 req.body = Gateway |

---

## 回调不通的排查思路

当遇到回调问题时，按以下顺序排查：

```
回调收不到？
│
├── 1. signMode 与回调 URL 是否匹配？
│   ├── sdk 模式 → 回调指向自己？
│   └── gateway 模式 → 回调指向集成中心？
│
├── 2. 回调 URL 是否可公网访问？
│   ├── 测试连通性：curl -v <回调URL>
│   └── 运行脚本：scripts/test_callback_url.sh <URL>
│
├── 3. SDK 模式的专项检查
│   ├── 防火墙/安全组是否放行了微信 IP？
│   ├── 回调路由是否误开启了身份认证？
│   └── URL 是否包含 ? 参数（微信会拒绝）
│
└── 4. Gateway 模式的专项检查
    ├── 集成中心是否正常工作？
    ├── 商户平台配置的回调地址是否为集成中心 URL？
    └── 集成中心转发规则是否配置正确？
```

*环境变量完整列表见 [env-config.md](env-config.md)*
