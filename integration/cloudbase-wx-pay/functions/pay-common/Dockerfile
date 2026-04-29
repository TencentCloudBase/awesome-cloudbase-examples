FROM node:20-alpine

# 容器默认时区为UTC，如需使用上海时间请启用以下时区设置命令
RUN apk add --no-cache tzdata ca-certificates \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo Asia/Shanghai > /etc/timezone

# # 指定工作目录
WORKDIR /app

# 暴露端口（云托管标准）
EXPOSE 80
ENV PORT=80

# ⚠️ 请勿在此处硬编码支付凭据（privateKey、apiV3Key 等）。
# 请在云托管控制台 → 服务配置 → 环境变量中配置以下变量：
#   signMode, appId, merchantId, merchantSerialNumber,
#   apiV3Key, privateKey, wxPayPublicKey, wxPayPublicKeyId,
#   notifyURLPayURL, notifyURLRefundsURL, transferNotifyUrl

# 拷贝包管理文件
COPY package*.json /app/

# npm 源，选用国内镜像源以提高下载速度
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/
# RUN npm config set registry https://registry.npm.taobao.org/

# npm 安装依赖
RUN npm install

# 将当前目录（dockerfile所在目录）下所有文件都拷贝到工作目录下（.dockerignore中文件除外）
COPY . /app

# 执行启动命令
# 写多行独立的CMD命令是错误写法！只有最后一行CMD命令会被执行，之前的都会被忽略，导致业务报错。
# 请参考[Docker官方文档之CMD命令](https://docs.docker.com/engine/reference/builder/#cmd)
CMD ["npm", "start"]
