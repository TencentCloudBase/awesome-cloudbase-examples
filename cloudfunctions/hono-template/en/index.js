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

// Add image proxy route
app.get("/image", async (c) => {
  try {
    // Get image URL from query parameters
    const imageUrl = c.req.query("url");

    if (!imageUrl) {
      return c.json({ error: "Missing image URL parameter" }, 400);
    }

    // Get remote image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return c.json({ error: "Failed to fetch image", status: response.status }, 500);
    }

    // Get image content type
    const contentType = response.headers.get("content-type");
    // Get image data
    const imageBuffer = await response.arrayBuffer();

    // Return image data
    return c.body(imageBuffer, 200, {
      "Content-Type": contentType || "image/jpeg"
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return c.json({ error: "Failed to process image request" }, 500);
  }
});

// Add file upload processing route
app.post("/upload", async (c) => {
  try {
    // Parse multipart/form-data request body
    const body = await c.req.parseBody();

    // Get uploaded file
    const file = body.file;

    // Check if file exists
    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Process file information
    let fileName;
    let fileSize;
    let fileType;

    if (typeof file === 'string') {
      // If it's a string, it might be a file path or Base64 encoded
      fileName = "text-content";
      fileSize = file.length;
      fileType = "text/plain";
    } else {
      // If it's a File object
      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
    }

    // Return file information
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

// Handle timer trigger events
// Timer events are automatically converted to GET requests with path: /CLOUDBASE_TIMER_TRIGGER/${TriggerName}
app.get("/CLOUDBASE_TIMER_TRIGGER/:triggerName", (c) => {
  const triggerName = c.req.param("triggerName");

  // Get original timer event from environment
  const originalTimerEvent = c.env?.originalTimerEvent;

  console.log(`Timer triggered: ${triggerName}`);
  console.log(`Timer event:`, originalTimerEvent);

  // Execute your scheduled task here

  return c.json({
    message: `Timer ${triggerName} executed successfully`,
    timestamp: new Date().toISOString(),
    originalEvent: originalTimerEvent,
  });
});

exports.main = handle(app);
