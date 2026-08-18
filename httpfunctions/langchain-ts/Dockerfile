# 使用多阶段构建：构建阶段和运行阶段
FROM node:20-alpine AS builder
WORKDIR /app

# 安装构建所需依赖。先复制 package.json 和 lockfile 以利用 Docker 缓存
COPY package*.json ./
# 如果你使用 yarn 或 pnpm，可把对应的 lock 文件也复制进来，例如 yarn.lock 或 pnpm-lock.yaml

# 安装所有依赖（包括 devDependencies），以便运行 tsc
RUN npm i

# 复制 tsconfig 与源码并执行构建
COPY tsconfig*.json ./
COPY src ./src
# 如果有其他需要的资源（例如 .env.example、scripts 等）一并复制

# 运行 TypeScript 编译（确保 package.json 中有 "build": "tsc -p tsconfig.json"）
RUN npm run build

# -----------------------
# 运行镜像：仅拷贝编译产物与生产依赖
FROM node:20-alpine AS runner
WORKDIR /app

# 只复制 package.json 与 lockfile，并安装生产依赖，尽量减小镜像体积
COPY package*.json ./
RUN npm i --production

# 从构建阶段拷贝编译产物
COPY --from=builder /app/dist ./dist

# 如果需要静态文件或其他资源，按需拷贝，例如：
# COPY --from=builder /app/public ./public

# 设置环境变量（可选）
ENV NODE_ENV=production
# 暴露端口（根据应用实际端口修改）
EXPOSE 9000

# 启动命令：请根据你的入口文件调整路径与参数
CMD ["node", "dist/cjs/index.js"]
