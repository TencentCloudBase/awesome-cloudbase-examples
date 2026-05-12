# 微信公众号 Web Demo

基于 CloudBase 静态托管的微信公众号开放能力前端演示页面，配合 `offiaccount-common` 云函数使用。

## 功能演示

| # | 能力 | 说明 |
|---|------|------|
| ① | **网页授权** | 发起微信 OAuth → code 换 openid，支持 `snsapi_base` / `snsapi_userinfo` |
| ② | **AccessToken** | 拉取全局 / 稳定版 access_token |
| ③ | **JS-SDK 签名** | 获取 `wx.config` 所需的签名包 |
| ④ | **订阅通知** | 发送订阅消息 |
| ⑤ | **自定义菜单** | 创建 / 查询 / 删除公众号菜单 |
| ⑥ | **带参数二维码** | 生成临时 / 永久带参数二维码 |

## 目录结构

```
examples/web/
├── index.html         # 单页演示页面（纯原生 HTML + JS，无框架依赖）
├── cloudbaserc.json   # CloudBase 静态托管部署配置
└── README.md
```

## 前置条件

1. 已部署 `offiaccount-common` 云函数（见 [functions/offiaccount-common/README.md](../../functions/offiaccount-common/README.md)）
2. 已在 CloudBase 控制台开启 **HTTP 访问服务** 并为云函数配置路由
3. 公众号后台已配置 **网页授权域名**（JS 接口安全域名）
4. **已开启固定 IP**：部分微信接口（获取 access_token、自定义菜单、订阅通知等）要求调用方 IP 在公众号后台的 **IP 白名单** 中。CloudBase 云函数默认出口 IP 不固定，需要在 CloudBase 控制台为云函数开启「固定 IP」，然后将该固定 IP 添加到公众号后台 → 「开发」→「基本配置」→「IP 白名单」

## 快速开始

### 1. 修改 API 地址

打开 `index.html`，将页面顶部的「API 地址」输入框的默认值改为你的实际 HTTP 访问服务地址：

```
https://{envId}-{uin}.ap-shanghai.app.tcloudbase.com/{routePath}
```

其中：
- `{envId}` — CloudBase 环境 ID
- `{uin}` — 腾讯云账号 UIN
- `{routePath}` — 你在 HTTP 访问服务中为 `offiaccount-common` 配置的路由路径

### 2. 部署到 CloudBase 静态托管

```bash
# 在 examples/web 目录下
# 先修改 cloudbaserc.json 中的 envId 为你的环境 ID
tcb app deploy
```

### 3. 在微信中访问

在微信浏览器中打开部署后的页面地址，即可体验各项公众号能力。

> ⚠️ **注意**：网页授权（OAuth）功能必须在**微信内置浏览器**中使用，PC 浏览器无法完成授权流程。

## 配置说明

### cloudbaserc.json

```json
{
  "version": "2.0",
  "envId": "your-env-id",
  "app": {
    "serviceName": "offiaccount-app",
    "framework": "static",
    "outputDir": "."
  }
}
```

| 字段 | 说明 |
|------|------|
| `envId` | CloudBase 环境 ID，替换为你的真实值 |
| `serviceName` | 静态托管服务名称，可自定义 |
| `framework` | 固定 `static`，表示纯静态文件 |
| `outputDir` | 部署目录，`.` 表示当前目录 |

## 工作原理

```
微信浏览器
    │
    ▼
index.html（静态托管）
    │  fetch POST
    ▼
HTTP 访问服务网关
    │  路由转发
    ▼
offiaccount-common 云函数
    │  调用微信 API
    ▼
微信公众平台 API
```

1. 页面通过 `fetch` 向 HTTP 访问服务发送 POST 请求
2. 网关根据路由规则将请求转发到 `offiaccount-common` 云函数
3. 云函数调用微信公众平台 API 并返回结果
4. 页面展示 JSON 响应

## 本地调试

如需本地调试，可先在本地启动 `offiaccount-common`：

```bash
cd ../../functions/offiaccount-common
appId=wxXXXXXX appSecret=YYYYYY node bin/www
# 默认端口 3000
```

然后将页面中的 API 地址改为 `http://localhost:3000`，直接用浏览器打开 `index.html` 即可测试 Token、菜单等不依赖微信环境的接口。
