# 使用官方 Golang 镜像作为构建环境
FROM golang:1.24-alpine as builder

# 设置工作目录
WORKDIR /app

# 复制源代码
COPY . .

RUN go mod download


# 构建二进制文件
RUN CGO_ENABLED=0 GOOS=linux go build -mod=readonly -ldflags="-s -w" -v -o server

# 使用 alpine 作为最终镜像
FROM alpine:latest

# 安装基本工具和时区数据
RUN apk add --no-cache tzdata ca-certificates && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata


# 设置工作目录
WORKDIR /app

# 将构建好的二进制文件拷贝进镜像
COPY --from=builder /app/server /app/server

EXPOSE 80

# 启动 Web 服务
CMD ["/app/server"]