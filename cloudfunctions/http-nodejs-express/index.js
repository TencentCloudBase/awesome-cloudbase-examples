'use strict';
// 使用 Express 框架的最小化 HTTP 函数示例
// Minimal HTTP function example powered by the Express framework
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 9000;

// 健康检查 / Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from Express!',
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// 示例 JSON 路由 / Sample JSON route
app.get('/json', (req, res) => {
  res.json({
    code: 200,
    data: { a: 123 },
  });
});

// 示例 POST 路由，回显请求体 / Sample POST route that echoes the request body
app.post('/echo', (req, res) => {
  res.json({
    code: 200,
    requestBody: req.body,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`http-nodejs-express listening on 0.0.0.0:${PORT}`);
});
