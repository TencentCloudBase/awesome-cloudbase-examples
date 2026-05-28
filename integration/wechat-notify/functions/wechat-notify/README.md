# wechat-notify

微信回调接收云函数 — 仅打印 headers + body，方便观察集成中心推送的实际消息格式。

> 💡 本示例**只做打印和返回 `success`**，不做任何业务处理。如需被动回复用户消息等场景，请参考微信官方文档自行接入。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 健康检查 |
| POST | `/wechat/notify` | 回调入口（打印后返回 success） |

## 目录结构

```
wechat-notify/
├── routes/
│   └── notify.js       # POST /wechat/notify 路由
├── app.js              # Express 主应用
├── index.js            # 云函数入口
├── bin/www             # 本地启动脚本
├── scf_bootstrap       # SCF 启动脚本
└── Dockerfile
```

## 工作原理

```
微信服务器
    ↓ 推送事件（消息 / 关注 / 菜单点击等）
微信集成中心网关（平台侧）
    ↓ 验签、解密、转换
    ↓ POST /wechat/notify
wechat-notify
    ↓ console.log(headers, body)
    → 返回 "success"
```

## 回调回包说明

微信服务器推送消息/事件后，要求在 **5 秒内**返回响应，否则断开连接并**重试 3 次**。

本示例统一返回 `"success"`，表示消息已收到，微信不再重试。

如需处理更多场景（被动回复用户消息、消息排重等），请参考微信官方文档：

> 📖 [接收普通消息](https://developers.weixin.qq.com/doc/service/guide/product/message/Receiving_standard_messages.html) · [被动回复用户消息](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Passive_user_reply_message.html)

## 本地开发

```bash
cd functions/wechat-notify
npm install
npm start
# 访问 http://localhost:3000
```

### 模拟回调

```bash
curl -X POST http://localhost:3000/wechat/notify \
  -H "Content-Type: application/json" \
  -d '{
    "MsgType": "text",
    "Content": "你好",
    "FromUserName": "oXXXX_user_openid",
    "ToUserName": "gh_xxxx",
    "CreateTime": 1700000000,
    "MsgId": "1234567890"
  }'
```

## 部署

```bash
tcb fn deploy wechat-notify
```

## 作为模板复用

这个函数可以直接复制为其他回调接收器（改名即可）：

```bash
cp -r functions/wechat-notify functions/wechat-notify-channels
# 修改 app.js 中路径重写的 prefix 为新函数名
```

需要修改的唯一一处：`app.js` 里的 `const prefix = '/wechat-notify'` 改为新函数名。
