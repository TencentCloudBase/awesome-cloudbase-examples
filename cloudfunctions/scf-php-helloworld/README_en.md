# PHP SCF HelloWorld Example

A PHP HelloWorld example for Tencent Cloud SCF (Serverless Cloud Function), demonstrating how to create and deploy a PHP cloud function.

## Project Structure

```text
scf-php-helloworld/
├── index.php          # Main PHP cloud function source
└── README.md          # Documentation
```

## Function Overview

The sample contains four handlers:

### 1. `main_handler` — Main Handler

- **Handler entry**: `index.main_handler`
- **Behavior**: Basic HelloWorld handler. Returns a JSON response that includes the event and context info.
- **Test payload**: any JSON object.

### 2. `hello_handler` — Personalized Greeting

- **Handler entry**: `index.hello_handler`
- **Behavior**: Returns a personalized greeting based on the `name` field.
- **Test payload**:

```json
{
  "name": "Alice"
}
```

### 3. `calculate_handler` — Arithmetic

- **Handler entry**: `index.calculate_handler`
- **Behavior**: Performs basic arithmetic on two numbers.
- **Test payload**:

```json
{
  "a": 10,
  "b": 5
}
```

### 4. `error_handler` — Error Handling

- **Handler entry**: `index.error_handler`
- **Behavior**: Demonstrates error handling.
- **Test payload**:

```json
{
  "shouldError": false
}
```

## Local Development

### Requirements

- PHP 5.6+ / 7.x / 8.x
- JSON extension enabled

### Local Test

You can test the handler logic directly with the PHP CLI:

```bash
# Test the main handler
php -r "
include 'index.php';
\$event = json_decode('{\"test\": \"data\"}');
\$context = json_decode('{\"requestId\": \"test-123\"}');
echo main_handler(\$event, \$context);
"
```

## Deploy to CloudBase

### Deploy via the CloudBase Console

1. **Sign in to the CloudBase Console**
   - Visit the [CloudBase Console](https://console.cloud.tencent.com/tcb).
   - Select your environment.

2. **Create a cloud function**
   - Open the "Cloud Functions" page.
   - Click "Create cloud function".
   - Choose "Custom create".

3. **Configure the function**
   - **Name**: `php-helloworld`
   - **Runtime**: `PHP 8.0` or `PHP 7.4`
   - **Handler**: `index.main_handler` (or any of the other handlers)

4. **Upload the code**
   - Choose "Upload local zip".
   - Zip `index.php` and upload it.

5. **Advanced configuration** (optional)
   - **Memory**: 128 MB (default)
   - **Timeout**: 3 s (default)
   - **Env variables**: as needed

6. **Finish creation**

## Testing the Function

### Test from the Console

1. Open the cloud function detail page.
2. Switch to the "Function code" tab.
3. Enter the test payload under the "Test" section.
4. Click "Run test".

### Sample test payloads

**Test `main_handler`:**

```json
{
  "test": "Hello from console",
  "timestamp": "2024-01-01 12:00:00"
}
```

**Test `hello_handler`:**

```json
{
  "name": "CloudBase developer"
}
```

**Test `calculate_handler`:**

```json
{
  "a": 15,
  "b": 3
}
```

**Test `error_handler`:**

```json
{
  "shouldError": true
}
```

## Invoking the Function

### Via an HTTP trigger

If you configure an HTTP trigger, you can call the function via HTTP:

```bash
curl -X POST https://your-env-id.service.tcloudbase.com/php-helloworld \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

### Via the SDK

```javascript
// Use the CloudBase JavaScript SDK
import cloudbase from '@cloudbase/js-sdk';

const app = cloudbase.init({
  env: 'your-env-id'
});

// Invoke the cloud function
app.callFunction({
  name: 'php-helloworld',
  data: {
    name: 'CloudBase'
  }
}).then(res => {
  console.log(res.result);
});
```

## Notes

1. **Handler format**: must be `filename.functionName`, e.g. `index.main_handler`.
2. **File encoding**: keep PHP files in UTF-8.
3. **Return-value limit**: the return value is recorded in the log; max 8 KB.
4. **Error handling**: calling `die()` or `exit()` marks the invocation as failed.
5. **Logs**: inspect execution logs under the "Log query" tab in the console.

## FAQ

### Q: The function fails with "handler not found"

A: Verify the handler is configured exactly as `index.main_handler`, and the corresponding function is actually defined in the file.

### Q: Where do I see execution logs?

A: Use "Log query" on the cloud function detail page for detailed logs and errors.

### Q: What if the function times out?

A: Increase the timeout in the function configuration, or optimize the code to run faster.

### Q: How do I handle PHP dependencies?

A: Bundle the dependencies into the upload package, or use Composer and include the resulting `vendor/` directory.

## References

- [Tencent Cloud SCF PHP Development Guide](https://cloud.tencent.com/document/product/583/56826)
- [Tencent CloudBase Documentation](https://cloud.tencent.com/document/product/876)
- [CloudBase CLI Documentation](https://docs.cloudbase.net/cli/intro.html)

<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录已提供 `cloudbaserc.json`：`runtime: Php7.4`、`handler: index.main_handler`，无需本地构建。

The folder ships `cloudbaserc.json` with `runtime: Php7.4` and `handler: index.main_handler`. No local build step is required.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 部署 / Deploy
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 调用测试 / Invoke for testing
tcb fn invoke scf-php-helloworld --params '{"test":"data"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-php-helloworld -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.
