# Go 云托管（CloudBase Run）模板

基于 Go 语言实现的云托管 helloworld 示例，通过 Docker 容器部署到 CloudBase Run。

## 项目结构

```
go-helloworld/
├── main.go          # 入口：HTTP 服务，监听 8080 端口
├── go.mod           # Go 模块定义
├── Dockerfile       # 容器构建文件
└── README*.md       # 说明文档
```

## 快速开始

```bash
# 本地运行
go run main.go
# 访问 http://localhost:8080

# 或通过 Docker 运行
docker build -t go-helloworld .
docker run -p 8080:8080 go-helloworld
```

## 部署到 CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```
