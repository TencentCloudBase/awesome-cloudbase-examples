#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket聊天客户端工具
用于测试WebSocket聊天服务器的功能
支持多用户聊天、心跳检测、自动重连等功能
"""

import asyncio
import websockets
import json
import sys
import signal
from datetime import datetime


class WebSocketChatClient:
    def __init__(self, uri, client_id=None):
        self.uri = uri
        self.client_id = client_id or f'client_{int(datetime.now().timestamp())}'
        self.websocket = None
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_interval = 3
        self.heartbeat_task = None
        self.listen_task = None
        
    async def connect(self):
        """连接到WebSocket服务器"""
        try:
            # 构造带客户端ID的URL
            ws_url = f"{self.uri}?clientId={self.client_id}"
            print(f"[{datetime.now()}] 正在连接到 {ws_url}...")
            
            self.websocket = await websockets.connect(ws_url)
            self.is_connected = True
            self.reconnect_attempts = 0
            
            print(f"✅ WebSocket 连接已建立")
            print(f"📱 客户端ID: {self.client_id}")
            
            return True
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return False
    
    async def disconnect(self):
        """断开连接"""
        self.is_connected = False
        
        # 停止心跳
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            
        # 停止监听
        if self.listen_task:
            self.listen_task.cancel()
            
        # 关闭连接
        if self.websocket:
            await self.websocket.close()
            
        print(f"[{datetime.now()}] 连接已断开")
    
    async def listen_messages(self):
        """监听服务器消息"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(data)
                except json.JSONDecodeError:
                    print(f"[{datetime.now()}] 收到文本消息: {message}")
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"❌ 服务器连接已断开")
            self.is_connected = False
            
            # 尝试重连
            if self.reconnect_attempts < self.max_reconnect_attempts:
                self.reconnect_attempts += 1
                print(f"🔄 {self.reconnect_interval}秒后尝试重连 ({self.reconnect_attempts}/{self.max_reconnect_attempts})...")
                await asyncio.sleep(self.reconnect_interval)
                await self.reconnect()
            else:
                print("❌ 重连次数已达上限，请手动重启客户端")
                
        except Exception as e:
            print(f"❌ 监听消息异常: {e}")
    
    async def handle_message(self, message):
        """处理服务器消息"""
        msg_type = message.get('type', 'unknown')
        timestamp = message.get('timestamp', '')
        
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_str = dt.strftime('%H:%M:%S')
            except:
                time_str = datetime.now().strftime('%H:%M:%S')
        else:
            time_str = datetime.now().strftime('%H:%M:%S')
        
        if msg_type == 'welcome':
            print(f"🎉 {message.get('message', '')}")
            
        elif msg_type == 'chat':
            client_id = message.get('clientId', 'unknown')
            content = message.get('message', '')
            
            if client_id == self.client_id:
                print(f"[{time_str}] 我: {content}")
            else:
                print(f"[{time_str}] {client_id}: {content}")
                
        elif msg_type == 'user_joined':
            client_id = message.get('clientId', 'unknown')
            if client_id != self.client_id:
                online_count = message.get('onlineCount', 0)
                print(f"👋 {client_id} 加入了聊天室 (在线人数: {online_count})")
                
        elif msg_type == 'user_left':
            client_id = message.get('clientId', 'unknown')
            online_count = message.get('onlineCount', 0)
            print(f"👋 {client_id} 离开了聊天室 (在线人数: {online_count})")
            
        elif msg_type == 'pong':
            print(f"💓 心跳响应")
            
        elif msg_type == 'error':
            error_msg = message.get('message', '未知错误')
            print(f"❌ 服务器错误: {error_msg}")
            
        else:
            print(f"📨 收到消息: {message}")
    
    async def send_message(self, msg_type, content=None):
        """发送消息到服务器"""
        if not self.is_connected or not self.websocket:
            print("❌ 未连接到服务器")
            return False
            
        try:
            message = {
                'type': msg_type,
                'timestamp': datetime.now().isoformat()
            }
            
            if content is not None:
                message['content'] = content
            
            await self.websocket.send(json.dumps(message, ensure_ascii=False))
            return True
            
        except Exception as e:
            print(f"❌ 发送消息失败: {e}")
            return False
    
    async def send_chat_message(self, content):
        """发送聊天消息"""
        return await self.send_message('chat', content)
    
    async def send_ping(self):
        """发送心跳"""
        return await self.send_message('ping')
    
    async def start_heartbeat(self):
        """启动心跳检测"""
        while self.is_connected:
            await asyncio.sleep(30)  # 每30秒发送一次心跳
            if self.is_connected:
                await self.send_ping()
    
    async def reconnect(self):
        """重新连接"""
        if await self.connect():
            # 重新启动监听和心跳
            self.listen_task = asyncio.create_task(self.listen_messages())
            self.heartbeat_task = asyncio.create_task(self.start_heartbeat())
    
    async def interactive_mode(self):
        """交互模式 - 用户可以输入消息"""
        print("\n=== 聊天室交互模式 ===")
        print("输入消息发送到聊天室，输入命令执行操作")
        print("可用命令:")
        print("  /help     - 显示帮助信息")
        print("  /ping     - 发送心跳测试")
        print("  /status   - 显示连接状态")
        print("  /quit     - 退出程序")
        print("  直接输入文字发送聊天消息")
        print("-" * 50)
        
        while self.is_connected:
            try:
                # 使用asyncio读取用户输入
                user_input = await asyncio.get_event_loop().run_in_executor(
                    None, input, "💬 "
                )
                
                user_input = user_input.strip()
                if not user_input:
                    continue
                
                if user_input.startswith('/'):
                    await self.handle_command(user_input)
                else:
                    await self.send_chat_message(user_input)
                    
            except (KeyboardInterrupt, EOFError):
                break
            except Exception as e:
                print(f"输入处理异常: {e}")
    
    async def handle_command(self, command):
        """处理用户命令"""
        cmd = command.lower().split()[0]
        
        if cmd == '/help':
            print("\n📖 可用命令:")
            print("  /help     - 显示帮助信息")
            print("  /ping     - 发送心跳测试")
            print("  /status   - 显示连接状态")
            print("  /quit     - 退出程序")
            print("  直接输入文字发送聊天消息\n")
            
        elif cmd == '/ping':
            await self.send_ping()
            
        elif cmd == '/status':
            status = "已连接" if self.is_connected else "未连接"
            print(f"📊 连接状态: {status}")
            print(f"📱 客户端ID: {self.client_id}")
            print(f"🔗 服务器地址: {self.uri}")
            
        elif cmd == '/quit':
            print("👋 正在退出...")
            await self.disconnect()
            
        else:
            print(f"❌ 未知命令: {cmd}")
            print("输入 /help 查看可用命令")


async def main():
    """主函数"""
    # 默认连接地址
    default_uri = "ws://localhost:9000"
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        uri = sys.argv[1]
    else:
        uri = default_uri
    
    if len(sys.argv) > 2:
        client_id = sys.argv[2]
    else:
        client_id = None
    
    print(f"🚀 WebSocket聊天客户端")
    print(f"🔗 连接地址: {uri}")
    print(f"⏰ 启动时间: {datetime.now()}")
    print("=" * 50)
    
    # 创建客户端
    client = WebSocketChatClient(uri, client_id)
    
    # 设置信号处理
    def signal_handler():
        print(f"\n[{datetime.now()}] 收到中断信号，正在断开连接...")
        asyncio.create_task(client.disconnect())
    
    # 注册信号处理器
    for sig in [signal.SIGINT, signal.SIGTERM]:
        signal.signal(sig, lambda s, f: signal_handler())
    
    try:
        # 连接服务器
        if not await client.connect():
            return
        
        # 启动监听和心跳任务
        client.listen_task = asyncio.create_task(client.listen_messages())
        client.heartbeat_task = asyncio.create_task(client.start_heartbeat())
        
        # 进入交互模式
        await client.interactive_mode()
        
    except Exception as e:
        print(f"❌ 程序异常: {e}")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n[{datetime.now()}] 程序已退出")
    except Exception as e:
        print(f"程序异常: {e}")