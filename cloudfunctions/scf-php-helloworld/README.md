# PHP SCF HelloWorld 示例

这是一个基于腾讯云 SCF（Serverless Cloud Function）的 PHP HelloWorld 示例，展示了如何创建和部署 PHP 云函数。

## 项目结构

```
scf-php-helloworld/
├── index.php          # 主要的 PHP 云函数代码
└── README.md          # 项目说明文档
```

## 功能说明

本示例包含四个处理函数：

### 1. main_handler（主处理函数）
- **执行方法**: `index.main_handler`
- **功能**: 基础的 HelloWorld 函数，返回包含事件信息和上下文信息的 JSON 响应
- **测试数据**: 任意 JSON 对象

### 2. hello_handler（个性化问候）
- **执行方法**: `index.hello_handler`
- **功能**: 根据输入的 name 参数返回个性化问候
- **测试数据**: 
```json
{
  "name": "张三"
}
```

### 3. calculate_handler（数学计算）
- **执行方法**: `index.calculate_handler`
- **功能**: 对两个数字进行基本数学运算
- **测试数据**:
```json
{
  "a": 10,
  "b": 5
}
```

### 4. error_handler（错误处理）
- **执行方法**: `index.error_handler`
- **功能**: 演示错误处理机制
- **测试数据**:
```json
{
  "shouldError": false
}
```

## 本地开发

### 环境要求
- PHP 5.6+ 或 PHP 7.x+ 或 PHP 8.x
- 支持 JSON 扩展

### 本地测试
可以通过命令行测试函数逻辑：

```bash
# 测试主函数
php -r "
include 'index.php';
\$event = json_decode('{\"test\": \"data\"}');
\$context = json_decode('{\"requestId\": \"test-123\"}');
echo main_handler(\$event, \$context);
"
```

## 云开发部署

### 通过腾讯云开发控制台部署

1. **登录腾讯云开发控制台**
   - 访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
   - 选择您的环境

2. **创建云函数**
   - 进入「云函数」页面
   - 点击「新建云函数」
   - 选择「自定义创建」

3. **配置函数信息**
   - **函数名称**: `php-helloworld`
   - **运行环境**: 选择 `PHP 8.0` 或 `PHP 7.4`
   - **执行方法**: `index.main_handler`（或其他处理函数）

4. **上传代码**
   - 选择「本地上传zip包」
   - 将 `index.php` 文件打包成 zip 文件
   - 上传 zip 包

5. **高级配置**（可选）
   - **内存**: 128MB（默认）
   - **超时时间**: 3秒（默认）
   - **环境变量**: 根据需要设置

6. **完成创建**
   - 点击「完成」创建函数

## 测试函数

### 在控制台测试

1. 进入云函数详情页
2. 点击「函数代码」标签
3. 在「测试」区域输入测试数据
4. 点击「测试运行」

### 测试用例

**测试 main_handler:**
```json
{
  "test": "Hello from console",
  "timestamp": "2024-01-01 12:00:00"
}
```

**测试 hello_handler:**
```json
{
  "name": "腾讯云开发者"
}
```

**测试 calculate_handler:**
```json
{
  "a": 15,
  "b": 3
}
```

**测试 error_handler:**
```json
{
  "shouldError": true
}
```

## 函数调用

### HTTP 触发器调用

如果配置了 HTTP 触发器，可以通过 HTTP 请求调用：

```bash
curl -X POST https://your-env-id.service.tcloudbase.com/php-helloworld \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

### SDK 调用

```javascript
// 使用 CloudBase JavaScript SDK
import cloudbase from '@cloudbase/js-sdk';

const app = cloudbase.init({
  env: 'your-env-id'
});

// 调用云函数
app.callFunction({
  name: 'php-helloworld',
  data: {
    name: 'CloudBase'
  }
}).then(res => {
  console.log(res.result);
});
```

## 注意事项

1. **执行方法格式**: 必须是 `文件名.函数名` 的格式，如 `index.main_handler`
2. **文件编码**: 确保 PHP 文件使用 UTF-8 编码
3. **返回值限制**: 返回值会被记录在日志中，长度限制为 8KB
4. **错误处理**: 使用 `die()` 或 `exit()` 会标记函数执行失败
5. **日志查看**: 可在控制台的「日志查询」中查看函数执行日志

## 常见问题

### Q: 函数执行失败，提示找不到处理函数？
A: 检查执行方法配置是否正确，确保格式为 `index.main_handler`，且文件中确实定义了对应的函数。

### Q: 如何查看函数执行日志？
A: 在云函数控制台的「日志查询」页面可以查看详细的执行日志和错误信息。

### Q: 函数超时怎么办？
A: 在函数配置中增加超时时间，或优化代码逻辑减少执行时间。

### Q: 如何处理 PHP 依赖？
A: 可以将依赖库一起打包上传，或使用 Composer 管理依赖后将 vendor 目录一起上传。

## 更多资源

- [腾讯云 SCF PHP 开发指南](https://cloud.tencent.com/document/product/583/56826)
- [腾讯云开发文档](https://cloud.tencent.com/document/product/876)
- [CloudBase CLI 文档](https://docs.cloudbase.net/cli/intro.html)