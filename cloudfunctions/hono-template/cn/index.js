'use strict';
const { Hono } = require("hono");
const { handle } = require("hono-tencent-cloudbase-cloud-function-adapter");

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));
app.get("/json", (c) => c.json({
  data: {
    a: 123
  },
  code: 200
}));
app.post("/", async (c) => c.json({
  requestBody: await c.req.json(),
  code: 200
}));

// 添加图片代理路由
app.get("/image", async (c) => {
  try {
    // 从查询参数获取图片URL
    const imageUrl = c.req.query("url");

    if (!imageUrl) {
      return c.json({ error: "Missing image URL parameter" }, 400);
    }

    // 获取远程图片
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return c.json({ error: "Failed to fetch image", status: response.status }, 500);
    }

    // 获取图片内容类型
    const contentType = response.headers.get("content-type");
    // 获取图片数据
    const imageBuffer = await response.arrayBuffer();

    // 返回图片数据
    return c.body(imageBuffer, 200, {
      "Content-Type": contentType || "image/jpeg"
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return c.json({ error: "Failed to process image request" }, 500);
  }
});

// 添加文件上传处理路由
app.post("/upload", async (c) => {
  try {
    // 解析multipart/form-data请求体
    const body = await c.req.parseBody();

    // 获取上传的文件
    const file = body.file;

    // 检查文件是否存在
    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // 处理文件信息
    let fileName;
    let fileSize;
    let fileType;

    if (typeof file === 'string') {
      // 如果是字符串，可能是文件路径或Base64编码
      fileName = "text-content";
      fileSize = file.length;
      fileType = "text/plain";
    } else {
      // 如果是File对象
      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
    }

    // 返回文件信息
    return c.json({
      success: true,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
      code: 200
    });
  } catch (error) {
    console.error("Error processing file upload:", error);
    return c.json({
      error: "Failed to process file upload",
      message: error.message
    }, 500);
  }
});

// 处理定时器触发事件
// 定时器事件会自动转换为 GET 请求，路径为: /CLOUDBASE_TIMER_TRIGGER/${TriggerName}
app.get("/CLOUDBASE_TIMER_TRIGGER/:triggerName", (c) => {
  const triggerName = c.req.param("triggerName");

  // 从环境中获取原始定时器事件
  const originalTimerEvent = c.env?.originalTimerEvent;

  console.log(`定时器触发: ${triggerName}`);
  console.log(`定时器事件:`, originalTimerEvent);

  // 在此处执行你的定时任务

  return c.json({
    message: `定时器 ${triggerName} 成功执行`,
    timestamp: new Date().toISOString(),
    originalEvent: originalTimerEvent,
  });
});

exports.main = handle(app);
