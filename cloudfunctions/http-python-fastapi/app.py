"""使用 FastAPI 框架的最小化 HTTP 函数模板。

Minimal HTTP function template powered by the FastAPI framework.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request

app = FastAPI(title="http-python-fastapi")


@app.get("/")
async def hello(request: Request) -> dict[str, Any]:
    """健康检查 / Health check."""
    return {
        "message": "Hello World from FastAPI!",
        "method": request.method,
        "path": request.url.path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/json")
async def get_json() -> dict[str, Any]:
    """示例 JSON 路由 / Sample JSON route."""
    return {"code": 200, "data": {"a": 123}}


@app.post("/echo")
async def echo(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """回显请求体 / Echo the request body."""
    return {"code": 200, "requestBody": payload or {}}


if __name__ == "__main__":
    # 本地开发可直接 python3 app.py 启动；生产请使用 uvicorn（见 scf_bootstrap）
    # For local development you may run `python3 app.py`; in production use uvicorn (see scf_bootstrap)
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=9000, reload=True)
