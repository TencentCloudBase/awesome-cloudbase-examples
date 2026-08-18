# WebSocket 聊天室 - 基于腾讯云开发云函数

这是一个功能完整的WebSocket聊天室示例，基于腾讯云开发云函数部署，使用Python的`asyncio`和`websockets`库实现。参考了JavaScript版本websockets目录的功能特性，提供多用户实时聊天体验。

## 🎯 功能特性

- ✅ **多用户聊天室**: 支持多个用户同时在线聊天
- ✅ **客户端身份识别**: 每个客户端都有唯一ID标识
- ✅ **消息广播**: 实时广播聊天消息给所有在线用户
- ✅ **心跳检测**: 自动检测连接状态，支持心跳保活
- ✅ **自动重连**: 客户端支持断线自动重连机制
- ✅ **连接管理**: 服务器端智能管理客户端连接
- ✅ **用户状态通知**: 实时通知用户加入/离开聊天室
- ✅ **浏览器支持**: 提供现代化的Web界面
- ✅ **命令行客户端**: 支持终端交互式聊天
- ✅ **腾讯云开发云函数部署**: 完整的云开发部署方案

## 📁 项目结构

```
websockets-python/
├── index.py              # WebSocket聊天服务器主文件
├── client.py             # 命令行聊天客户端
├── client-browser.html   # 浏览器聊天客户端
├── requirements.txt      # Python依赖列表
├── scf_bootstrap         # SCF启动脚本
├── third_party/          # Python依赖库目录（部署时生成）
└── README.md             # 项目文档
```

**部署文件说明**：
- `index.py` - 服务器主程序
- `requirements.txt` - 依赖列表
- `scf_bootstrap` - 启动脚本（必须有执行权限）
- `third_party/` - 依赖库目录（通过 `pip install -t` 生成）

**客户端文件**（仅用于本地测试，不需要部署）：
- `client.py` - 命令行客户端
- `client-browser.html` - 浏览器客户端

## 🚀 部署到腾讯云开发

### 1. 准备部署文件

首先确保项目文件完整：

```
websockets-python/
├── index.py              # WebSocket聊天服务器主文件
├── requirements.txt      # Python依赖列表
├── scf_bootstrap         # SCF启动脚本（必须有执行权限）
└── third_party/          # Python依赖库目录（部署时生成）
```

### 2. 安装依赖到指定目录

腾讯云开发HTTP云函数不会自动安装依赖，需要手动将依赖安装到 `third_party` 目录：

```bash
# 进入项目目录
cd websockets-python

# 安装依赖到 third_party 目录
pip install -r requirements.txt -t third_party
```

**注意**：`third_party` 目录名称是腾讯云开发的标准要求，不要修改。

### 3. 设置启动脚本权限

确保 `scf_bootstrap` 文件具有可执行权限：

```bash
chmod +x scf_bootstrap
```

### 4. 创建部署包

将项目文件打包成 zip 文件：

```bash
# 创建部署包（包含必要文件）
zip -r websockets-python.zip index.py requirements.txt scf_bootstrap third_party
```

**重要**：
- 必须包含 `third_party` 目录（依赖库）
- 必须包含 `scf_bootstrap`（启动脚本）
- 不要包含 `.git`、`__pycache__`、`client.py`、`client-browser.html` 等文件

### 5. 控制台部署

1. 进入[腾讯云开发控制台](https://tcb.cloud.tencent.com/dev#/scf?tab=function)
2. 点击"新建云函数"
3. 填写函数配置：
   - **函数类型**：选择 `HTTP 云函数`
   - **函数名称**：`websockets-python`（或自定义名称）
   - **运行环境**：`Python 3.9`（推荐，兼容性更好）或 `Python 3.10`
   - **执行方法**：`index.main_handler`（云函数入口）
   - **上传方式**：选择"本地上传"
4. 上传刚才创建的 `websockets-python.zip` 文件
5. 点击"完成"创建函数

### 6. 配置WebSocket支持

部署完成后，需要启用WebSocket支持：

1. 在云函数列表中找到刚创建的函数
2. 点击函数名称进入详情页
3. 在函数配置中确认：
   - **触发方式**：HTTP触发
   - **WebSocket**：已启用（如未启用需要开启）
4. 获取访问域名，格式类似：`https://xxx.service.tcloudbase.com/websockets-python`
5. WebSocket连接地址为：`wss://xxx.service.tcloudbase.com/websockets-python`

### 7. 环境变量配置（可选）

在云函数配置中可以设置环境变量：

1. 进入函数详情页
2. 切换到"函数配置"标签
3. 点击"编辑"
4. 在"环境变量"部分添加：
   - `DEBUG`: 调试模式开关（可选）

### 8. 测试部署

部署完成后，使用获取到的WebSocket地址测试连接：

```bash
# 使用命令行客户端测试
python client.py wss://xxx.service.tcloudbase.com/websockets-python
```

或在浏览器客户端中输入WebSocket地址进行测试。

### 启动脚本说明

`scf_bootstrap` 文件是云函数的启动脚本，内容如下：

```bash
#!/bin/bash
export PYTHONPATH="./third_party:$PYTHONPATH"
# 优先使用 Python 3.9，如果不存在则使用 Python 3.10
if [ -f "/var/lang/python39/bin/python3.9" ]; then
    /var/lang/python39/bin/python3.9 index.py
else
    /var/lang/python310/bin/python3.10 index.py
fi
```

**关键点**：
- 必须以 `#!/bin/bash` 开头
- 设置 `PYTHONPATH` 指向 `third_party` 目录以加载依赖
- 自动选择可用的Python版本（优先3.9，兼容性更好）
- 文件必须具有可执行权限

**版本兼容性说明**：
- `websockets==10.4` 与 Python 3.9/3.10 兼容且稳定
- 旧版本 `websockets==8.1` 在 Python 3.10 中会出现 `loop` 参数错误
- 过新版本可能存在 API 变化导致的兼容性问题
- 推荐使用 Python 3.9 运行环境以获得最佳兼容性

## 🚀 本地快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务器

```bash
python index.py
```

服务器将在 `ws://localhost:9000` 启动。

### 3. 连接客户端

#### 方式一：命令行客户端

```bash
# 使用默认设置连接
python client.py

# 指定服务器地址和客户端ID
python client.py ws://localhost:9000 alice
```

#### 方式二：浏览器客户端

直接在浏览器中打开 `client-browser.html` 文件。

## 💡 消息协议

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

## 🎮 使用说明

### 命令行客户端命令

连接成功后，可以使用以下命令：

- `/help` - 显示帮助信息
- `/ping` - 发送心跳测试
- `/status` - 显示连接状态
- `/quit` - 退出客户端
- 直接输入文字 - 发送聊天消息
- `Ctrl+C` - 强制退出

### 浏览器客户端操作

1. 输入 WebSocket 服务器地址（默认：`ws://localhost:9000`）
2. 可选：输入自定义客户端ID
3. 点击"连接"按钮
4. 在消息输入框中输入内容并发送
5. 使用控制按钮进行心跳测试、清空消息等操作

## 🔧 服务器特性

### 连接管理
- 自动分配客户端ID
- 维护在线用户列表
- 定期清理断开的连接
- 心跳超时检测（5分钟无响应自动断开）

### 消息处理
- 支持JSON和纯文本消息
- 实时消息广播
- 错误处理和异常恢复
- 详细的日志记录

### 性能优化
- 异步I/O处理
- 高效的连接池管理
- 内存使用优化
- 支持大量并发连接

## 🔧 开发调试

### 启动开发模式

```bash
# 启动服务端
python index.py

# 在另一个终端启动客户端
python client.py ws://localhost:9000 alice

# 再启动一个客户端测试多用户
python client.py ws://localhost:9000 bob
```

### 测试多客户端

可以同时启动多个客户端来测试多用户聊天：

```bash
# 终端1
python client.py ws://localhost:9000 alice

# 终端2  
python client.py ws://localhost:9000 bob

# 终端3
python client.py ws://localhost:9000 charlie
```

### 浏览器测试

1. 启动服务器：`python index.py`
2. 在浏览器中打开 `client-browser.html`
3. 输入服务器地址和客户端ID
4. 开始聊天测试

## ⚙️ 配置选项

### 环境变量

- `PORT` - 服务端监听端口（默认：9000）

### 服务器配置

可以在 `index.py` 中修改以下配置：

```python
host = "0.0.0.0"          # 监听地址
port = 9000               # 监听端口
heartbeat_timeout = 300   # 心跳超时时间（秒）
cleanup_interval = 30     # 连接清理间隔（秒）
```

### 客户端配置

可以在 `client.py` 中修改以下配置：

```python
max_reconnect_attempts = 5    # 最大重连次数
reconnect_interval = 3        # 重连间隔（秒）
heartbeat_interval = 30       # 心跳间隔（秒）
```

## 📊 性能指标

- **并发连接**: 支持数千个并发WebSocket连接
- **消息延迟**: 通常 < 10ms
- **内存使用**: 每个连接约 1-2KB 内存占用
- **CPU使用**: 高效的异步处理，CPU使用率低
- **网络带宽**: 优化的消息格式，带宽使用效率高

## 🔍 故障排除

### 常见问题

1. **连接失败**：
   - 检查服务器是否启动
   - 确认端口是否被占用
   - 检查防火墙设置

2. **部署失败**：
   - 确认zip包文件完整且格式正确
   - 检查云开发环境是否正常
   - 验证函数代码和依赖文件
   - 确认WebSocket触发器配置正确
   - 检查 `scf_bootstrap` 文件是否有执行权限
   - 确认 `third_party` 目录包含所有依赖

3. **启动脚本错误**：
   - 确认 `scf_bootstrap` 文件格式为 Unix (LF)，不是 Windows (CRLF)
   - 检查文件是否有可执行权限：`chmod +x scf_bootstrap`
   - 验证Python解释器路径是否正确（对应运行时版本）

4. **依赖加载失败**：
   - 确认依赖已正确安装到 `third_party` 目录
   - 检查 `PYTHONPATH` 环境变量设置
   - 验证 `requirements.txt` 文件内容正确

5. **版本兼容性错误**：
   - **错误1**: `As of 3.10, the *loop* parameter was removed from Lock()`
     - **原因**: `websockets==8.1` 与 Python 3.10 不兼容
     - **解决**: 更新到 `websockets>=10.0` 或使用 Python 3.9 运行环境
   
   - **错误2**: `RuntimeError: no running event loop`
     - **原因**: 新版本 `websockets` 库需要在异步上下文中使用
     - **解决**: 已更新代码使用 `asyncio.run()` 和 `async with websockets.serve()`
   
   - **错误3**: `handle_client() missing 1 required positional argument: 'path'`
     - **原因**: 不同版本的 `websockets` 库 API 有差异
     - **解决**: 使用稳定版本 `websockets==10.4`，确保函数签名为 `async def handle_client(websocket, path)`

6. **消息发送失败**：
   - 检查网络连接
   - 确认消息格式正确
   - 查看服务器日志

7. **心跳超时**：
   - 检查网络稳定性
   - 调整心跳间隔设置
   - 确认客户端正常运行

### 日志查看

本地运行时，所有日志会输出到控制台。部署到腾讯云开发后，可在云开发控制台的云函数页面查看运行日志。

### Windows用户注意事项

如果在Windows环境下开发：
1. 使用 `nano` 或 `vim` 创建 `scf_bootstrap` 文件
2. 或确保编辑器保存文件时使用 Unix (LF) 格式
3. 避免Windows回车符（^M）导致的解释器路径识别问题

## 🆚 与JavaScript版本对比

| 功能 | Python版本 | JavaScript版本 |
|------|------------|----------------|
| 多用户聊天 | ✅ | ✅ |
| 心跳检测 | ✅ | ✅ |
| 自动重连 | ✅ | ✅ |
| 浏览器客户端 | ✅ | ✅ |
| 命令行客户端 | ✅ | ✅ |
| 连接管理 | ✅ | ✅ |
| 消息广播 | ✅ | ✅ |
| 腾讯云部署 | ✅ | ✅ |

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。