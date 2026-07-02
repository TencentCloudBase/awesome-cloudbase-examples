# SCF Golang HelloWorld Example

This is an SCF (Serverless Cloud Function) Golang HelloWorld example written following the official Tencent Cloud documentation conventions.

## 📁 Project Structure

```text
scf-go-helloworld/
├── main.go                    # Main function source code
├── go.mod                     # Go module file
├── build.sh                   # Build script
└── README.md                  # Documentation
```

## 🚀 Quick Start

### 1. Prerequisites

Make sure the following are installed in your development environment:

- **Go 1.18+**
- **Git**

### 2. Install Dependencies and Build

```bash
# Enter the project directory
cd scf-go-helloworld

# Use the build script (recommended)
./build.sh

# Or build manually
go mod tidy
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go
zip -r scf-go-helloworld.zip main
```

After a successful build, you will get:

- `main` — the executable binary
- `scf-go-helloworld.zip` — the deployment package

### 3. Deploy to Tencent CloudBase SCF

#### Option 1: Deploy via the Console

1. Sign in to the [Tencent CloudBase Console](https://console.cloud.tencent.com/tcb).
2. Select your CloudBase environment.
3. Open the "Cloud Functions" page.
4. Click "Create cloud function".
5. Choose "Custom create".
6. Pick "Go1" as the runtime.
7. Upload the `scf-go-helloworld.zip` deployment package.
8. Set the handler entry point to `main`.
9. Configure triggers (optional).
10. Deploy and test.

#### Option 2: Deploy via CloudBase CLI

```bash
# Install the CloudBase CLI
npm install -g @cloudbase/cli

# Sign in
tcb login

# Deploy the cloud function
tcb functions:deploy golang-hello --runtime Go1 --zip ./scf-go-helloworld.zip
```

## 💡 Function Reference

### Available Handler Variants

The code provides multiple handler variants. You can switch between them by changing the `cloudfunction.Start()` call inside `main()`:

#### 1. `hello` — Standard Variant (default)

**Signature:** `func hello(ctx context.Context, event Event) (Response, error)`

**Input event format:**

```json
{
  "name": "CloudBase",
  "message": "Hello"
}
```

**Response:**

```json
{
  "message": "Hello, CloudBase!",
  "timestamp": "2024-01-01 12:00:00",
  "requestId": "12345678-1234-1234-1234-123456789012"
}
```

#### 2. `helloSimple` — Simple Variant

**Signature:** `func helloSimple(name string) (string, error)`

**Input:** a single string, for example `"Alice"`.

**Response:** `"Hello, Alice!"`

#### 3. `helloNoParams` — No-parameter Variant

**Signature:** `func helloNoParams() (string, error)`

**Input:** no parameters required.

**Response:** `"Hello World!"`

#### 4. `helloContextOnly` — Context-only Variant

**Signature:** `func helloContextOnly(ctx context.Context) (string, error)`

**Input:** any payload (information is read from the context).

**Response:** a string that includes the request ID.

### Switching Between Variants

Edit the `main()` function in `main.go`:

```go
func main() {
    // Pick the variant you want to use
    cloudfunction.Start(hello)             // Standard variant
    // cloudfunction.Start(helloSimple)    // Simple variant
    // cloudfunction.Start(helloNoParams)  // No-parameter variant
    // cloudfunction.Start(helloContextOnly) // Context-only variant
}
```

## 🎮 Test Examples

### Test from the CloudBase Console

1. **Test the standard variant (`hello`)**

   ```json
   {
     "name": "CloudBase",
     "message": "Hello"
   }
   ```

2. **Test the simple variant (`helloSimple`)**

   ```text
   "Tencent Cloud"
   ```

3. **Test the no-parameter variant (`helloNoParams`)**

   ```json
   {}
   ```

### HTTP Access Tests

If HTTP access is enabled for the function:

```bash
# GET request
curl "https://your-env-id.service.tcloudbase.com/golang-hello"

# POST request
curl -X POST "https://your-env-id.service.tcloudbase.com/golang-hello" \
  -H "Content-Type: application/json" \
  -d '{"name": "CloudBase", "message": "Hello"}'
```

## 🔧 Development Conventions

### Required Conventions

1. **Package declaration**

   ```go
   package main  // Must be "main"
   ```

2. **Library import**

   ```go
   import "github.com/tencentyun/scf-go-lib/cloudfunction"
   ```

3. **Main function**

   ```go
   func main() {
       cloudfunction.Start(yourHandler)
   }
   ```

4. **Handler configuration**
   - Set the handler in the console to `main`.
   - The root of the uploaded ZIP package must contain the `main` binary.

### Handler Function Conventions

**Supported parameter combinations:**

- `()` — no parameters
- `(event)` — event only
- `(context)` — context only
- `(context, event)` — standard combination

**Supported return-value combinations:**

- `()` — no return value
- `(ret)` — return value only
- `(error)` — error only
- `(ret, error)` — standard combination

**Data type requirements:**

- `event` and the return value must be serializable with `encoding/json`.
- Custom structs need JSON tags.

## 🛠️ Local Development

### Build and Test

```bash
# Local build (no cross-compilation)
go build -o main-local main.go

# Run locally for testing
./main-local

# Cross-compile for deployment
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go
```

### Dependency Management

```bash
# Initialize the module
go mod init scf-go-helloworld

# Download dependencies
go mod tidy

# Inspect the dependency graph
go mod graph
```

## 🌐 CloudBase Integration

### Using the CloudBase Database

```go
// Example: integrate the CloudBase database
import (
    "github.com/tencentyun/tcb-go-sdk/tcb"
)

func handleWithDB(ctx context.Context, event Event) (Response, error) {
    // Initialize CloudBase
    app, err := tcb.Init(&tcb.Config{
        SecretID:  "your-secret-id",
        SecretKey: "your-secret-key",
        EnvID:     "your-env-id",
    })
    if err != nil {
        return Response{}, err
    }

    // Use the database
    db := app.Database()
    // ... database operations

    return Response{Message: "Success"}, nil
}
```

### Environment Variables

Set environment variables in the cloud function configuration:

```bash
TCB_ENV_ID=your-env-id
SECRET_ID=your-secret-id
SECRET_KEY=your-secret-key
```

## 📚 References

- [Tencent Cloud SCF Golang Development Guide](https://cloud.tencent.com/document/product/583/67384)
- [SCF Go Event Library](https://github.com/tencentyun/scf-go-lib)
- [CloudBase Go SDK](https://github.com/tencentyun/tcb-go-sdk)
- [CloudBase Documentation](https://cloud.tencent.com/document/product/876)

## 🔍 Troubleshooting

### Common Issues

1. **Build failures**

   ```bash
   # Check the Go version
   go version

   # Clean the module cache
   go clean -modcache
   go mod tidy
   ```

2. **Deployment failures**
   - Make sure the root of the ZIP package contains the `main` binary.
   - Check file permissions: `chmod +x main`.
   - Confirm the binary is built for Linux: `GOOS=linux GOARCH=amd64`.

3. **Runtime errors**
   - Inspect the cloud function logs.
   - Verify that dependencies are correct.
   - Validate JSON serialization.

### Debugging Tips

```go
// Add verbose logging
fmt.Printf("Debug: event=%+v, ctx=%+v\n", event, ctx)

// Error handling
if err != nil {
    fmt.Printf("Error: %v\n", err)
    return Response{}, fmt.Errorf("processing failed: %v", err)
}
```

## 📄 License

MIT License

---

**Start your Serverless Golang journey!** 🎉

<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录已提供 `cloudbaserc.json`：`runtime: Go1`、`handler: main`，部署前需要先在本机执行 `./build.sh` 编译 Linux x64 二进制 `main`（CloudBase 函数运行在 Linux/amd64）。

The folder ships `cloudbaserc.json` with `runtime: Go1` and `handler: main`. Build the Linux/amd64 binary `main` with `./build.sh` before deploying (CloudBase functions run on Linux/amd64).

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 编译产物（Linux/amd64）/ Build artifact (linux/amd64)
./build.sh

# 3. 部署 / Deploy
tcb fn deploy -e <YOUR_ENV_ID>

# 4. 调用测试 / Invoke for testing
tcb fn invoke scf-go-helloworld --params '{"name":"CloudBase","message":"Hello"}' -e <YOUR_ENV_ID>

# 5. 查看日志 / Tail logs
tcb fn log scf-go-helloworld -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.
