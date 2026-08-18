# SCF Golang HelloWorld 示例

这是一个按照腾讯云官方文档规范编写的 SCF（Serverless Cloud Function）Golang HelloWorld 示例。

## 📁 项目结构

```
scf-golang-helloworld/
├── main.go                    # 主函数代码
├── go.mod                     # Go 模块文件
├── build.sh                   # 构建脚本
└── README.md                  # 说明文档
```

## 🚀 快速开始

### 1. 环境准备

确保你的开发环境已安装：

- **Go 1.18+**
- **Git**

### 2. 下载依赖并编译

```bash
# 进入项目目录
cd scf-golang-helloworld

# 使用构建脚本（推荐）
./build.sh

# 或者手动编译
go mod tidy
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go
zip -r scf-golang-helloworld.zip main
```

编译成功后，会生成：
- `main` - 可执行二进制文件
- `scf-golang-helloworld.zip` - 部署包

### 3. 部署到腾讯云开发 SCF

#### 方式一：控制台部署

1. 登录 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的云开发环境
3. 进入 "云函数" 页面
4. 点击 "新建云函数"
5. 选择 "自定义创建"
6. 运行环境选择 "Go1"
7. 上传 `scf-golang-helloworld.zip` 部署包
8. 执行方法设置为 `main`
9. 配置触发器（可选）
10. 部署并测试

#### 方式二：云开发 CLI 部署

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb functions:deploy golang-hello --runtime Go1 --zip ./scf-golang-helloworld.zip
```

## 💡 函数说明

### 支持的函数版本

代码中提供了多个版本的处理函数，可以通过修改 `main()` 函数中的 `cloudfunction.Start()` 来切换：

#### 1. hello - 标准版本（默认）

**函数签名：** `func hello(ctx context.Context, event Event) (Response, error)`

**输入事件格式：**
```json
{
  "name": "云开发",
  "message": "你好"
}
```

**返回结果：**
```json
{
  "message": "你好, 云开发!",
  "timestamp": "2024-01-01 12:00:00",
  "requestId": "12345678-1234-1234-1234-123456789012"
}
```

#### 2. helloSimple - 简单版本

**函数签名：** `func helloSimple(name string) (string, error)`

**输入：** 直接传入字符串，如 `"张三"`

**返回：** `"Hello, 张三!"`

#### 3. helloNoParams - 无参数版本

**函数签名：** `func helloNoParams() (string, error)`

**输入：** 无需参数

**返回：** `"Hello World!"`

#### 4. helloContextOnly - 仅使用 Context

**函数签名：** `func helloContextOnly(ctx context.Context) (string, error)`

**输入：** 任意内容（通过 Context 获取信息）

**返回：** 包含请求ID的字符串

### 切换函数版本

在 `main.go` 中修改 `main()` 函数：

```go
func main() {
    // 使用不同的函数版本
    cloudfunction.Start(hello)          // 标准版本
    // cloudfunction.Start(helloSimple)    // 简单版本
    // cloudfunction.Start(helloNoParams)  // 无参数版本
    // cloudfunction.Start(helloContextOnly) // 仅Context版本
}
```

## 🎮 测试示例

### 在云开发控制台测试

1. **测试标准版本（hello）**
   ```json
   {
     "name": "云开发",
     "message": "Hello"
   }
   ```

2. **测试简单版本（helloSimple）**
   ```
   "腾讯云"
   ```

3. **测试无参数版本（helloNoParams）**
   ```json
   {}
   ```

### HTTP 访问测试

如果开启了 HTTP 访问服务：

```bash
# GET 请求
curl "https://your-env-id.service.tcloudbase.com/golang-hello"

# POST 请求
curl -X POST "https://your-env-id.service.tcloudbase.com/golang-hello" \
  -H "Content-Type: application/json" \
  -d '{"name": "云开发", "message": "Hello"}'
```

## 🔧 开发规范说明

### 必须遵循的规范

1. **Package 声明**
   ```go
   package main  // 必须使用 main
   ```

2. **依赖库引用**
   ```go
   import "github.com/tencentyun/scf-go-lib/cloudfunction"
   ```

3. **Main 函数**
   ```go
   func main() {
       cloudfunction.Start(yourHandler)
   }
   ```

4. **执行方法配置**
   - 在控制台设置执行方法为 `main`
   - 上传的 ZIP 包根目录必须包含 `main` 二进制文件

### 入口函数规范

**支持的参数组合：**
- `()` - 无参数
- `(event)` - 仅事件参数
- `(context)` - 仅上下文
- `(context, event)` - 标准组合

**支持的返回值组合：**
- `()` - 无返回值
- `(ret)` - 仅返回结果
- `(error)` - 仅返回错误
- `(ret, error)` - 标准组合

**数据类型要求：**
- `event` 和返回值必须支持 `encoding/json` 的序列化
- 自定义结构体需要添加 JSON 标签

## 🛠️ 本地开发

### 编译和测试

```bash
# 本地编译（不跨平台）
go build -o main-local main.go

# 本地运行测试
./main-local

# 跨平台编译（用于部署）
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go
```

### 依赖管理

```bash
# 初始化模块
go mod init scf-golang-helloworld

# 下载依赖
go mod tidy

# 查看依赖
go mod graph
```

## 🌐 云开发集成

### 使用云开发数据库

```go
// 示例：集成云开发数据库
import (
    "github.com/tencentyun/tcb-go-sdk/tcb"
)

func handleWithDB(ctx context.Context, event Event) (Response, error) {
    // 初始化云开发
    app, err := tcb.Init(&tcb.Config{
        SecretID:  "your-secret-id",
        SecretKey: "your-secret-key",
        EnvID:     "your-env-id",
    })
    if err != nil {
        return Response{}, err
    }
    
    // 使用数据库
    db := app.Database()
    // ... 数据库操作
    
    return Response{Message: "Success"}, nil
}
```

### 环境变量配置

在云函数配置中设置环境变量：

```bash
TCB_ENV_ID=your-env-id
SECRET_ID=your-secret-id
SECRET_KEY=your-secret-key
```

## 📚 参考文档

- [腾讯云 SCF Golang 开发指南](https://cloud.tencent.com/document/product/583/67384)
- [SCF Go 事件库](https://github.com/tencentyun/scf-go-lib)
- [云开发 Go SDK](https://github.com/tencentyun/tcb-go-sdk)
- [云开发文档](https://cloud.tencent.com/document/product/876)

## 🔍 故障排除

### 常见问题

1. **编译失败**
   ```bash
   # 检查 Go 版本
   go version
   
   # 清理模块缓存
   go clean -modcache
   go mod tidy
   ```

2. **部署失败**
   - 确保 ZIP 包根目录包含 `main` 二进制文件
   - 检查文件权限：`chmod +x main`
   - 确认是 Linux 平台编译：`GOOS=linux GOARCH=amd64`

3. **运行时错误**
   - 查看云函数日志
   - 检查依赖是否正确
   - 验证 JSON 序列化

### 调试技巧

```go
// 添加详细日志
fmt.Printf("Debug: event=%+v, ctx=%+v\n", event, ctx)

// 错误处理
if err != nil {
    fmt.Printf("Error: %v\n", err)
    return Response{}, fmt.Errorf("处理失败: %v", err)
}
```

## 📄 许可证

MIT License

---

**开始你的 Serverless Golang 之旅！** 🎉