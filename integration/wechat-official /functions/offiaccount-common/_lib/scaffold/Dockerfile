FROM node:20-alpine

# 设置时区为上海时间
RUN apk add --no-cache tzdata ca-certificates \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo Asia/Shanghai > /etc/timezone

# 工作目录
WORKDIR /app

# 暴露端口（云托管标准）
EXPOSE 80
ENV PORT=80

# ⚠️ 请勿在此处硬编码任何凭据（密钥、Secret 等）。
# 请在云托管控制台 → 服务配置 → 环境变量中配置

# 拷贝依赖文件
COPY package*.json /app/

# 使用国内镜像源加速 npm 下载
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# 安装依赖
RUN npm install

# 拷贝业务代码
COPY . /app

# 启动命令
CMD ["npm", "start"]
