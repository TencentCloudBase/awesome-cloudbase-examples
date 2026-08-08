#!/bin/bash
# http-go-gin 构建脚本
# http-go-gin build script
#
# 产出 / Outputs:
#   ./main                    # Linux amd64 静态二进制

set -euo pipefail
cd "$(dirname "$0")"

echo "[http-go-gin] Building (GOOS=linux GOARCH=amd64 CGO_ENABLED=0)..."

export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0

go mod tidy
go build -trimpath -ldflags="-s -w" -o main main.go

chmod +x main scf_bootstrap 2>/dev/null || true

ls -lh main
echo "[http-go-gin] Build OK."
