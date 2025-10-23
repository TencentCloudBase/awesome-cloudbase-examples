# Hono 云函数使用示例

该模板演示了如何在云函数环境中使用 Honojs 框架，包含多种功能接口。以下是各个接口的使用示例，包括云函数调用和 HTTP 请求调用方式。

**使用 HTTP 访问前，需要前往 云开发平台-云函数-函数配置 设定 HTTP 访问服务路径。**

## 1. 基础接口调用

### 获取文本响应

**云函数调用方式：**
```js
// 小程序中调用示例
wx.cloud.callFunction({
  name: 'hono-template',
  data: { path: '/' }, // 请求根路径
}).then((res) => {
  console.log('文本响应结果:', res.result.body); // 输出: Hello Hono!
})
```

**HTTP 请求方式：**
```js
// 假设云函数HTTP服务地址为 https://your-domain.com/hono-template
fetch('https://your-domain.com/hono-template/')
  .then(response => response.text())
  .then(data => {
    console.log('文本响应结果:', data); // 输出: Hello Hono!
  });
```

**curl 命令：**
```bash
curl https://your-domain.com/hono-template/
```

### 获取JSON数据

**云函数调用方式：**
```js
// 小程序中调用示例
wx.cloud.callFunction({
  name: 'hono-template',
  data: { path: '/json' },
}).then((res) => {
  console.log('JSON响应结果:', JSON.parse(res.result.body));
  // 输出: { data: { a: 123 }, code: 200 }
});
```

**HTTP 请求方式：**
```js
fetch('https://your-domain.com/hono-template/json')
  .then(response => response.json())
  .then(data => {
    console.log('JSON响应结果:', data);
    // 输出: { data: { a: 123 }, code: 200 }
  });
```

**curl 命令：**
```bash
curl https://your-domain.com/hono-template/json
```

## 2. 图片代理功能

**HTTP 请求方式：**
```js
// 在浏览器或其他环境中直接使用
const imageUrl = 'https://your-domain.com/hono-template/image?url=' + 
                 encodeURIComponent('https://example.com/sample-image.jpg');

// 直接在img标签中使用
document.getElementById('proxyImage').src = imageUrl;
```

## 3. 文件上传功能

**HTTP 请求方式：**
```js
// 在浏览器中使用FormData上传文件
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
    console.log('文件上传信息:', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
});
```

**curl 命令上传文件：**
```bash
curl -X POST https://your-domain.com/hono-template/upload \
  -F "file=@/path/to/local/file.jpg"
```

## 4. 定时触发器使用

定时触发器主要由云函数平台根据配置的时间自动触发，但也可以手动模拟触发。

### 配置定时触发器

**手动模拟触发（HTTP方式）：**
```js
fetch('https://your-domain.com/hono-template/CLOUDBASE_TIMER_TRIGGER/daily-task')
  .then(response => response.json())
  .then(data => {
    console.log('定时器测试结果:', data);
  });
```

**curl 命令模拟触发：**
```bash
curl https://your-domain.com/hono-template/CLOUDBASE_TIMER_TRIGGER/daily-task
```

当触发器被触发时，云函数会返回如下结果：
```json
{
  "message": "定时器 daily-task 成功执行",
  "timestamp": "2023-08-15T08:00:00.123Z",
  "originalEvent": {...触发器事件对象...}
}
```

---

通过上述方式，您可以根据自己的应用场景选择合适的调用方式，以灵活地使用 Hono 框架构建云函数应用。
