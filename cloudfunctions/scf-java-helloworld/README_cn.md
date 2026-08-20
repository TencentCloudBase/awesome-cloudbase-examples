# SCF Java HelloWorld 示例

这是一个按照腾讯云官方文档规范编写的 SCF（Serverless Cloud Function）Java HelloWorld 示例。

## 📁 项目结构

```
scf-java-helloworld/
├── src/
│   └── main/
│       └── java/
│           └── example/
│               ├── Hello.java           # 主函数类
│               └── KeyValueClass.java   # POJO 参数类
├── pom.xml                 # Maven 配置文件
└── README.md              # 说明文档
```

## 🚀 快速开始

### 1. 编译项目

```bash
# 进入项目目录
cd scf-java-helloworld

# 编译和打包
mvn clean package
```

编译成功后，会在 `target/` 目录下生成 `scf-java-helloworld-1.0.0.jar` 文件。

### 2. 部署到云开发云函数

1. 登录 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的云开发环境
3. 进入 "云函数" 页面
4. 点击 "新建云函数"
5. 选择 "自定义创建"
6. 运行环境选择 "Java8"
7. 上传编译好的 JAR 包 (`target/scf-java-helloworld-1.0.0.jar`)
8. 根据需要配置执行方法：
   - `example.Hello::mainHandler` - 使用 POJO 参数
   - `example.Hello::simpleHandler` - 使用字符串参数
   - `example.Hello::contextHandler` - 使用 Context 对象
9. 配置触发器（可选）
10. 部署并测试

## 💡 函数说明

### 1. mainHandler - POJO 参数处理

**执行方法：** `example.Hello::mainHandler`

**输入参数格式：**
```json
{
  "key1": "value1",
  "key2": "value2"
}
```

**返回结果：**
```
Hello World
```

**控制台输出：**
```
Hello world!
key1 = value1
key2 = value2
```

### 2. simpleHandler - 字符串参数处理

**执行方法：** `example.Hello::simpleHandler`

**输入参数：** 直接传入字符串，如 `"张三"`

**返回结果：** `"Hello, 张三!"`

### 3. contextHandler - 带 Context 的处理

**执行方法：** `example.Hello::contextHandler`

**输入参数：** 字符串类型

**返回结果：** 包含请求ID等上下文信息的字符串

**控制台输出示例：**
```
Request ID: 12345678-1234-1234-1234-123456789012
Input: 云开发测试输入
```

## 🔧 代码规范说明

### 执行方法格式

根据腾讯云官方文档，Java 函数的执行方法必须包含完整的包路径：

**格式：** `包名.类名::方法名`

**示例：**
- `example.Hello::mainHandler`
- `example.Hello::simpleHandler`
- `example.Hello::contextHandler`

### 支持的参数类型

1. **Java 基础类型**
   - `byte`, `int`, `short`, `long`, `float`, `double`, `char`, `boolean`
   - 对应的包装类
   - `String` 类型

2. **POJO 类型**
   - 必须包含公有的 `getter` 和 `setter` 方法
   - 推荐使用可变 POJO
   - 示例：`KeyValueClass`

3. **Context 对象**
   - 类型：`com.qcloud.scf.runtime.Context`
   - 提供函数运行时上下文信息
   - 可选参数，不需要时可以省略

### 返回值类型

- 支持 Java 基础类型（包括 String）
- 支持 POJO 类型

## 🎮 测试示例

### 在云开发控制台测试

1. **测试 mainHandler**
   ```json
   {
     "key1": "Hello",
     "key2": "CloudBase"
   }
   ```

2. **测试 simpleHandler**
   ```
   "云开发"
   ```

3. **测试 contextHandler**
   ```
   "云开发测试输入"
   ```

### HTTP 访问测试

如果开启了 HTTP 访问服务，可以通过以下方式测试：

```bash
# GET 请求
curl "https://your-env-id.service.tcloudbase.com/helloworld"

# POST 请求
curl -X POST "https://your-env-id.service.tcloudbase.com/helloworld" \
  -H "Content-Type: application/json" \
  -d '{"key1": "Hello", "key2": "CloudBase"}'
```

### 本地编译测试

```bash
# 编译
mvn compile

# 打包
mvn package

# 查看生成的 JAR 包
ls -la target/scf-java-helloworld-1.0.0.jar
```

## 🌐 云开发部署说明

### 使用云开发 CLI 部署

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 初始化项目（如果还没有）
tcb init

# 部署云函数
tcb functions:deploy helloworld --dir ./target/scf-java-helloworld-1.0.0.jar
```

### 使用云开发控制台部署

1. 进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境 → 云函数 → 新建云函数
3. 上传 JAR 包并配置执行方法
4. 设置环境变量和触发器
5. 部署完成

### HTTP 访问配置

如果需要通过 HTTP 访问云函数：

1. 在云函数详情页面，开启 "HTTP 访问服务"
2. 获取访问链接
3. 通过 GET/POST 请求调用函数

## 📚 参考文档

- [腾讯云云开发文档](https://cloud.tencent.com/document/product/876)
- [云开发云函数 Java 开发指南](https://cloud.tencent.com/document/product/876/41764)
- [SCF Java 事件库](https://github.com/tencentyun/scf-java-libs)

## 📄 许可证

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
