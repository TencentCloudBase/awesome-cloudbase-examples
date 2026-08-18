# Laravel HelloWorld 云函数示例

这是一个简洁的 Laravel HelloWorld 示例，专为腾讯云函数环境优化，展示如何在云函数中运行 Laravel 应用。

## 🚀 快速开始

### 一键部署到腾讯云开发

1. **准备部署包**
   
   ```bash
   # 1. 安装依赖
   composer install --no-dev --optimize-autoloader
   
   # 2. 清理缓存和临时文件
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   
   # 3. 创建部署包（排除不必要的文件）
   zip -r laravel-helloworld-final.zip . \
     -x "*.git*" \
     -x "node_modules/*" \
     -x "tests/*" \
     -x "storage/logs/*" \
     -x "storage/framework/cache/*" \
     -x "storage/framework/sessions/*" \
     -x "storage/framework/views/*" \
     -x ".env" \
     -x "*.log" \
     -x "*.md" \
     -x "composer.lock"
   
   # 4. 验证包大小（应该在10MB以内）
   ls -lh laravel-helloworld-final.zip
   ```

2. **登录云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择或创建云开发环境

3. **创建HTTP云函数**
   - 函数名：`laravel-helloworld`
   - 运行环境：`PHP 7.4`
   - 上传：`laravel-helloworld-final.zip`
   - 执行方法：`scf_bootstrap`

4. **设置环境变量**
   ```
   SERVERLESS=1
   APP_ENV=production
   APP_DEBUG=false
   ```

5. **访问测试**
   ```bash
   curl https://your-env-id.service.tcloudbase.com/laravel-helloworld/
   ```

### 预期响应
```json
{
  "message": "Hello World!",
  "framework": "Laravel",
  "version": "8.83.29",
  "php_version": "7.4.33",
  "timestamp": "2026-02-05T06:06:09.557076Z",
  "environment": "production"
}
```

## 🚀 功能特性

- ✅ **简洁的HelloWorld实现** - 最小化的Laravel应用
- ✅ **云函数环境优化** - 针对腾讯云函数SCF环境优化
- ✅ **JSON响应保证** - 所有响应均为JSON格式，无HTML错误页面
- ✅ **PHP 7.4兼容** - 完全兼容云函数PHP 7.4运行环境
- ✅ **多层错误处理** - 从PHP底层到Laravel应用层的全方位JSON响应保护

## 📋 API端点

### Web路由
- `GET /` - HelloWorld主页
- `GET /hello/{name?}` - 个性化问候
- `GET /info` - 系统信息

### API路由
- `GET /api/hello` - API版本的HelloWorld
- `GET /api/hello/{name}` - API个性化问候
- `GET /api/info` - API系统信息
- `GET /api/health` - 健康检查

## 🎯 示例响应

### HelloWorld主页 (/)
```json
{
  "message": "Hello World!",
  "framework": "Laravel",
  "version": "8.83.29",
  "php_version": "7.4.33",
  "timestamp": "2026-02-05T06:06:09.557076Z",
  "environment": "production"
}
```

### 个性化问候 (/hello/张三)
```json
{
  "message": "Hello, 张三!",
  "greeting": "欢迎使用 Laravel 云函数",
  "timestamp": "2026-02-05T06:06:09.730338Z"
}
```

### 系统信息 (/info)
```json
{
  "application": {
    "name": "Laravel HelloWorld",
    "framework": "Laravel",
    "version": "8.83.29",
    "environment": "production",
    "timezone": "UTC",
    "locale": "en"
  },
  "system": {
    "php_version": "7.4.33",
    "memory_usage": "6 MB",
    "memory_peak": "6 MB"
  },
  "timestamp": "2026-02-05T06:06:09.730338Z"
}
```

## 🛠️ 部署说明

### 腾讯云开发控制台部署

#### 1. 准备部署包

1. **安装生产依赖**
   ```bash
   # 安装生产环境依赖，排除开发依赖
   composer install --no-dev --optimize-autoloader
   ```

2. **清理Laravel缓存**
   ```bash
   # 清理所有缓存文件
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   ```

3. **创建部署包**
   ```bash
   # 打包项目文件，排除不必要的文件和目录
   zip -r laravel-helloworld-final.zip . \
     -x "*.git*" \
     -x "node_modules/*" \
     -x "tests/*" \
     -x "storage/logs/*.log" \
     -x "storage/framework/cache/data/*" \
     -x "storage/framework/sessions/*" \
     -x "storage/framework/views/*" \
     -x ".env" \
     -x ".env.example" \
     -x "*.log" \
     -x "README.md" \
     -x "composer.lock" \
     -x ".gitignore" \
     -x "phpunit.xml"
   ```

4. **验证部署包**
   ```bash
   # 检查包大小（建议小于10MB）
   ls -lh laravel-helloworld-final.zip
   
   # 检查包内容
   unzip -l laravel-helloworld-final.zip | head -20
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
   - 函数名称：`laravel-helloworld`
   - 运行环境：选择 `PHP 7.4`
   - 函数类型：选择 `HTTP函数`

3. **上传代码**
   - 创建方式：选择"本地上传zip包"
   - 上传 `laravel-helloworld-final.zip` 文件
   - 执行方法：`scf_bootstrap`

4. **配置环境变量**
   ```bash
   SERVERLESS=1
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:your-app-key-here
   ```

5. **高级配置**
   - 内存：128MB（推荐）或 256MB
   - 超时时间：30秒
   - 初始化超时时间：30秒

#### 📦 打包注意事项

**必须包含的文件：**
- `scf_bootstrap` - 云函数启动脚本
- `public/index.php` - Laravel入口文件
- `vendor/` - Composer依赖包
- `app/` - 应用核心代码
- `config/` - 配置文件
- `routes/` - 路由文件

**必须排除的文件：**
- `.git/` - Git版本控制文件
- `node_modules/` - Node.js依赖
- `tests/` - 测试文件
- `storage/logs/*.log` - 日志文件
- `storage/framework/cache/` - 缓存文件
- `.env` - 环境配置文件（包含敏感信息）

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
   - 格式类似：`https://your-env-id.service.tcloudbase.com/laravel-helloworld`

3. **测试接口**
   ```bash
   # HelloWorld主页
   curl https://your-env-id.service.tcloudbase.com/laravel-helloworld/
   
   # 个性化问候
   curl https://your-env-id.service.tcloudbase.com/laravel-helloworld/hello/张三
   
   # 系统信息
   curl https://your-env-id.service.tcloudbase.com/laravel-helloworld/info
   
   # API健康检查
   curl https://your-env-id.service.tcloudbase.com/laravel-helloworld/api/health
   ```

#### 5. 自定义域名（可选）
1. **配置自定义域名**
   - 在云开发控制台选择"HTTP访问服务"
   - 点击"新增域名"
   - 输入您的域名并完成备案验证
   - 配置路径映射：`/laravel` -> `laravel-helloworld`

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

3. **PHP语法错误**
   ```
   问题：函数执行时出现PHP语法错误
   解决：确保代码兼容PHP 7.4，检查是否使用了PHP 8.x特有语法
   ```

4. **内存不足**
   ```
   问题：函数执行时内存溢出
   解决：增加函数内存配置到256MB或512MB
   ```

5. **超时错误**
   ```
   问题：函数执行超时
   解决：增加超时时间到60秒，优化代码性能
   ```

6. **环境变量未生效**
   ```
   问题：SERVERLESS环境变量未生效，仍返回HTML错误
   解决：在云开发控制台重新设置环境变量，确保SERVERLESS=1
   ```

#### 调试技巧

1. **查看实时日志**
   ```bash
   # 在云开发控制台 -> 云函数 -> 函数详情 -> 日志查询
   # 或使用CLI工具
   tcb fn log laravel-helloworld --limit 100
   ```

2. **本地测试**
   ```bash
   # 使用Docker模拟云函数环境
   docker run --rm -v "$(pwd)":/app -w /app -p 9000:9000 php:7.4-cli bash -c "
   export SERVERLESS=1
   php -S 0.0.0.0:9000 -t public/
   "
   ```

3. **启用调试模式**
   ```bash
   # 临时启用调试查看详细错误
   APP_DEBUG=true
   ```

#### 部署检查清单

- [ ] 确认使用PHP 7.4运行环境
- [ ] 检查scf_bootstrap文件存在且有执行权限
- [ ] 验证环境变量SERVERLESS=1已设置
- [ ] 确认zip包大小在限制范围内
- [ ] 测试所有API端点返回JSON格式
- [ ] 检查函数日志无错误信息
- [ ] 验证自定义域名解析正确（如果使用）

## 🔧 技术实现

### 核心组件
- **HelloWorldController** - 主要业务逻辑控制器
- **ForceJsonResponse中间件** - 强制JSON响应
- **异常处理器** - 多层次JSON错误响应
- **路由配置** - 简洁的路由定义

### 云函数优化
1. **启动优化** - 移除不必要的中间件和配置
2. **内存优化** - 精简依赖和组件
3. **响应优化** - 强制JSON格式响应
4. **错误处理** - 多层次错误捕获和JSON化

### PHP版本兼容性
- **兼容PHP 7.4** - 使用`strpos()`替代`str_contains()`
- **语法检查** - 通过Docker PHP 7.4环境验证
- **依赖管理** - 仅保留必要的Composer包

## 📁 项目结构

```
laravel-helloworld/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php
│   │   │   └── HelloWorldController.php
│   │   ├── Middleware/
│   │   │   ├── ForceJsonResponse.php
│   │   │   ├── PreventRequestsDuringMaintenance.php
│   │   │   ├── TrimStrings.php
│   │   │   └── TrustProxies.php
│   │   └── Kernel.php
│   ├── Exceptions/
│   │   └── Handler.php
│   └── Providers/
│       ├── AppServiceProvider.php
│       ├── AuthServiceProvider.php
│       ├── EventServiceProvider.php
│       └── RouteServiceProvider.php
├── config/
│   ├── app.php
│   ├── cache.php
│   ├── database.php
│   └── logging.php
├── routes/
│   ├── api.php
│   └── web.php
├── public/
│   └── index.php
├── scf_bootstrap
└── server.php
```

## 🧪 测试验证

### 本地测试
```bash
# 使用PHP 7.4 Docker环境测试
   docker run --rm -v "$(pwd)":/app -w /app -p 9000:9000 php:7.4-cli bash -c "
   export SERVERLESS=1
   php -S 0.0.0.0:9000 -t public/
   "
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

## 🎉 总结

这个Laravel HelloWorld示例展示了如何创建一个最小化但功能完整的Laravel应用，专为云函数环境优化。通过精心的配置和优化，确保应用在腾讯云函数环境中稳定运行，并始终返回JSON格式的响应。

适合作为：
- Laravel云函数开发的起点
- 微服务架构的基础模板  
- API服务的快速原型
- 云函数最佳实践的参考

## 📚 快速参考

### 部署方式对比

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| 运行环境 | PHP 7.4 | 兼容版本 |
| 内存 | 128MB | 基础配置 |
| 超时 | 30秒 | 响应超时 |
| 执行方法 | scf_bootstrap | 启动脚本 |

### 关键配置参数

```bash
# 必需环境变量
SERVERLESS=1              # 启用云函数模式
APP_ENV=production        # 生产环境
APP_DEBUG=false          # 关闭调试模式
```

### 常用命令

```bash
# 本地测试
SERVERLESS=1 php artisan serve --port=9000

# 查看路由
php artisan route:list

# 清除缓存
php artisan cache:clear
php artisan config:clear

# 检查语法（PHP 7.4）
docker run --rm -v "$(pwd)":/app php:7.4-cli php -l /app/public/index.php
```

### 技术支持

- **文档**: [腾讯云开发文档](https://cloud.tencent.com/document/product/876)
- **社区**: [腾讯云开发者社区](https://cloud.tencent.com/developer)
- **GitHub**: [项目仓库](https://github.com/TencentCloudBase/awesome-cloudbase-examples)
- **问题反馈**: 提交Issue到项目仓库

---

**开发者**: Laravel + 腾讯云函数团队  
**更新时间**: 2026年2月5日  
**版本**: 1.0.0