FROM node:20-alpine

# 容器默认时区为UTC，如需使用上海时间请启用以下时区设置命令
RUN apk add --no-cache tzdata ca-certificates \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo Asia/Shanghai > /etc/timezone

WORKDIR /app

# 暴露端口（云托管标准）
EXPOSE 80
ENV PORT=80

# ⚠️ 环境变量说明：
# 正式环境请在云托管控制台 → 服务设置 → 环境变量中配置，不要把密钥写在 Dockerfile 里。
# 本地开发请复制 .env.example 为 .env 并填入实际值。
# 以下仅为占位声明，实际值通过运行时注入（集成中心托管）。
# ⚠️ 回调一律由本函数自验签（stripe-signature），没有 signMode / notifyURLCallbackType 开关
ENV corsAllowOrigin=""
ENV stripeSecretKey=""
ENV stripeWebhookSecret=""
ENV stripeApiVersion=""
ENV stripeSuccessUrl=""
ENV stripeCancelUrl=""

# 拷贝包管理文件
COPY package*.json /app/

# npm 源，选用国内镜像源以提高下载速度
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# npm 安装依赖
RUN npm install

# 将当前目录（dockerfile所在目录）下所有文件都拷贝到工作目录下（.dockerignore中文件除外）
COPY . /app

# 执行启动命令
CMD ["npm", "start"]
