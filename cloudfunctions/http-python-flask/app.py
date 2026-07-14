"""使用 Flask 框架的最小化 HTTP 函数模板。

Minimal HTTP function template powered by the Flask framework.
"""

from datetime import datetime, timezone

from flask import Flask, jsonify, request

app = Flask(__name__)


@app.get("/")
def hello():
    """健康检查 / Health check."""
    return jsonify(
        message="Hello World from Flask!",
        method=request.method,
        path=request.path,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/json")
def get_json():
    """示例 JSON 路由 / Sample JSON route."""
    return jsonify(code=200, data={"a": 123})


@app.post("/echo")
def echo():
    """回显请求体 / Echo the request body."""
    return jsonify(code=200, requestBody=request.get_json(silent=True) or {})


if __name__ == "__main__":
    # 本地开发使用 Flask 自带服务器；生产请通过 gunicorn 启动（见 scf_bootstrap）
    # Use Flask's development server locally; in production launch via gunicorn (see scf_bootstrap)
    app.run(host="0.0.0.0", port=9000)
