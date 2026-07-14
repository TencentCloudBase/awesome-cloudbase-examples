'use strict';
// 使用 Node.js 内置 http 模块实现最小化 HTTP 函数示例
// Minimal HTTP function example using the Node.js built-in `http` module
const http = require('node:http');

const PORT = process.env.PORT || 9000;

const server = http.createServer((req, res) => {
  // 设置响应头
  // Set response headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const body = {
    message: 'Hello World from Node.js HTTP Function!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };

  res.statusCode = 200;
  res.end(JSON.stringify(body));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`http-nodejs-helloworld listening on 0.0.0.0:${PORT}`);
});
