FROM node:20-alpine

RUN apk add --no-cache tzdata ca-certificates \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo Asia/Shanghai > /etc/timezone

WORKDIR /app

EXPOSE 80
ENV PORT=80

# ⚠️ 请勿在此处硬编码凭据（appSecret 等）。
# 请在云托管控制台 → 服务配置 → 环境变量 中配置：
#   appId, appSecret

COPY package*.json /app/

RUN npm config set registry https://mirrors.cloud.tencent.com/npm/
RUN npm install

COPY . /app

CMD ["npm", "start"]
