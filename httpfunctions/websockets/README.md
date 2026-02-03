# WebSocket 示例

这是一个简单的 WebSocket 服务端和客户端示例，演示了如何使用 Node.js 和 WebSocket 技术实现实时通信。

## 📁 项目结构

```
websockets/
├── server.js              # WebSocket 服务端
├── client.js              # Node.js 命令行客户端
├── client-browser.html    # 浏览器客户端
├── package.json           # 项目配置文件
└── README.md             # 说明文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd websockets
npm install
```

### 2. 启动服务端

```bash
# 方式一：使用 npm script
npm start

# 方式二：直接运行
node server.js
```

服务端将在 `http://localhost:9000` 启动，WebSocket 连接地址为 `ws://localhost:9000`。

### 3. 连接客户端

#### 方式一：Node.js 命令行客户端

```bash
# 使用默认设置连接
npm run client

# 或者直接运行
node client.js

# 指定服务器地址和客户端ID
node client.js ws://localhost:9000 my-client-id
```

#### 方式二：浏览器客户端

直接在浏览器中打开 `client-browser.html` 文件，或者通过 HTTP 服务器访问。

## 部署到 HTTP 云函数

编写 `scf_bootstrap` 文件，内容如下:

```bash
#!/bin/bash
node server.js
```

然后上传到云函数，即可部署成功。(部署 HTTP 云函数时， WebSocket 协议需要勾选为 true)

部署到 HTTP 云函数时，访问使用 `wss://` 访问。

## 💡 功能特性

### 服务端功能
- ✅ WebSocket 连接管理
- ✅ 客户端身份识别
- ✅ 消息广播
- ✅ 心跳检测
- ✅ 连接状态监控
- ✅ 优雅关闭
- ✅ 错误处理

### 客户端功能
- ✅ 自动重连机制
- ✅ 心跳保活
- ✅ 命令行交互（Node.js 客户端）
- ✅ 图形界面（浏览器客户端）
- ✅ 实时聊天
- ✅ 连接状态显示

## 🎮 使用说明

### Node.js 客户端命令

连接成功后，可以使用以下命令：

- `/help` - 显示帮助信息
- `/ping` - 发送心跳测试
- `/status` - 显示连接状态
- `/quit` 或 `/exit` - 退出客户端
- 直接输入文字 - 发送聊天消息
- `Ctrl+C` - 强制退出

### 浏览器客户端操作

1. 输入 WebSocket 服务器地址（默认：`ws://localhost:9000`）
2. 可选：输入自定义客户端ID
3. 点击"连接"按钮
4. 在消息输入框中输入内容并发送
5. 使用控制按钮进行心跳测试、清空消息等操作

## 📡 消息协议

### 客户端发送消息格式

```json
{
  "type": "chat|ping",
  "content": "消息内容",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 服务端响应消息格式

```json
{
  "type": "welcome|chat|user_joined|user_left|pong|error",
  "clientId": "客户端ID",
  "message": "消息内容",
  "onlineCount": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 消息类型说明

| 类型 | 方向 | 说明 |
|------|------|------|
| `chat` | 双向 | 聊天消息 |
| `ping` | 客户端→服务端 | 心跳请求 |
| `pong` | 服务端→客户端 | 心跳响应 |
| `welcome` | 服务端→客户端 | 欢迎消息 |
| `user_joined` | 服务端→客户端 | 用户加入通知 |
| `user_left` | 服务端→客户端 | 用户离开通知 |
| `error` | 服务端→客户端 | 错误消息 |

## ⚙️ 配置选项

### 环境变量

- `PORT` - 服务端监听端口（默认：8080）

### 服务端配置

可以在 `server.js` 中修改以下配置：

```javascript
const PORT = process.env.PORT || 9000;  // 监听端口
const heartbeatInterval = 30000;        // 心跳间隔（毫秒）
const maxReconnectAttempts = 5;         // 最大重连次数
```

### 客户端配置

可以在 `client.js` 中修改以下配置：

```javascript
const maxReconnectAttempts = 5;         // 最大重连次数
const reconnectInterval = 3000;         // 重连间隔（毫秒）
const heartbeatInterval = 30000;        // 心跳间隔（毫秒）
```

## 🔧 开发调试

### 启动开发模式

```bash
# 启动服务端（开发模式）
npm run dev

# 在另一个终端启动客户端
npm run client
```

### 测试多客户端

可以同时启动多个客户端来测试多用户聊天：

```bash
# 终端1
node client.js ws://localhost:9000 alice

# 终端2  
node client.js ws://localhost:9000 bob

# 终端3
node client.js ws://localhost:9000 charlie
```

### 日志输出

服务端会输出详细的连接和消息日志：

```
WebSocket 服务器运行在端口 9000
WebSocket 连接地址: ws://localhost:9000
新客户端连接: alice
收到来自 alice 的消息: { type: 'chat', content: 'Hello!' }
客户端 bob 断开连接
```
