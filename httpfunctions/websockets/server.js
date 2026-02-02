const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// 创建 HTTP 服务器
const server = http.createServer();

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    // 可以在这里添加身份验证逻辑
    return true;
  }
});

// 存储连接的客户端
const clients = new Set();

// 处理 WebSocket 连接
wss.on('connection', (ws, request) => {
  const location = url.parse(request.url, true);
  const clientId = location.query.clientId || `client_${Date.now()}`;
  
  console.log(`新客户端连接: ${clientId}`);
  
  // 将客户端添加到集合中
  ws.clientId = clientId;
  clients.add(ws);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    message: `欢迎 ${clientId}！当前在线用户数: ${clients.size}`,
    timestamp: new Date().toISOString()
  }));
  
  // 广播新用户加入消息
  broadcast({
    type: 'user_joined',
    clientId: clientId,
    message: `${clientId} 加入了聊天室`,
    onlineCount: clients.size,
    timestamp: new Date().toISOString()
  }, ws);
  
  // 处理收到的消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`收到来自 ${clientId} 的消息:`, message);
      
      switch (message.type) {
        case 'chat':
          // 广播聊天消息
          broadcast({
            type: 'chat',
            clientId: clientId,
            message: message.content,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'ping':
          // 响应心跳
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: '未知的消息类型',
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error('解析消息错误:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息格式错误',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // 处理连接关闭
  ws.on('close', () => {
    console.log(`客户端 ${clientId} 断开连接`);
    clients.delete(ws);
    
    // 广播用户离开消息
    broadcast({
      type: 'user_left',
      clientId: clientId,
      message: `${clientId} 离开了聊天室`,
      onlineCount: clients.size,
      timestamp: new Date().toISOString()
    });
  });
  
  // 处理连接错误
  ws.on('error', (error) => {
    console.error(`客户端 ${clientId} 连接错误:`, error);
    clients.delete(ws);
  });
});

// 广播消息给所有客户端（除了发送者）
function broadcast(message, sender = null) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// 广播消息给所有客户端（包括发送者）
function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// 定期清理断开的连接
setInterval(() => {
  clients.forEach(client => {
    if (client.readyState === WebSocket.CLOSED) {
      clients.delete(client);
    }
  });
}, 30000);

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket 服务器运行在端口 ${PORT}`);
  console.log(`WebSocket 连接地址: ws://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});