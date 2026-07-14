# 微信支付 Web 测试页（React + Vite）

> 基于 `pay-common` 后端模板的前端测试页面，支持 **JSAPI / H5 / Native** 三种支付方式的一键下单、调起、查单、退款。

---

## ⚠️ 部署方式说明

### 本 Demo：HTTP 访问服务（快速体验）

本 Demo 默认使用 **CloudBase HTTP 访问服务**直接调用后端接口，目的是让你**最快跑通支付全流程**：

- ✅ 无需 accessToken 鉴权，开箱即用
- ✅ **无跨域问题** — HTTP 访问服务的静态托管与云函数共享同一域名，天然同源
- ✅ 适合快速验证支付流程是否跑通
- ⚠️ **不适合生产环境**（无登录态、无 Token 管理）

```
浏览器 → CloudBase 静态托管（本 React 页面）
       → HTTP 访问服务（同域名）→ pay-common 后端（无鉴权）
       ↑ 同源，无 CORS 问题
```

### 生产环境：HTTP 云 API 调用（推荐）

正式上线时，前端应通过 **CloudBase HTTP 云 API（API 网关）** 调用后端云函数。与 HTTP 访问服务的关键区别：

| 对比项 | HTTP 访问服务（本 Demo） | HTTP 云 API（生产推荐） |
|--------|------------------------|----------------------|
| **鉴权** | 无 | Bearer Token（accessToken） |
| **跨域（CORS）** | ✅ 同域名，无需处理 | ⚠️ **需手动配置** |
| **安全性** | 低（公网直接访问） | 高（登录态 + Token 校验） |
| **适用场景** | 快速体验 / Demo | 正式上线 |

#### 跨域配置（CORS）

使用 HTTP 云 API 时，前端域名与 API 网关域名不同源，浏览器会拦截跨域请求。需要在 **CloudBase 控制台**配置 CORS：

1. 进入 [云开发控制台](https://tcb.cloud.tencent.com) → 你的环境 → **访问服务** → **HTTP 云 API**
2. 找到对应的云函数路由，点击 **编辑**
3. 在「自定义域名」或「CORS 配置」中，添加你的前端域名到允许列表：
   - 开发环境：`http://localhost:5173`
   - 生产环境：你的正式域名，如 `https://your-domain.com`
4. 允许的 Headers 至少包含：`Content-Type, Authorization`
5. 允许的 Methods 至少包含：`GET, POST, OPTIONS`

> 💡 **为什么 HTTP 访问服务不需要配 CORS？**
> 因为 HTTP 访问服务的静态托管和云函数路由都挂在同一个域名下（如 `xxx.app.tcloudbase.com`），
> 前端页面和后端 API 是同源的，浏览器不会触发 CORS 预检。

#### 接入要点

| 项目 | 说明 |
|------|------|
| **登录接入** | 支付场景必须获取用户的 **openid**，因此不能使用匿名登录。推荐根据前端类型选择：<br>• **微信公众号 H5** → 微信公众号 OAuth 登录（获取 openid）<br>• **普通 Web 站点** → 自定义登录 + 自行维护用户体系<br>详见 [CloudBase Web 身份认证文档](https://docs.cloudbase.net/api-reference/webv2/authentication) |
| **Token 管理** | 登录后获取 `accessToken`，每次请求携带 `Authorization: Bearer {token}` |
| **Token 刷新** | `accessToken` 有效期约 **2 小时**，过期需自动刷新（参考 `pay-common/README.md` §Step 5） |
| **openid 安全** | 生产环境的 openid 应从服务端 JWT 解析获取，不可信任前端传入值 |

```
小程序/网页 → CloudBase Auth 登录 → 获取 accessToken
           → CloudBase HTTP 云 API（带 Bearer Token）→ pay-common 后端（有鉴权）
           ↑ 跨域，需配置 CORS
```

完整接入文档见 `pay-common/README.md` §**Step 5：接入前端**。

---

## 本地开发

1. **复制环境变量配置**

   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件，填入你的实际配置：

   ```bash
   VITE_TCB_ENV_ID=your-env-id          # CloudBase 环境 ID
   VITE_TCB_UIN=your-uin                 # 腾讯云 UIN（网关域名需要）
   VITE_ROUTE_PREFIX=pay                 # 支付云函数 HTTP 触发路径
   VITE_OAUTH_PREFIX=oauth               # OAuth 云函数 HTTP 触发路径
   ```

   > 📌 **各变量说明及获取方式**：

   | 变量 | 哪里获取 | 示例 |
   |------|---------|------|
   | `VITE_TCB_ENV_ID` | CloudBase 控制台 → 环境列表 → 环境 ID | `test-wxpay-5gy4ugzreef15cfe` |
   | `VITE_TCB_UIN` | 腾讯云控制台 → 右上角账号信息 → 账号 ID | `1326375956` |
   | `VITE_ROUTE_PREFIX` | 控制台 → 云函数 → `pay-common` → HTTP 访问服务 → 路径 | `pay` |
   | `VITE_OAUTH_PREFIX` | 同上，对应 OAuth 云函数的 HTTP 访问路径 | `oauth` |

   > ⚠️ **常见错误**：
   > - 域名后缀不要用 `tcloudbaseapp.com`（那是静态托管），必须用 `ap-shanghai.app.tcloudbase.com`
   > - `VITE_ROUTE_PREFIX` 的值就是控制台配置的路径，代码会自动拼接 `/wx-pay/` 前缀调用后端路由
   > - 最终实际请求 URL 格式：`https://{envId}-{uin}.ap-shanghai.app.tcloudbase.com/{routePrefix}/wx-pay/xxx`

2. **验证连通性**

   配置完成后，在浏览器直接访问以下地址，确认返回 JSON（而非 HTML）：
   ```
   https://{VITE_TCB_ENV_ID}-{VITE_TCB_UIN}.ap-shanghai.app.tcloudbase.com/{VITE_ROUTE_PREFIX}/wx-pay/wxpay_query_order_by_out_trade_no
   ```
   - ✅ 返回 `{"code": -1, "msg": "..."}` 等 JSON → 连通正常
   - ❌ 返回 HTML 页面（`<!DOCTYPE html>`）→ 域名或路径错误，检查上述配置

3. **启动开发服务器**

   ```bash
   npm install
   npm run dev        # http://localhost:5173
   ```

   > 启动后页面会根据 `.env` 中的配置自动拼接后端地址，也可在页面「服务配置」卡片中手动修改。

---

## 部署到 CloudBase 静态托管（快速体验）

> 💡 本章节对应上述「HTTP 访问服务」方式，用于快速体验。生产环境请参考「HTTP 云 API 调用」章节。

### 前置步骤

1. **开启 HTTP 访问服务**
   - 进入云开发控制台 → 环境 → **HTTP 访问服务**
   - 点击「开启」或「创建域名关联」
   - 获得公网访问域名（格式如 `https://{envId}-{uin}.ap-shanghai.app.tcloudbase.com`）

   > ⚠️ **请求路径说明**：
   > 开启 HTTP 访问服务后，你的公网域名会带上 `serviceName` 作为子路径。
   > 例如 `serviceName: web-pay`，则实际访问地址为：
   > ```
   > https://xxx.ap-shanghai.app.tcloudbase.com/web-pay/
   >                                           ^^^^^^^^
   >                                           这是 path 部分
   > ```
   > Vite 打包需配置 `base: './'`（已在本项目 `vite.config.js` 中配置），
   > 否则 JS/CSS 资源会因路径不匹配返回 **404**。

2. **配置微信公众号后台**（JSAPI 支付必须！）

   JSAPI 支付涉及 **3 个域名配置**，全部在 [微信公众平台](https://mp.weixin.qq.com) → 设置与开发 → 公众号设置 → 功能设置：

   | 配置项 | 位置 | 用途 | 格式要求 |
   |--------|------|------|---------|
   | **网页授权域名** | 功能设置 → 网页授权域名 | OAuth2 获取 openid 的 `redirect_uri` 必须在此白名单 | `domain.com`（不含协议和端口） |
   | **JS接口安全域名** | 功能设置 → JS接口安全域名 | `wx.requestPayment()` 调起时校验当前页面域名 | 同上 |
   | **支付授权目录** | [微信支付商户平台](https://pay.weixin.qq.com) → 产品中心 → 开发配置 | 支付下单时的页面 URL 域名 | `https://domain.com/path/`（末尾 `/`） |

   > ⚠️ **域名限制**：
   > - 以上域名均需 **ICP 备案**并通过微信验证（文件或 DNS 校验）
   > - **局域网 IP 不行**！`redirect_uri`、`http://localhost`、`192.168.x.x` 都会被拒绝
   > - 本地开发需要公网域名：可绑定自定义域名的 CloudBase 环境，或用 ngrok / 内网穿透临时测试
   >
   > **常见报错**：
   > - 「10003 redirect_uri 参数错误」→ 网页授权域名未配置或 `redirect_uri` 不在白名单
   > - 「当前页面 URL 的域不在以下支付授权目录中」→ 支付授权目录未配置
   > - `wx.requestPayment` 无反应 → JS接口安全域名未配置

3. **配置环境变量**

   确保 `.env` 文件中的配置正确（参考 `.env.example`），页面会自动拼接后端地址：
   ```
   https://{VITE_TCB_ENV_ID}-{VITE_TCB_UIN}.ap-shanghai.app.tcloudbase.com/{VITE_ROUTE_PREFIX}
   ```

### 部署命令

```bash
# 确保 cloudbaserc.json 中 envId 和 serviceName 正确
npm run build             # 构建产物输出到 dist/
tcb app deploy web-pay    # 部署到静态托管
```

---

## 支持的支付方式

| 方式 | 触发条件 | 说明 |
|------|---------|------|
| **JSAPI** | 选「JSAPI」+ 填入 openid | 微信内调起 `wx.requestPayment`（需在微信内打开） |
| **H5** | 选「H5」+ 填入客户端 IP | 跳转微信中间页（需在手机浏览器打开） |
| **Native 扫码** | 选「Native」 | 展示二维码，微信扫一扫付款 |

---

## 文件结构

```
.env.example                 # 环境变量模板（复制为 .env 使用）
cloudbaserc.json             # CloudBase 部署配置
src/
├── App.jsx                  # 主应用（状态管理 + 业务逻辑）
├── main.jsx                 # 入口
├── index.css                # 全局样式
├── components/              # UI 组件
│   ├── ActionBar.jsx             # 操作按钮栏
│   ├── ConfigCard.jsx            # 服务配置卡片
│   ├── OrderParamsCard.jsx       # 下单参数卡片
│   ├── PayActionCard.jsx         # 支付操作区（JSAPI/H5/Native）
│   ├── ResultCard.jsx            # 结果展示
│   └── ...
├── services/payService.js   # OAuth 登录 / OpenID 获取 / Token 刷新
├── utils/api.js             # 请求封装 + 工具函数
├── hooks/usePayState.js     # UI 状态管理 Hook
└── constants/tradeState.js  # 交易状态映射
```

---

*最后更新：2026-05-11*

<!-- TODO: 后续可新增「HTTP 云 API 部署」章节，提供完整的生产环境部署示例 -->
