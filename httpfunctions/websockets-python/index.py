#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云WebFunc WebSocket聊天室示例
基于asyncio和websockets库实现的异步WebSocket服务器
功能特性：
- 多用户聊天室
- 客户端身份识别
- 消息广播
- 心跳检测
- 连接状态管理
"""

import asyncio
import websockets
import json
import time
import urllib.parse
from datetime import datetime
from typing import Set, Dict, Any


class WebSocketChatServer:
    def __init__(self):
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.client_info: Dict[websockets.WebSocketServerProtocol, Dict[str, Any]] = {}
        
    def get_client_id(self, websocket) -> str:
        """获取客户端ID"""
        return self.client_info.get(websocket, {}).get('client_id', 'unknown')
    
    def get_online_count(self) -> int:
        """获取在线用户数"""
        return len(self.clients)
    
    async def register_client(self, websocket, client_id: str):
        """注册新客户端"""
        self.clients.add(websocket)
        self.client_info[websocket] = {
            'client_id': client_id,
            'connected_at': datetime.now(),
            'last_ping': datetime.now()
        }
        
        print(f"[{datetime.now()}] 新客户端连接: {client_id}")
        
        # 发送欢迎消息
        welcome_message = {
            'type': 'welcome',
            'message': f'欢迎 {client_id}！当前在线用户数: {self.get_online_count()}',
            'timestamp': datetime.now().isoformat()
        }
        await websocket.send(json.dumps(welcome_message, ensure_ascii=False))
        
        # 广播用户加入消息
        await self.broadcast({
            'type': 'user_joined',
            'clientId': client_id,
            'message': f'{client_id} 加入了聊天室',
            'onlineCount': self.get_online_count(),
            'timestamp': datetime.now().isoformat()
        }, exclude=websocket)
    
    async def unregister_client(self, websocket):
        """注销客户端"""
        if websocket in self.clients:
            client_id = self.get_client_id(websocket)
            self.clients.remove(websocket)
            
            if websocket in self.client_info:
                del self.client_info[websocket]
            
            print(f"[{datetime.now()}] 客户端 {client_id} 断开连接")
            
            # 广播用户离开消息
            await self.broadcast({
                'type': 'user_left',
                'clientId': client_id,
                'message': f'{client_id} 离开了聊天室',
                'onlineCount': self.get_online_count(),
                'timestamp': datetime.now().isoformat()
            })
    
    async def broadcast(self, message: dict, exclude=None):
        """广播消息给所有客户端（可排除指定客户端）"""
        if not self.clients:
            return
            
        message_str = json.dumps(message, ensure_ascii=False)
        disconnected = set()
        
        for client in self.clients:
            if client == exclude:
                continue
                
            try:
                await client.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
            except Exception as e:
                print(f"[{datetime.now()}] 广播消息失败: {e}")
                disconnected.add(client)
        
        # 清理断开的连接
        for client in disconnected:
            await self.unregister_client(client)
    
    async def broadcast_to_all(self, message: dict):
        """广播消息给所有客户端（包括发送者）"""
        await self.broadcast(message)
    
    async def handle_message(self, websocket, message_data: dict):
        """处理客户端消息"""
        client_id = self.get_client_id(websocket)
        msg_type = message_data.get('type', 'unknown')
        content = message_data.get('content', '')
        
        print(f"[{datetime.now()}] 收到来自 {client_id} 的消息: {message_data}")
        
        if msg_type == 'chat':
            # 广播聊天消息
            await self.broadcast({
                'type': 'chat',
                'clientId': client_id,
                'message': content,
                'timestamp': datetime.now().isoformat()
            })
            
        elif msg_type == 'ping':
            # 更新心跳时间
            if websocket in self.client_info:
                self.client_info[websocket]['last_ping'] = datetime.now()
            
            # 响应心跳
            await websocket.send(json.dumps({
                'type': 'pong',
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
            
        else:
            # 未知消息类型
            await websocket.send(json.dumps({
                'type': 'error',
                'message': f'未知的消息类型: {msg_type}',
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
    
    async def cleanup_connections(self):
        """定期清理断开的连接"""
        while True:
            await asyncio.sleep(30)  # 每30秒检查一次
            
            disconnected = set()
            current_time = datetime.now()
            
            for client in list(self.clients):
                try:
                    # 检查连接状态
                    if client.closed:
                        disconnected.add(client)
                        continue
                    
                    # 检查心跳超时（5分钟无心跳则认为断开）
                    client_data = self.client_info.get(client)
                    if client_data:
                        last_ping = client_data.get('last_ping', current_time)
                        if (current_time - last_ping).total_seconds() > 300:
                            print(f"[{datetime.now()}] 客户端 {client_data['client_id']} 心跳超时")
                            disconnected.add(client)
                            
                except Exception as e:
                    print(f"[{datetime.now()}] 检查连接状态异常: {e}")
                    disconnected.add(client)
            
            # 清理断开的连接
            for client in disconnected:
                await self.unregister_client(client)


# 全局聊天服务器实例
chat_server = WebSocketChatServer()


async def handle_client(websocket, path):
    """处理客户端连接"""
    # 解析URL参数获取客户端ID
    query_params = urllib.parse.parse_qs(urllib.parse.urlparse(path).query)
    client_id = query_params.get('clientId', [f'client_{int(time.time())}'])[0]
    
    try:
        # 注册客户端
        await chat_server.register_client(websocket, client_id)
        
        # 处理消息
        async for message in websocket:
            try:
                message_data = json.loads(message)
                await chat_server.handle_message(websocket, message_data)
            except json.JSONDecodeError:
                # 处理非JSON消息（向后兼容）
                await chat_server.handle_message(websocket, {
                    'type': 'chat',
                    'content': message
                })
            except Exception as e:
                print(f"[{datetime.now()}] 处理消息异常: {e}")
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': f'消息处理错误: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }, ensure_ascii=False))
                
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[{datetime.now()}] 客户端处理异常: {e}")
    finally:
        # 注销客户端
        await chat_server.unregister_client(websocket)


async def start_server():
    """启动WebSocket服务器"""
    host = "0.0.0.0"
    port = 9000
    
    print(f"[{datetime.now()}] 启动WebSocket聊天服务器...")
    print(f"[{datetime.now()}] 监听地址: {host}:{port}")
    print(f"[{datetime.now()}] 服务器功能:")
    print(f"  - 多用户聊天室")
    print(f"  - 客户端身份识别")
    print(f"  - 消息广播")
    print(f"  - 心跳检测")
    print(f"  - 连接状态管理")
    print(f"  - JSON消息支持")
    
    # 启动连接清理任务
    cleanup_task = asyncio.create_task(chat_server.cleanup_connections())
    
    try:
        # 创建并启动服务器
        async with websockets.serve(handle_client, host, port):
            print(f"[{datetime.now()}] WebSocket服务器已启动，等待连接...")
            print(f"[{datetime.now()}] 连接地址: ws://{host}:{port}")
            print(f"[{datetime.now()}] 带客户端ID的连接: ws://{host}:{port}?clientId=your_id")
            
            # 保持服务器运行
            await asyncio.Future()  # 永远等待
    except KeyboardInterrupt:
        print(f"\n[{datetime.now()}] 收到中断信号，正在关闭服务器...")
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        print(f"[{datetime.now()}] 服务器已关闭")


def main():
    """
    主函数 - 启动WebSocket服务器
    """
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        print(f"\n[{datetime.now()}] 程序被用户中断")
    except Exception as e:
        print(f"[{datetime.now()}] 服务器启动失败: {e}")


def main_handler(event, context):
    """
    腾讯云开发云函数入口函数
    """
    print(f"[{datetime.now()}] 云函数启动，事件: {event}")
    
    # 对于WebSocket连接，直接启动服务器
    try:
        asyncio.run(start_server())
    except Exception as e:
        print(f"[{datetime.now()}] 云函数执行失败: {e}")
        return {
            'statusCode': 500,
            'body': f'服务器启动失败: {str(e)}'
        }
    
    return {
        'statusCode': 200,
        'body': 'WebSocket服务器已启动'
    }


if __name__ == "__main__":
    main()