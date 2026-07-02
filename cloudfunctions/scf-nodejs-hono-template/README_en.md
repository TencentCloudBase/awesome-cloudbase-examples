# Hono Cloud Function Usage Example

This template demonstrates how to use the Honojs framework in a cloud function environment, including various functional interfaces. Below are usage examples for each interface, including cloud function calls and HTTP request methods.

**Before using HTTP access, you need to go to Cloud Development Platform - Cloud Functions - Function Configuration to set the HTTP access service path.**

## 1. Basic Interface Calls

### Get Text Response

**Cloud Function Call Method:**
```js
// Example call in mini program
wx.cloud.callFunction({
  name: 'hono-template',
  data: { path: '/' }, // Request root path
}).then((res) => {
  console.log('Text response result:', res.result.body); // Output: Hello Hono!
})
```

**HTTP Request Method:**
```js
// Assuming cloud function HTTP service address is https://your-domain.com/hono-template
fetch('https://your-domain.com/hono-template/')
  .then(response => response.text())
  .then(data => {
    console.log('Text response result:', data); // Output: Hello Hono!
  });
```

**curl command:**
```bash
curl https://your-domain.com/hono-template/
```

### Get JSON Data

**Cloud Function Call Method:**
```js
// Example call in mini program
wx.cloud.callFunction({
  name: 'hono-template',
  data: { path: '/json' },
}).then((res) => {
  console.log('JSON response result:', JSON.parse(res.result.body));
  // Output: { data: { a: 123 }, code: 200 }
});
```

**HTTP Request Method:**
```js
fetch('https://your-domain.com/hono-template/json')
  .then(response => response.json())
  .then(data => {
    console.log('JSON response result:', data);
    // Output: { data: { a: 123 }, code: 200 }
  });
```

**curl command:**
```bash
curl https://your-domain.com/hono-template/json
```

## 2. Image Proxy Function

**HTTP Request Method:**
```js
// Use directly in browser or other environments
const imageUrl = 'https://your-domain.com/hono-template/image?url=' + 
                 encodeURIComponent('https://example.com/sample-image.jpg');

// Use directly in img tag
document.getElementById('proxyImage').src = imageUrl;
```

## 3. File Upload Function

**HTTP Request Method:**
```js
// Upload files using FormData in browser
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('https://your-domain.com/hono-template/upload', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    console.log('File upload information:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
});
```

**curl command for file upload:**
```bash
curl -X POST https://your-domain.com/hono-template/upload \
  -F "file=@/path/to/local/file.jpg"
```

## 4. Timer Trigger Usage

Timer triggers are mainly automatically triggered by the cloud function platform based on configured times, but can also be manually simulated.

### Configure Timer Trigger

**Manual simulation trigger (HTTP method):**
```js
fetch('https://your-domain.com/hono-template/CLOUDBASE_TIMER_TRIGGER/daily-task')
  .then(response => response.json())
  .then(data => {
    console.log('Timer test result:', data);
  });
```

**curl command for simulation trigger:**
```bash
curl https://your-domain.com/hono-template/CLOUDBASE_TIMER_TRIGGER/daily-task
```

When the trigger is activated, the cloud function returns the following result:
```json
{
  "message": "Timer daily-task executed successfully",
  "timestamp": "2023-08-15T08:00:00.123Z",
  "originalEvent": {...trigger event object...}
}
```

---

Through the above methods, you can choose the appropriate calling method based on your application scenario to flexibly use the Hono framework to build cloud function applications.


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json` 配置文件，安装并登录 [CloudBase CLI](https://docs.cloudbase.net/cli/intro) 后即可一键部署。

This folder ships a ready-to-use `cloudbaserc.json` so you can deploy with the [CloudBase CLI](https://docs.cloudbase.net/cli/intro) in one command.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 在本函数目录下部署 / Deploy from this folder
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 调用测试 / Invoke for testing
tcb fn invoke scf-nodejs-hono-template --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-hono-template -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.
