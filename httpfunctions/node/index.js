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
