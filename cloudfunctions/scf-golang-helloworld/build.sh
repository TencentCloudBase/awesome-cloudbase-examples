#!/bin/bash

# SCF Golang HelloWorld 构建脚本

echo "开始构建 SCF Golang HelloWorld..."

# 设置环境变量
export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0

# 下载依赖
echo "下载依赖..."
go mod tidy

# 编译
echo "编译中..."
go build -o main main.go

if [ $? -eq 0 ]; then
    echo "✅ 编译成功！"
    echo "生成的二进制文件: main"
    
    # 创建部署包
    echo "创建部署包..."
    zip -r scf-golang-helloworld.zip main
    
    if [ $? -eq 0 ]; then
        echo "✅ 部署包创建成功: scf-golang-helloworld.zip"
        echo "文件大小: $(ls -lh scf-golang-helloworld.zip | awk '{print $5}')"
    else
        echo "❌ 部署包创建失败"
        exit 1
    fi
else
    echo "❌ 编译失败"
    exit 1
fi

echo "构建完成！"