FROM node:20-alpine

RUN apk add --no-cache tzdata ca-certificates \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo Asia/Shanghai > /etc/timezone

WORKDIR /app

EXPOSE 80
ENV PORT=80

# ⚠️ 环境变量说明：
# 正式环境请在云托管控制台 → 服务设置 → 环境变量中配置，不要把密钥写在镜像里。
# 以下仅为占位声明，实际值由集成中心托管注入。
#
# ⚠️ secret 是小程序最高权限凭证，只放服务端环境变量，
#    不要写进客户端代码或提交到仓库。
# 命名与集成中心注入保持一致（appKey / secret）；本地起容器时也可用旧名 prodAppKey / appSecret。
ENV offerId=""
ENV appKey=""
ENV appId=""
ENV secret=""
ENV notifyFormat="json"

# 唯一的联调闸门（on / off）：
#   on  → 订单归属 / iOS 退款问询按 fail closed 校验，生产态
#   off → 「本地查不到订单」时放行查单、放过退款（仅本地联调）
# 不设即 on。⚠️ 不要改成 off —— 镜像一旦这么部署，任何人都能查别人的单、
# 已发货订单会被 Apple 建议退款。云上 + off 会直接拒绝启动（见 app.js）。
ENV XPAY_GUARD=on

COPY package*.json /app/

RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

RUN npm install

COPY . /app

CMD ["npm", "start"]
