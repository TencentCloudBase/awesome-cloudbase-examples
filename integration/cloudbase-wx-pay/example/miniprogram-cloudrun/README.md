# 微信小程序支付示例（云托管版）

基于 **CloudBase 云托管（Cloud Run）** 直连调用 pay-common 后端的微信小程序支付模板。

## 与云函数版的区别

| 特性 | 云函数版 (`miniprogram/`) | 云托管版（本模板）|
|------|--------------------------|------------------|
| **调用地址** | 云 API 网关 `/v1/functions/pay-common?webfn=true` | 云托管域名 `/cloudrun/v1/pay/<action>` |
| **路由分发** | `body._action` 中间层 | Express 标准 RESTful 路径 |
| **响应格式** | 需解开 webfn 双层信封 | 直接返回 `{ code, msg, data }` |
| **性能** | 冷启动较慢 | 常驻容器，响应快 |
| **成本** | 按调用次数计费 | 按容器时长计费 |
| **适用场景** | 低频调用、快速原型 | 高频服务、生产环境 |

## 功能

### 下单支付
- JSAPI 下单 → 调起微信支付 → 支付成功
- 查询订单状态
- 关闭未支付订单（自动检查状态，防止误关已支付订单）
- 申请退款（全额退款，先查询后确认）
- 查询退款进度

### 商家转账
- 发起商家转账（0.3 – 2000 元免密小额）
- 调起 `wx.requestMerchantTransfer` 确认收款页面
- 查询转账单状态

## 前置条件

- ✅ 已将 pay-common 部署到 CloudBase 云托管
- ✅ 获取云托管访问域名（如 `https://pay-common-xxx.app.tcloudbase.com`）
- ✅ CloudBase 控制台已开启微信小程序身份源
- ✅ 获取 Publishable Key（控制台 → 身份认证 → API Key 管理）
- ✅ 已完成微信支付商户进件并配置到 pay-common

## 快速开始

### 1. 安装依赖

```bash
cd examples/miniprogram-cloudrun
npm install
```

### 2. 修改配置

**`app.js`**：
```javascript
const ENV_ID = 'your-env-id'                          // 云开发环境 ID
const PUBLISHABLE_KEY = 'your-publishable-key'         // API Key（如需要）
const CLOUDRUN_BASE_URL = 'https://your-env-id-your-uin.ap-shanghai.app.tcloudbase.com'
```

**`project.config.json`**：
```json
{
  "appid": "your-appid"
}
```

### 3. 构建 npm

在微信开发者工具中：**工具 → 构建 npm**

### 4. 运行

在微信开发者工具中打开项目。开发阶段可在 **详情 → 本地设置** 中勾选「不校验合法域名」。

## 文件结构

```
miniprogram-cloudrun/
├── app.js                    # 入口：CloudBase Auth 登录 + 全局配置
├── app.json                  # 小程序页面配置
├── package.json              # 依赖：@cloudbase/js-sdk
├── project.config.json       # 微信开发者工具项目配置
├── project.private.config.json
├── sitemap.json
├── README.md                 # 本文档
├── pages/
│   └── pay/
│       ├── pay.js            # 支付页面逻辑（下单/查单/关单/退款/转账）
│       ├── pay.wxml          # 支付页面模板
│       └── pay.wxss          # 支付页面样式
└── miniprogram_npm/          # 构建后的 npm 包
```

## 架构说明

```
┌─────────────────┐     CloudBase Auth       ┌──────────────────┐
│  微信小程序       │  ─── signInWithOpenId ──→ │  CloudBase        │
│  (本模板)        │  ←── accessToken + openid │  身份认证          │
│                 │                           └──────────────────┘
│                 │     Bearer Token
│  pay.js         │  ─── POST /cloudrun/     ──→ ┌──────────────┐
│                 │      v1/pay/<action>         │  云托管容器     │
│                 │  ←── { code, msg, data }     │  (pay-common)  │
└─────────────────┘                              └──────────────┘
                                                       │
                                              JWT 自动解码 openid
                                              调用微信支付 API
```

## API 接口

**基础路径**：`https://<your-cloudrun-domain>/cloudrun/v1/pay`

| 路径 | 方法 | 说明 |
|------|------|------|
| `/wxpay_order` | POST | JSAPI / 小程序支付下单 |
| `/wxpay_order_h5` | POST | H5 支付下单 |
| `/wxpay_order_native` | POST | Native 扫码支付 |
| `/wxpay_order_app` | POST | APP 支付下单 |
| `/wxpay_query_order_by_out_trade_no` | POST | 查询订单（商户单号） |
| `/wxpay_query_order_by_transaction_id` | POST | 查询订单（微信单号） |
| `/wxpay_close_order` | POST | 关闭订单 |
| `/wxpay_refund` | POST | 申请退款 |
| `/wxpay_refund_query` | POST | 查询退款 |
| `/wxpay_transfer` | POST | 商家转账 |
| `/wxpay_transfer_bill_query` | POST | 查询转账单 |

## 鉴权说明

### 推荐：JWT 自动获取 openid

```javascript
// 前端只需携带 accessToken，无需传 openid
wx.request({
  url: `${CLOUDRUN_BASE_URL}/cloudrun/v1/pay/wxpay_order`,
  header: { 'Authorization': `Bearer ${accessToken}` },
  data: {
    description: '测试商品',
    amount: { total: 100 },
    // ❌ 不需要传 payer.openid，后端从 JWT 自动解析
  }
})
```

### 兼容：手动传 openid

```javascript
// 如不使用 CloudBase Auth 登录
data: {
  payer: { openid: 'oUpF8uMuAJO_xxx' }  // ✅ 手动传入
}
```

> ⚠️ 手动传入的 openid 可能被篡改，生产环境建议使用 JWT 方式。

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 401 Unauthorized | accessToken 未传或过期 | 检查 token，调用 `app.reLogin()` 重试 |
| openid 缺失 | JWT 中未包含 openid | 确认调用了 `signInWithOpenId()` |
| 域名不合法 | 未配置服务器域名白名单 | 开发阶段勾选「不校验合法域名」；发布前配置 request 合法域名 |

## 部署检查清单

- [ ] 云托管服务已部署并正常运行
- [ ] 环境变量已配置（`WX_APP_ID`、`WX_MCH_ID` 等）
- [ ] CloudBase 身份认证已开启微信小程序身份源
- [ ] 小程序 AppID 与环境配置一致
- [ ] 服务器域名已配置到小程序后台
- [ ] 回调地址已配置为云托管域名

## 注意事项

- ⚠️ **金额安全**：示例中金额取自前端输入，仅供测试。**生产环境必须从后端数据库查询金额**。
- 商家转账 ≥ 2000 元需实现 `user_name` RSA 加密，本模板仅支持免密小额。
- 启动时若 `ENV_ID` 未修改，会弹出配置未完成的提示。

## 相关文档

- [CloudBase 云托管文档](https://docs.cloudbase.net/run/intro.html)
- [微信支付 API v3](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [CloudBase Auth 身份认证](https://docs.cloudbase.net/authentication/introduce.html)
