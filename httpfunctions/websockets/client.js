const WebSocket = require('ws');
const readline = require('readline');

class WebSocketClient {
  constructor(url, clientId) {
    this.url = url;
    this.clientId = clientId || `client_${Date.now()}`;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    
    // 创建命令行接口
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.setupReadline();
  }
  
  connect() {
    try {
      const wsUrl = `${this.url}?clientId=${this.clientId}`;
      console.log(`正在连接到 ${wsUrl}...`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket 连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.showHelp();
        this.startHeartbeat();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (error) {
          console.log('收到消息:', data.toString());
        }
      });
      
      this.ws.on('close', (code, reason) => {
        console.log(`❌ WebSocket 连接已关闭 (代码: ${code}, 原因: ${reason})`);
        this.isConnected = false;
        this.stopHeartbeat();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 ${this.reconnectInterval/1000}秒后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        } else {
          console.log('❌ 重连次数已达上限，请手动重启客户端');
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket 错误:', error.message);
      });
      
    } catch (error) {
      console.error('❌ 连接失败:', error.message);
    }
  }
  
  handleMessage(message) {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    switch (message.type) {
      case 'welcome':
        console.log(`🎉 ${message.message}`);
        break;
        
      case 'chat':
        if (message.clientId === this.clientId) {
          console.log(`[${timestamp}] 我: ${message.message}`);
        } else {
          console.log(`[${timestamp}] ${message.clientId}: ${message.message}`);
        }
        break;
        
      case 'user_joined':
        if (message.clientId !== this.clientId) {
          console.log(`👋 ${message.message} (在线人数: ${message.onlineCount})`);
        }
        break;
        
      case 'user_left':
        console.log(`👋 ${message.message} (在线人数: ${message.onlineCount})`);
        break;
        
      case 'pong':
        console.log('💓 心跳响应');
        break;
        
      case 'error':
        console.log(`❌ 错误: ${message.message}`);
        break;
        
      default:
        console.log('📨 收到消息:', message);
    }
  }
  
  sendMessage(type, content) {
    if (!this.isConnected || !this.ws) {
      console.log('❌ 未连接到服务器');
      return;
    }
    
    try {
      const message = {
        type: type,
        content: content,
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ 发送消息失败:', error.message);
    }
  }
  
  setupReadline() {
    this.rl.on('line', (input) => {
      const trimmed = input.trim();
      
      if (trimmed === '') return;
      
      // 处理命令
      if (trimmed.startsWith('/')) {
        this.handleCommand(trimmed);
      } else {
        // 发送聊天消息
        this.sendMessage('chat', trimmed);
      }
    });
    
    this.rl.on('close', () => {
      console.log('\n👋 再见！');
      this.disconnect();
      process.exit(0);
    });
  }
  
  handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case '/help':
        this.showHelp();
        break;
        
      case '/ping':
        this.sendMessage('ping');
        break;
        
      case '/quit':
      case '/exit':
        this.disconnect();
        process.exit(0);
        break;
        
      case '/status':
        console.log(`连接状态: ${this.isConnected ? '已连接' : '未连接'}`);
        console.log(`客户端ID: ${this.clientId}`);
        break;
        
      default:
        console.log(`❌ 未知命令: ${cmd}`);
        this.showHelp();
    }
  }
  
  showHelp() {
    console.log('\n📖 可用命令:');
    console.log('  /help     - 显示帮助信息');
    console.log('  /ping     - 发送心跳测试');
    console.log('  /status   - 显示连接状态');
    console.log('  /quit     - 退出客户端');
    console.log('  直接输入文字发送聊天消息');
    console.log('  按 Ctrl+C 退出\n');
  }
  
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage('ping');
      }
    }, 30000); // 每30秒发送一次心跳
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
    if (this.rl) {
      this.rl.close();
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const serverUrl = args[0] || 'ws://localhost:8080';
const clientId = args[1] || `client_${Math.random().toString(36).substr(2, 9)}`;

console.log('🚀 WebSocket 客户端启动中...');
console.log(`服务器地址: ${serverUrl}`);
console.log(`客户端ID: ${clientId}`);
console.log('按 Ctrl+C 退出\n');

// 创建并连接客户端
const client = new WebSocketClient(serverUrl, clientId);
client.connect();

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n正在断开连接...');
  client.disconnect();
  process.exit(0);
});