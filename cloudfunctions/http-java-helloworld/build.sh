#!/bin/bash
# http-java-helloworld 构建脚本
# http-java-helloworld build script
#
# 产出 / Outputs:
#   ./app.jar                         # 可执行 jar
#   ./scf_bootstrap                   # 已存在的启动脚本

set -euo pipefail
cd "$(dirname "$0")"

echo "[http-java-helloworld] Maven package (skip tests)..."
mvn -q -DskipTests=true clean package

cp -f target/app.jar ./app.jar
chmod +x scf_bootstrap 2>/dev/null || true

ls -lh app.jar
echo "[http-java-helloworld] Build OK."
