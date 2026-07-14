#!/bin/bash
# scf-go-helloworld 构建脚本
# scf-go-helloworld build script
#
# 用法 / Usage:
#   ./build.sh                # 就地产出 main 二进制；不再产 zip（zip 交给 templates/scripts/lib/packer.mjs 统一打）
#
# 产出 / Outputs:
#   ./main                    # Linux amd64 静态二进制（部署所需）

set -euo pipefail
cd "$(dirname "$0")"

echo "[scf-go-helloworld] Building (GOOS=linux GOARCH=amd64 CGO_ENABLED=0)..."

export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0

go mod tidy
go build -trimpath -ldflags="-s -w" -o main main.go

ls -lh main
echo "[scf-go-helloworld] Build OK."
