# 微信小程序支付示例（云函数版）

基于 **CloudBase HTTP 云函数** 调用 pay-common 后端的微信小程序支付模板。

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

1. **云开发环境**：已开通腾讯云 CloudBase（TCB）
2. **微信小程序身份源**：在 CloudBase 控制台开启
3. **pay-common 部署**：已将 pay-common 部署为 HTTP 云函数
4. **微信支付商户号**：已完成商户进件并配置到 pay-common

## 快速开始

### 1. 安装依赖

```bash
cd examples/miniprogram
npm install
```

### 2. 修改配置

**`app.js`**：
```javascript
const ENV_ID = 'your-env-id'           // 替换为你的云开发环境 ID
```

**`project.config.json`**：
```json
{
  "appid": "your-appid"               // 替换为你的小程序 AppID
}
```

### 3. 构建 npm

在微信开发者工具中：**工具 → 构建 npm**

### 4. 运行

在微信开发者工具中打开项目，即可体验完整支付流程。

## 文件结构

```
miniprogram/
├── app.js                    # 入口：CloudBase Auth 登录 + 全局配置
├── app.json                  # 小程序页面配置
├── app.wxss                  # 全局样式
├── package.json              # 依赖：@cloudbase/js-sdk
├── project.config.json       # 微信开发者工具项目配置
├── project.private.config.json
├── sitemap.json
├── pages/
│   └── pay/
│       ├── pay.js            # 支付页面逻辑（下单/查单/关单/退款/转账）
│       ├── pay.wxml          # 支付页面模板
│       └── pay.wxss          # 支付页面样式
└── miniprogram_npm/          # 构建后的 npm 包
```

## 架构说明

```
┌─────────────────┐     CloudBase Auth      ┌──────────────────┐
│  微信小程序       │  ─── signInWithOpenId ──→ │  CloudBase        │
│  (本模板)        │  ←── accessToken + openid │  身份认证          │
│                 │                          └──────────────────┘
│                 │     Bearer Token
│  pay.js         │  ─── POST /v1/functions/ ──→ ┌──────────────┐
│                 │      pay-common?webfn=true   │  HTTP 云函数    │
│                 │  ←── { code, msg, data }     │  (pay-common)  │
└─────────────────┘                              └──────────────┘
```

> **调用方式**：通过 CloudBase 云 API 网关调用 HTTP 云函数，路由通过 `body._action` 分发。

## 注意事项

- ⚠️ **金额安全**：示例中金额取自前端输入，仅供测试。**生产环境必须从后端数据库查询金额**。
- ⚠️ **商家转账需要固定 IP**：微信支付要求商家转账接口的调用方具有固定出口 IP，需在商户平台 → 产品中心 → 商家转账中配置 IP 白名单。CloudBase 云函数需开通**固定 IP** 功能。
- 商家转账 ≥ 2000 元需实现 `user_name` RSA 加密，本模板仅支持免密小额。
- 启动时若 `ENV_ID` 未修改，会弹出配置未完成的提示。
