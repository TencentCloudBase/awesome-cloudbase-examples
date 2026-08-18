# 使用 Node.js 20 Alpine 镜像
FROM node:20-alpine
WORKDIR /app

# 复制 package.json 和 lockfile 以利用 Docker 缓存
COPY package*.json ./

# 安装生产依赖
RUN npm i --production

# 复制源码
COPY src ./src

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 9000

# 启动命令
CMD ["node", "src/index.js"]

