FROM ghcr.io/astral-sh/uv:python3.10-bookworm-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_SYSTEM_PYTHON=1 \
    TENCENTCLOUD_RUNENV=SCF

RUN sed -i 's/deb.debian.org/mirrors.tencent.com/g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's/security.debian.org/mirrors.tencent.com/g' /etc/apt/sources.list.d/debian.sources

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        tzdata ca-certificates \
    && ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN uv pip install --system --no-cache \
    --index-url https://mirrors.cloud.tencent.com/pypi/simple \
    --extra-index-url https://pypi.org/simple \
    -r requirements.txt
    
COPY app.py agent.py auth.py ./

CMD ["python3", "app.py"]
