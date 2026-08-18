# offiaccount-common 微信公众号通用云函数

## 简介

`offiaccount-common` 是微信公众号开放能力的统一 CloudBase HTTP 云函数，封装了公众号的全套常用接口：

| 模块 | 路由前缀 | 功能 |
|------|---------|------|
| 网页授权 | `/oauth/*` | code→openid、刷新 token、拉取用户信息 |
| AccessToken | `/token/*` | 全局 token、稳定版 token |
| JS-SDK | `/jssdk/*` | wx.config 签名包 |
| 开放接口管理 | `/openapi/*` | 重置次数、查询配额、rid 排查 |
| 订阅通知 | `/subscribe/*` | 发送订阅消息、模板管理 |
| 客服消息 | `/kefu/*` | 发送消息、输入状态、账号管理 |
| 自定义菜单 | `/menu/*` | 创建/查询/删除菜单 |
| 消息管理 | `/message/*` | 模板消息、群发消息 |
| 用户管理 | `/user/*` | 用户信息、关注列表、标签 |
| 素材管理 | `/media/*` | 临时素材、永久图文、素材列表 |
| 带参数二维码 | `/qrcode/*` | 创建 ticket、获取图片 URL |
| 账号管理 | `/account/*` | 生成短链接 |

---

## 快速部署

### 1. 配置环境变量

在 `cloudbaserc.json` 的 `environmentVariables` 中填入：

```json
{
  "appId":     "wx开头的公众号AppID",
  "appSecret": "公众号AppSecret"
}
```

### 2. 安装依赖

```bash
cd functions/offiaccount-common
npm install
```

### 3. 本地启动（调试）

```bash
# 设置环境变量后启动
appId=wxXXXXXX appSecret=YYYYYY node bin/www
# 默认端口 3000，CloudBase 部署用 PORT=9000
```

### 4. 部署到 CloudBase

```bash
# 在 workspace 根目录（含 cloudbaserc.json）
tcb fn deploy offiaccount-common

# 或在 offiaccount-common 目录下直接部署
cd functions/offiaccount-common
tcb fn deploy --dir .
```

### 5. 开启固定 IP 并配置白名单

> ⚠️ **必须操作**：微信公众号的大部分 API（获取 access_token、自定义菜单、订阅通知、用户管理等）要求调用方 IP 在公众号后台的 IP 白名单中。CloudBase 云函数默认出口 IP 不固定，**不配置会导致调用微信 API 报错 `40164 invalid ip, not in whitelist`**。

| 步骤 | 操作位置 | 具体操作 |
|:----:|---------|---------|
| ① | CloudBase 控制台 | 云函数 → `offiaccount-common` → 函数配置 → 开启「固定出口 IP」 |
| ② | CloudBase 控制台 | 开启后复制分配的固定 IP 地址 |
| ③ | 微信公众号后台 | 开发 → 基本配置 → IP 白名单 → 添加上一步获取的固定 IP |

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `appId` | ✅ | 公众号 AppID（wx 开头） |
| `appSecret` | ✅ | 公众号 AppSecret |
| `corsAllowOrigin` | 可选 | 允许跨域的来源，多个用逗号分隔，例如 `https://example.com` |

---

## 接口说明

### 统一响应格式

所有接口均返回：

```json
{ "code": 0, "msg": "ok", "data": { ... } }         // 成功
{ "code": -1, "msg": "错误原因", "data": null }      // 失败
```

---

### 网页授权 `/oauth/*`

#### POST `/oauth/config`
返回公众号 AppID，供前端拼接授权链接。

```bash
curl -X POST http://localhost:3000/oauth/config
# → { "code": 0, "data": { "appId": "wxXXXXXX" } }
```

前端授权链接格式：
```
https://open.weixin.qq.com/connect/oauth2/authorize
  ?appid={appId}
  &redirect_uri={encodeURIComponent(回调页面URL)}
  &response_type=code
  &scope=snsapi_base        # 静默授权，只获取 openid
  # scope=snsapi_userinfo   # 弹出授权页，可获取用户信息
  &state={自定义状态}
  #wechat_redirect
```

#### POST `/oauth/token`
用微信回调的 code 换取 openid。

```json
// 请求
{ "code": "微信回调code" }
// 响应
{ "data": { "openid": "...", "access_token": "...", "refresh_token": "...", "expires_in": 7200 } }
```

#### POST `/oauth/refresh`
刷新 OAuth access_token（非全局 access_token）。

```json
{ "refresh_token": "..." }
```

#### POST `/oauth/userinfo`
拉取用户信息（需 `snsapi_userinfo` scope）。

```json
{ "access_token": "...", "openid": "..." }
```

#### POST `/oauth/verify`
校验 OAuth access_token 是否有效。

```json
{ "access_token": "...", "openid": "..." }
// → { "data": { "valid": true } }
```

---

### AccessToken `/token/*`

#### POST `/token/get`
获取全局 access_token（内存缓存，有效期内复用）。

```bash
curl -X POST http://localhost:3000/token/get
# → { "data": { "access_token": "..." } }
```

> ⚠️ 注意：云函数冷启动后缓存失效，每次冷启动需重新调用微信接口。
> 生产建议将 token 持久化到 CloudBase DB（TODO）。

#### POST `/token/stable`
获取稳定版 access_token。

```json
{ "force_refresh": false }   // true 时强制刷新
```

---

### JS-SDK `/jssdk/*`

#### POST `/jssdk/config`
生成 `wx.config` 所需的签名包。

```json
// 请求：传入当前页面完整 URL（不含 # 及其后内容）
{ "url": "https://example.com/page?query=1" }

// 响应
{
  "data": {
    "appId": "wxXXXXXX",
    "timestamp": 1700000000,
    "nonceStr": "abc123",
    "signature": "sha1签名"
  }
}
```

前端使用：
```js
wx.config({
  debug: false,
  appId: data.appId,
  timestamp: data.timestamp,
  nonceStr: data.nonceStr,
  signature: data.signature,
  jsApiList: ['chooseImage', 'previewImage', ...]
});
```

---

### 订阅通知 `/subscribe/*`

#### POST `/subscribe/bizsend`
发送订阅通知（需用户主动订阅）。

```json
{
  "touser": "用户openid",
  "template_id": "私有模板ID",
  "page": "pages/index/index",
  "data": {
    "thing1": { "value": "内容1" },
    "time2":  { "value": "2024-01-01" }
  }
}
```

#### POST `/subscribe/list`
获取当前账号的私有模板列表。

---

### 客服消息 `/kefu/*`

#### POST `/kefu/send`
发送客服消息（用户需在 48 小时内有互动）。

```json
// 发文本消息
{ "touser": "openid", "msgtype": "text", "text": { "content": "你好！" } }

// 发图片消息
{ "touser": "openid", "msgtype": "image", "image": { "media_id": "素材ID" } }

// 发图文链接
{
  "touser": "openid",
  "msgtype": "news",
  "news": {
    "articles": [{
      "title": "标题", "description": "描述",
      "url": "https://...", "picurl": "https://..."
    }]
  }
}
```

#### POST `/kefu/typing`
发送输入状态（"对方正在输入"）。

```json
{ "touser": "openid", "command": "Typing" }
// command: "Typing" | "CancelTyping"
```

---

### 自定义菜单 `/menu/*`

#### POST `/menu/create`
创建自定义菜单（最多 3 个一级菜单，每个一级菜单最多 5 个二级菜单）。

```json
{
  "button": [
    { "type": "view", "name": "官网", "url": "https://example.com" },
    {
      "name": "服务",
      "sub_button": [
        { "type": "click", "name": "联系我们", "key": "V1001_CONTACT" },
        { "type": "miniprogram", "name": "小程序", "appid": "wx...", "pagepath": "pages/index/index", "url": "https://..." }
      ]
    }
  ]
}
```

菜单类型：`click`（点击事件）/ `view`（URL 跳转）/ `miniprogram`（小程序）/ `scancode_push`（扫码）等。

---

### 消息管理 `/message/*`

#### POST `/message/template_send`
发送模板消息（需在公众号后台申请模板）。

```json
{
  "touser": "openid",
  "template_id": "模板ID",
  "url": "https://点击跳转链接",
  "data": {
    "first":    { "value": "你有一条新消息", "color": "#173177" },
    "keyword1": { "value": "订单号123", "color": "#173177" },
    "remark":   { "value": "感谢使用！" }
  }
}
```

#### POST `/message/mass_send`
群发消息（按标签或 openid 列表）。

```json
// 按标签群发
{ "filter": { "is_to_all": false, "tag_id": 2 }, "text": { "content": "公告内容" }, "msgtype": "text" }

// 指定 openid 列表（最多 10000）
{ "touser": ["openid1", "openid2"], "text": { "content": "..." }, "msgtype": "text" }
```

---

### 用户管理 `/user/*`

#### POST `/user/info`
获取用户基本信息（用户需关注公众号）。

```json
{ "openid": "用户openid" }
// → { "nickname": "...", "headimgurl": "...", "subscribe": 1, ... }
```

#### POST `/user/list`
获取所有关注者 openid 列表（分页）。

```json
{}                                    // 第一页
{ "next_openid": "上次返回的值" }      // 翻页
```

#### POST `/user/tags`
标签管理。

```json
// 创建标签
{ "action": "create", "name": "VIP用户" }
// → { "tag": { "id": 100, "name": "VIP用户" } }

// 查询所有标签
{ "action": "list" }

// 删除标签
{ "action": "delete", "id": 100 }
```

---

### 素材管理 `/media/*`

#### POST `/media/upload_temp`
获取临时素材上传端点（文件上传需在服务端进行）。

```json
{ "type": "image" }   // image / voice / video / thumb
// → { "upload_url": "带access_token的上传URL" }
```

#### POST `/media/add_news`
新增永久图文素材。

```json
{
  "articles": [{
    "title": "文章标题",
    "thumb_media_id": "封面图素材ID",
    "author": "作者",
    "content": "<p>HTML内容</p>",
    "content_source_url": "https://原文链接",
    "digest": "摘要"
  }]
}
```

#### POST `/media/batchget_material`
获取素材列表。

```json
{ "type": "image", "offset": 0, "count": 20 }
```

---

### 带参数二维码 `/qrcode/*`

#### POST `/qrcode/create`
创建带参数二维码，用于追踪不同渠道来源。

```json
// 临时整型参数（30天有效）
{ "action_name": "QR_SCENE", "expire_seconds": 2592000, "scene_id": 123 }

// 永久字符串参数
{ "action_name": "QR_LIMIT_STR_SCENE", "scene_str": "channel_a" }

// → { "ticket": "...", "expire_seconds": 2592000, "url": "...", "qrcode_url": "直接可访问的二维码图片URL" }
```

#### POST `/qrcode/show`
根据 ticket 获取二维码图片 URL。

```json
{ "ticket": "..." }
// → { "qrcode_url": "https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=..." }
```

---

### 账号管理 `/account/*`

#### POST `/account/shorturl`
生成短链接（注意：微信已停止为新账号提供此服务）。

```json
{ "long_url": "https://example.com/very/long/path" }
```

---

## AccessToken 缓存说明

当前实现使用**进程内存缓存**：
- 有效期剩余 < 60 秒时自动刷新
- 云函数**冷启动后缓存失效**，每次冷启动都需调用微信接口重新获取

**生产环境建议（TODO）**：将 access_token 持久化到 CloudBase 数据库或 Redis，所有实例共用同一个 token，避免频繁触发微信 API 调用（每日上限 2000 次）。

```js
// TODO: 用 CloudBase DB 替换内存缓存示例
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: process.env.TCB_ENV });
const db = app.database();

async function getAccessToken() {
  const doc = await db.collection('wx_token_cache').doc('access_token').get();
  if (doc.data && doc.data.expireAt > Date.now() + 60000) {
    return doc.data.token;
  }
  // ... 重新获取并写入 DB
}
```

---

## 本地测试示例

```bash
# 启动本地服务
appId=wxXXXXXX appSecret=YYYYYY node bin/www

# 获取全局 access_token
curl -X POST http://localhost:3000/token/get

# 获取 JSSDK 签名
curl -X POST http://localhost:3000/jssdk/config \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/page"}'

# 获取 AppID（用于 OAuth）
curl -X POST http://localhost:3000/oauth/config

# 获取用户信息
curl -X POST http://localhost:3000/user/info \
  -H 'Content-Type: application/json' \
  -d '{"openid":"用户openid"}'
```

---

## 目录结构

```
offiaccount-common/
├── index.js              # CloudBase 入口
├── app.js                # Express 主应用
├── Dockerfile            # 容器部署（端口 80）
├── scf_bootstrap         # CloudBase HTTP 函数启动脚本（端口 9000）
├── bin/www               # 本地启动脚本（端口 3000）
├── package.json
├── cloudbaserc.json
├── .env.example          # 环境变量模板
├── config/
│   └── config.js         # appId / appSecret + validateConfig()
├── utils/
│   ├── wxApi.js          # 统一微信 API 请求封装（wxGet / wxPost）
│   ├── tokenCache.js     # AccessToken + jsapi_ticket 内存缓存
│   ├── response.js       # 统一响应格式 { code, msg, data }
│   └── validator.js      # 参数校验工具函数
├── controllers/
│   ├── oauthController.js
│   ├── tokenController.js
│   ├── jssdkController.js
│   ├── openApiController.js
│   ├── subscribeController.js
│   ├── kefuController.js
│   ├── menuController.js
│   ├── messageController.js
│   ├── userController.js
│   ├── mediaController.js
│   ├── qrcodeController.js
│   └── accountController.js
├── services/
│   └── businessService.js  # 业务钩子（订阅/客服/OAuth 前后处理扩展点）
├── routes/
│   └── index.js          # 汇总所有路由
├── tests/
│   ├── config.test.js    # 配置校验测试
│   ├── controller.test.js # Controller 路由测试
│   ├── tokenCache.test.js # Token 缓存逻辑测试
│   ├── validator.test.js  # 参数校验测试
│   └── wxApi.test.js     # 微信 API 封装测试
└── _lib/                 # 可复用共享库（跨云函数参考）
    ├── README.md
    ├── auth.js           # 鉴权中间件
    ├── callback.js       # 微信回调处理
    ├── error.js          # 统一错误类 AppError
    ├── logger.js         # 日志工具
    ├── response.js       # 响应格式（与 utils/response.js 一致）
    └── scaffold/         # 脚手架模板
```
