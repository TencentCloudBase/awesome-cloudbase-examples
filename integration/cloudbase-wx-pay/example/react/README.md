# 微信支付 Web 测试页（React + Vite）

> 基于 `pay-common` 后端模板的前端测试页面，支持 **JSAPI / H5 / Native** 三种支付方式的一键下单、调起、查单、退款。

---

## ⚠️ 部署方式说明

### 当前：CloudBase 静态托管 + HTTP 访问服务（快速测试用）

本模版通过 **CloudBase 静态托管**部署，使用** HTTP 访问服务**直接调用后端接口：

- ✅ 无需 accessToken 鉴权，开箱即用
- ✅ 适合快速验证支付流程是否跑通
- ⚠️ **不适合生产环境**（无登录态、无 Token 管理）

```
浏览器 → CloudBase 静态托管（本 React 页面）
       → HTTP 访问服务 → pay-common 后端（无鉴权）
```

### 生产环境：HTTP 云 API 调用（推荐）

正式上线时，前端应通过 **CloudBase API 网关**调用后端云函数，需要自行接入：

| 项目 | 说明 |
|------|------|
| **登录接入** | 支付场景必须获取用户的 **openid**，因此不能使用匿名登录。推荐根据前端类型选择：<br>• **微信公众号 H5** → 微信公众号 OAuth 登录（获取 openid）<br>• **普通 Web 站点** → 自定义登录 + 自行维护用户体系<br>详见 [CloudBase Web 身份认证文档](https://docs.cloudbase.net/api-reference/webv2/authentication) |
| **Token 管理** | 登录后获取 `accessToken`，每次请求携带 `Authorization: Bearer {token}` |
| **Token 刷新** | `accessToken` 有效期约 **2 小时**，过期需自动刷新（参考 `pay-common/README.md` §Step 5） |
| **openid 安全** | 生产环境的 openid 应从服务端 JWT 解析获取，不可信任前端传入值 |

```
小程序/网页 → CloudBase Auth 登录 → 获取 accessToken
           → CloudBase API 网关（带 Bearer Token）→ pay-common 后端（有鉴权）
```

完整接入文档见 `pay-common/README.md` §**Step 5：接入前端**。

---

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

修改 `src/App.jsx` 中的 `baseUrl` 为你的后端地址。

---

## 部署到 CloudBase 静态托管

### 前置步骤

1. **开启 HTTP 访问服务**
   - 进入云开发控制台 → 环境 → **HTTP 访问服务**
   - 点击「开启」或「创建域名关联」
   - 获得公网访问域名（格式如 `https://{envId}.{region}.app.tcloudbase.com`）

   > ⚠️ **请求路径说明**：
   > 开启 HTTP 访问服务后，你的公网域名会带上 `serviceName` 作为子路径。
   > 例如 `serviceName: web-pay-07`，则实际访问地址为：
   > ```
   > https://xxx.cloudbaseasms.com/web-pay-07/
   >                              ^^^^^^^^^^
   >                              这是 path 部分
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

3. **修改 `src/App.jsx` 中的 baseUrl**  
   将 `baseUrl` 改为你的 HTTP 访问服务完整域名 + 后端路径：
   ```js
   const [baseUrl, setBaseUrl] = useState('https://你的环境ID.区域.app.tcloudbase.com/pay/wx-pay')
   ```

### 部署命令

```bash
# 确保 cloudbaserc.json 中 serviceName 正确
npm run build          # 构建产物输出到 dist/
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
src/
├── App.jsx              # 主应用（状态管理 + 业务逻辑）
├── main.jsx             # 入口
├── index.css            # 全局样式
├── components/          # UI 组件
│   ├── ActionBar.jsx         # 操作按钮栏
│   ├── ConfigCard.jsx        # 服务配置卡片
│   ├── OrderParamsCard.jsx   # 下单参数卡片
│   ├── PayActionCard.jsx     # 支付操作区（JSAPI/H5/Native）
│   ├── ResultCard.jsx        # 结果展示
│   └── ...
├── services/payService.js # OAuth/OpenID 服务调用
├── utils/api.js          # 请求封装 + 工具函数
├── hooks/usePayState.js  # UI 状态管理 Hook
└── constants/tradeState.js  # 交易状态映射
```

---

*最后更新：2026-04-29*
