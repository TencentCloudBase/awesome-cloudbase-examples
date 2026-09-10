# SCF Java HelloWorld Example

This is an SCF (Serverless Cloud Function) Java HelloWorld example written following the official Tencent Cloud documentation conventions.

## 📁 Project Structure

```text
scf-java-helloworld/
├── src/
│   └── main/
│       └── java/
│           └── example/
│               ├── Hello.java           # Main handler class
│               └── KeyValueClass.java   # POJO parameter class
├── pom.xml                 # Maven build file
└── README.md               # Documentation
```

## 🚀 Quick Start

### 1. Build the Project

```bash
# Enter the project directory
cd scf-java-helloworld

# Compile and package
mvn clean package
```

On success, the file `scf-java-helloworld-1.0.0.jar` is produced under the `target/` directory.

### 2. Deploy to CloudBase Cloud Functions

1. Sign in to the [Tencent CloudBase Console](https://console.cloud.tencent.com/tcb).
2. Select your CloudBase environment.
3. Open the "Cloud Functions" page.
4. Click "Create cloud function".
5. Choose "Custom create".
6. Pick "Java8" as the runtime.
7. Upload the compiled JAR (`target/scf-java-helloworld-1.0.0.jar`).
8. Configure the handler entry point as needed:
   - `example.Hello::mainHandler` — uses a POJO parameter
   - `example.Hello::simpleHandler` — uses a string parameter
   - `example.Hello::contextHandler` — uses a Context object
9. Configure triggers (optional).
10. Deploy and test.

## 💡 Function Reference

### 1. `mainHandler` — POJO Parameter Handler

**Handler:** `example.Hello::mainHandler`

**Input format:**

```json
{
  "key1": "value1",
  "key2": "value2"
}
```

**Response:**

```text
Hello World
```

**Console output:**

```text
Hello world!
key1 = value1
key2 = value2
```

### 2. `simpleHandler` — String Parameter Handler

**Handler:** `example.Hello::simpleHandler`

**Input:** a single string, for example `"Alice"`.

**Response:** `"Hello, Alice!"`

### 3. `contextHandler` — Handler with Context

**Handler:** `example.Hello::contextHandler`

**Input:** a string value.

**Response:** a string that includes context information such as the request ID.

**Sample console output:**

```text
Request ID: 12345678-1234-1234-1234-123456789012
Input: cloudbase test input
```

## 🔧 Code Conventions

### Handler Format

According to the official Tencent Cloud documentation, the handler for a Java function must include the full package path:

**Format:** `package.ClassName::methodName`

**Examples:**

- `example.Hello::mainHandler`
- `example.Hello::simpleHandler`
- `example.Hello::contextHandler`

### Supported Parameter Types

1. **Java primitive types**
   - `byte`, `int`, `short`, `long`, `float`, `double`, `char`, `boolean`
   - Their boxed wrapper types
   - `String`

2. **POJO types**
   - Must expose public `getter` and `setter` methods.
   - Mutable POJOs are recommended.
   - Example: `KeyValueClass`.

3. **Context object**
   - Type: `com.qcloud.scf.runtime.Context`
   - Provides runtime context information about the function invocation.
   - Optional — omit it when you do not need it.

### Return Value Types

- Java primitive types (including `String`).
- POJO types.

## 🎮 Test Examples

### Test from the CloudBase Console

1. **Test `mainHandler`**

   ```json
   {
     "key1": "Hello",
     "key2": "CloudBase"
   }
   ```

2. **Test `simpleHandler`**

   ```text
   "CloudBase"
   ```

3. **Test `contextHandler`**

   ```text
   "cloudbase test input"
   ```

### HTTP Access Tests

If HTTP access is enabled, you can test as follows:

```bash
# GET request
curl "https://your-env-id.service.tcloudbase.com/helloworld"

# POST request
curl -X POST "https://your-env-id.service.tcloudbase.com/helloworld" \
  -H "Content-Type: application/json" \
  -d '{"key1": "Hello", "key2": "CloudBase"}'
```

### Local Build and Test

```bash
# Compile
mvn compile

# Package
mvn package

# Inspect the generated JAR
ls -la target/scf-java-helloworld-1.0.0.jar
```

## 🌐 Deploying with CloudBase

### Deploy via the CloudBase CLI

```bash
# Install the CloudBase CLI
npm install -g @cloudbase/cli

# Sign in
tcb login

# Initialize the project (if you have not done so)
tcb init

# Deploy the cloud function
tcb functions:deploy helloworld --dir ./target/scf-java-helloworld-1.0.0.jar
```

### Deploy via the CloudBase Console

1. Open the [CloudBase Console](https://console.cloud.tencent.com/tcb).
2. Pick an environment → Cloud Functions → Create cloud function.
3. Upload the JAR and configure the handler.
4. Set environment variables and triggers.
5. Finish the deployment.

### HTTP Access Configuration

To call the cloud function over HTTP:

1. On the cloud function detail page, enable "HTTP access service".
2. Copy the access URL.
3. Invoke the function via GET/POST requests.

## 📚 References

- [Tencent CloudBase Documentation](https://cloud.tencent.com/document/product/876)
- [CloudBase Cloud Functions Java Development Guide](https://cloud.tencent.com/document/product/876/41764)
- [SCF Java Event Library](https://github.com/tencentyun/scf-java-libs)

## 📄 License

MIT License

<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录已提供 `cloudbaserc.json`：`runtime: Java8`、`handler: example.Hello::mainHandler`。部署前需要先在本机执行 `mvn clean package`，生成的 `target/*.jar` 会被 CloudBase 自动打包上传。

The folder ships `cloudbaserc.json` with `runtime: Java8` and `handler: example.Hello::mainHandler`. Run `mvn clean package` first; CloudBase will package the produced `target/*.jar` automatically.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 打包 fat jar / Build the fat jar
mvn -q -DskipTests clean package

# 3. 部署 / Deploy
tcb fn deploy -e <YOUR_ENV_ID>

# 4. 调用测试 / Invoke for testing
tcb fn invoke scf-java-helloworld --params '{"key1":"Hello","key2":"CloudBase"}' -e <YOUR_ENV_ID>

# 5. 查看日志 / Tail logs
tcb fn log scf-java-helloworld -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.
