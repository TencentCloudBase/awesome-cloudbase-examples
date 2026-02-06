# Koa HelloWorld 云函数示例

这是一个简洁的 Koa HelloWorld 示例，专为腾讯云开发环境优化，展示如何在云函数中运行 Koa 应用。

## 🚀 快速开始

### 一键部署到腾讯云开发

1. **准备部署包**
   
   ```bash
   # 1. 安装依赖
   npm install --production
   
   # 2. 创建部署包（排除不必要的文件）
   zip -r koa-helloworld.zip . \
     -x "node_modules/.cache/*" \
     -x "*.log" \
     -x ".git/*" \
     -x ".env*" \
     -x "*.md" \
     -x ".vscode/*" \
     -x ".idea/*"
   
   # 3. 验证包大小（应该在10MB以内）
   ls -lh koa-helloworld.zip
   ```

2. **登录云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择或创建云开发环境

3. **创建HTTP云函数**
   - 函数名：`koa-helloworld`
   - 运行环境：`Node.js 18.x`
   - 上传：`koa-helloworld.zip`
   - 执行方法：`scf_bootstrap`
   - **重要**：开启"自动安装依赖"选项

4. **设置环境变量**
   ```
   SERVERLESS=1
   NODE_ENV=production
   PORT=9000
   ```

5. **访问测试**
   ```bash
   curl https://your-env-id.service.tcloudbase.com/koa-helloworld/
   ```

### 预期响应
```json
{
  "message": "Hello World!",
  "framework": "Koa",
  "version": "1.0.0",
  "node_version": "v18.19.0",
  "timestamp": "2026-02-05T06:06:09.557076Z",
  "environment": "production"
}
```

## 🚀 功能特性

- ✅ **简洁的HelloWorld实现** - 最小化的Koa应用
- ✅ **云函数环境优化** - 针对腾讯云函数环境优化
- ✅ **JSON响应保证** - 所有响应均为JSON格式
- ✅ **Node.js 18.x兼容** - 完全兼容云函数Node.js 18.x运行环境
- ✅ **多层错误处理** - 全方位JSON响应保护
- ✅ **CORS支持** - 跨域请求支持

## 📋 API端点

### Web路由
- `GET /` - HelloWorld主页
- `GET /hello/{name?}` - 个性化问候
- `GET /info` - 系统信息

### API路由
- `GET /api/hello/{name?}` - API个性化问候
- `GET /api/info` - API系统信息
- `GET /api/health` - 健康检查

## 🎯 示例响应

### HelloWorld主页 (/)
```json
{
  "message": "Hello World!",
  "framework": "Koa",
  "version": "1.0.0",
  "node_version": "v18.19.0",
  "timestamp": "2026-02-05T06:06:09.557076Z",
  "environment": "production"
}
```

### 个性化问候 (/hello/张三)
```json
{
  "message": "Hello, 张三!",
  "greeting": "欢迎使用 Koa 云函数",
  "timestamp": "2026-02-05T06:06:09.730338Z"
}
```

### 系统信息 (/info)
```json
{
  "application": {
    "name": "Koa HelloWorld",
    "framework": "Koa",
    "version": "1.0.0",
    "environment": "production",
    "timezone": "Asia/Shanghai",
    "locale": "zh-CN"
  },
  "system": {
    "node_version": "v18.19.0",
    "platform": "linux",
    "arch": "x64",
    "memory_usage": "25 MB",
    "memory_heap_used": "15 MB",
    "memory_heap_total": "20 MB",
    "uptime": "120 seconds"
  },
  "timestamp": "2026-02-05T06:06:09.730338Z"
}
```

## 🛠️ 部署说明

### 腾讯云开发控制台部署

#### 1. 准备部署包

1. **安装生产依赖**
   ```bash
   # 安装生产环境依赖
   npm install --production
   ```

2. **创建部署包**
   ```bash
   # 打包项目文件，排除不必要的文件和目录
   zip -r koa-helloworld.zip . \
     -x "node_modules/.cache/*" \
     -x "*.log" \
     -x ".git/*" \
     -x ".env*" \
     -x "README.md" \
     -x ".vscode/*" \
     -x ".idea/*" \
     -x "*.swp" \
     -x "*.swo" \
     -x ".DS_Store"
   ```

3. **验证部署包**
   ```bash
   # 检查包大小（建议小于50MB）
   ls -lh koa-helloworld.zip
   
   # 检查包内容
   unzip -l koa-helloworld.zip | head -20
   ```

#### 2. 云开发控制台配置

1. **登录控制台**
- 注册并登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
- 创建云开发环境（如果还没有）

#### 3. 创建 HTTP 云函数
1. **进入云开发控制台**
   - 登录腾讯云开发控制台
   - 选择您的云开发环境
   - 点击左侧菜单"云函数"

2. **新建云函数**
   - 点击"新建云函数"
   - 函数名称：`koa-helloworld`
   - 运行环境：选择 `Node.js 18.x`
   - 函数类型：选择 `HTTP函数`

3. **上传代码**
   - 创建方式：选择"本地上传zip包"
   - 上传 `koa-helloworld.zip` 文件
   - 执行方法：`scf_bootstrap`
   - **重要**：开启"自动安装依赖"选项

4. **配置环境变量**
   ```bash
   SERVERLESS=1
   NODE_ENV=production
   PORT=9000
   ```

5. **高级配置**
   - 内存：128MB（推荐）或 256MB
   - 超时时间：30秒
   - 初始化超时时间：30秒

#### 📦 打包注意事项

**必须包含的文件：**
- `scf_bootstrap` - 云函数启动脚本
- `app.js` - Koa应用主文件
- `package.json` - 项目配置文件
- `node_modules/` - 依赖包（如果不开启自动安装依赖）

**必须排除的文件：**
- `.git/` - Git版本控制文件
- `node_modules/.cache/` - npm缓存文件
- `*.log` - 日志文件
- `.env*` - 环境配置文件（包含敏感信息）
- `.vscode/`, `.idea/` - IDE配置文件

**包大小限制：**
- 压缩包：≤ 50MB
- 解压后：≤ 250MB
- 推荐：< 10MB（更快的冷启动）

6. **网络配置**
   - 公网访问：开启
   - 内网访问：根据需要选择

#### 4. 部署和测试
1. **完成创建**
   - 点击"完成"按钮创建函数
   - 等待部署完成（通常需要1-2分钟）

2. **获取访问地址**
   - 部署成功后，在函数详情页面找到"访问路径"
   - 复制 HTTP 触发器的访问地址
   - 格式类似：`https://your-env-id.service.tcloudbase.com/koa-helloworld`

3. **测试接口**
   ```bash
   # HelloWorld主页
   curl https://your-env-id.service.tcloudbase.com/koa-helloworld/
   
   # 个性化问候
   curl https://your-env-id.service.tcloudbase.com/koa-helloworld/hello/张三
   
   # 系统信息
   curl https://your-env-id.service.tcloudbase.com/koa-helloworld/info
   
   # API健康检查
   curl https://your-env-id.service.tcloudbase.com/koa-helloworld/api/health
   ```

#### 5. 自定义域名（可选）
1. **配置自定义域名**
   - 在云开发控制台选择"HTTP访问服务"
   - 点击"新增域名"
   - 输入您的域名并完成备案验证
   - 配置路径映射：`/koa` -> `koa-helloworld`

2. **SSL证书配置**
   - 上传SSL证书或使用免费证书
   - 开启HTTPS访问

#### 监控和日志
- **实时日志**: 在云开发控制台查看函数执行日志
- **监控指标**: 查看调用次数、错误率、响应时间等
- **告警配置**: 设置异常告警通知

#### 性能优化
- **预置并发**: 对于高频访问，可配置预置并发减少冷启动
- **内存调优**: 根据实际使用情况调整内存配置
- **缓存策略**: 利用云开发数据库或Redis进行数据缓存

### 🚨 部署故障排除

#### 常见问题及解决方案

1. **函数创建失败**
   ```
   问题：上传zip包后创建函数失败
   解决：检查zip包大小是否超过50MB，确保包含scf_bootstrap文件
   ```

2. **502 Bad Gateway错误**
   ```
   问题：访问函数时返回502错误
   解决：检查scf_bootstrap文件权限，确保有执行权限
   命令：chmod +x scf_bootstrap
   ```

3. **依赖安装失败**
   ```
   问题：自动安装依赖失败
   解决：检查package.json格式，或手动安装依赖后打包上传
   ```

4. **端口监听错误**
   ```
   问题：应用无法启动，端口监听失败
   解决：确保应用监听9000端口，检查PORT环境变量设置
   ```

5. **内存不足**
   ```
   问题：函数执行时内存溢出
   解决：增加函数内存配置到256MB或512MB
   ```

#### 调试技巧

1. **查看实时日志**
   ```bash
   # 在云开发控制台 -> 云函数 -> 函数详情 -> 日志查询
   ```

2. **本地测试**
   ```bash
   # 使用Node.js 18环境测试
   export SERVERLESS=1
   export PORT=9000
   npm start
   ```

3. **启用调试模式**
   ```bash
   # 临时启用调试查看详细错误
   NODE_ENV=development
   ```

#### 部署检查清单

- [ ] 确认使用Node.js 18.x运行环境
- [ ] 检查scf_bootstrap文件存在且有执行权限
- [ ] 验证环境变量SERVERLESS=1已设置
- [ ] 确认zip包大小在限制范围内
- [ ] 测试所有API端点返回JSON格式
- [ ] 检查函数日志无错误信息
- [ ] 验证自定义域名解析正确（如果使用）

## 🔧 技术实现

### 核心组件
- **Koa应用** - 轻量级Node.js框架
- **Koa Router** - 路由管理
- **错误处理中间件** - 统一JSON错误响应
- **CORS中间件** - 跨域支持

### 云函数优化
1. **启动优化** - 条件性加载中间件
2. **内存优化** - 精简依赖和组件
3. **响应优化** - 统一JSON格式响应
4. **错误处理** - 全局错误捕获和JSON化

### Node.js版本兼容性
- **兼容Node.js 18.x** - 使用现代JavaScript特性
- **依赖管理** - 仅保留必要的npm包
- **性能优化** - 利用Node.js 18的性能改进

## 📁 项目结构

```
koa-helloworld/
├── app.js              # Koa应用主文件
├── package.json        # 项目配置和依赖
├── scf_bootstrap       # 云函数启动脚本
├── .gitignore         # Git忽略规则
└── README.md          # 项目文档
```

## 🧪 测试验证

### 本地测试
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或直接启动
SERVERLESS=1 PORT=9000 npm start
```

### 功能测试
```bash
# HelloWorld主页
curl http://localhost:9000/

# 个性化问候
curl http://localhost:9000/hello/张三

# 系统信息
curl http://localhost:9000/info

# API健康检查
curl http://localhost:9000/api/health
```

## 📦 部署包信息

- **文件名**: `koa-helloworld.zip`
- **大小**: ~2-5MB（取决于依赖）
- **Node.js版本**: 18.x兼容
- **Koa版本**: 2.14.2
- **状态**: ✅ 生产就绪

## 🎉 总结

这个Koa HelloWorld示例展示了如何创建一个最小化但功能完整的Koa应用，专为云函数环境优化。通过精心的配置和优化，确保应用在腾讯云函数环境中稳定运行，并始终返回JSON格式的响应。

适合作为：
- Koa云函数开发的起点
- 微服务架构的基础模板  
- API服务的快速原型
- 云函数最佳实践的参考

## 📚 快速参考

### 部署方式对比

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| 运行环境 | Node.js 18.x | 最新LTS版本 |
| 内存 | 128MB | 基础配置 |
| 超时 | 30秒 | 响应超时 |
| 执行方法 | scf_bootstrap | 启动脚本 |

### 关键配置参数

```bash
# 必需环境变量
SERVERLESS=1              # 启用云函数模式
NODE_ENV=production       # 生产环境
PORT=9000                # 监听端口
```

### 常用命令

```bash
# 本地测试
SERVERLESS=1 PORT=9000 npm start

# 安装依赖
npm install --production

# 创建部署包
zip -r koa-helloworld.zip . -x "node_modules/.cache/*" "*.log" ".git/*"

# 检查语法
node -c app.js
```

### 技术支持

- **文档**: [腾讯云开发文档](https://cloud.tencent.com/document/product/876)
- **社区**: [腾讯云开发者社区](https://cloud.tencent.com/developer)
- **GitHub**: [项目仓库](https://github.com/TencentCloudBase/awesome-cloudbase-examples)
- **问题反馈**: 提交Issue到项目仓库