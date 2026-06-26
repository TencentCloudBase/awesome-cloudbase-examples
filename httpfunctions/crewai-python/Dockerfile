FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
ENV TENCENTCLOUD_RUNENV=SCF

RUN apt-get update && apt-get install -y --no-install-recommends \
        tzdata ca-certificates \
    && ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# 在 Debian 上直接安装（如果 pysqlite3-binary 有适配的 wheel）
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir pysqlite3-binary

CMD ["python3", "-u", "app.py"]