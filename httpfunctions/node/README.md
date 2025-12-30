# Node.js 快速开始

本文档介绍从零开始手动将一个 Node.js 应用部署到 Cloudbase HTTP 云函数中。

## 第一步: 编写基础应用

创建名为```helloworld```的新目录，并转到此目录中:

```
mkdir helloworld
cd helloworld
```

创建一个包含以下内容的```package.json```文件:

```
{
  "name": "helloworld",
  "description": "Simple hello world sample in Node",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "author": "Tencent CloudBase",
  "license": "Apache-2.0"
}
```

在同一个目录中，创建一个```index.js```文件, 并将以下代码行复制到其中:

```
默认 HTTP 云函数端口必须是 9000。
```

```
import { createServer } from "node:http";
import { Readable } from "node:stream";

const server = createServer(async (req, res) => {
  if (req.url === "/") {
    res.writeHead(200);
    res.end("Hello World!");
  } else if (req.url === "/myip") {
    // 设置 CORS 头，允许跨域请求
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      // 使用 fetch 获取远程数据（这里使用 ipinfo.io 作为示例）
      const response = await fetch("https://ipinfo.io", {
        headers: {
          Accept: "application/json",
        },
      });
      Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
      console.error(error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Failed to fetch remote data" }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const port = 9000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log(
    `Try accessing http://localhost:${port}/myip to see your IP info`
  );
});
```

此代码会创建一个基本的 Web 服务器，侦听 ```9000``` 端口。

## 第2步(可选): 本地运行

```
node index.js
```

## 第3步: 部署到 CLoudbase HTTP 云函数

通过源码上传部署到云托管

## 第4步: 服务访问
