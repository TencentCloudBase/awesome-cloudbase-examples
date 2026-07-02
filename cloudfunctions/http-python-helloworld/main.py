"""使用 Python 标准库 http.server 实现最小化 HTTP 函数示例。

Minimal HTTP function example using Python's built-in http.server,
with no third-party dependencies.
"""

import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


PORT = int(os.environ.get("PORT", 9000))


class HelloHandler(BaseHTTPRequestHandler):
    """HTTP 请求处理器 / Request handler."""

    def _write_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        self._write_json(
            200,
            {
                "message": "Hello World from Python HTTP Function!",
                "method": self.command,
                "path": self.path,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        self._write_json(
            200,
            {
                "message": "Hello World from Python HTTP Function!",
                "method": self.command,
                "path": self.path,
                "body": raw,
            },
        )

    # 关闭默认 stderr 访问日志，避免与云函数日志重复
    # Silence the default stderr access log to avoid duplication with the function log
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), HelloHandler)
    print(f"http-python-helloworld listening on 0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
