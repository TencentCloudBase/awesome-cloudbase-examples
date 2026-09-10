#!/bin/bash
# scf-java-helloworld 构建脚本
# scf-java-helloworld build script
#
# 产出 / Outputs:
#   ./scf-java-helloworld-1.0.0.jar   # fat jar，部署到 SCF Java8 运行时
#
# 部署 cloudbaserc：handler=example.Hello::mainHandler

set -euo pipefail
cd "$(dirname "$0")"

echo "[scf-java-helloworld] Maven package (skip tests)..."
mvn -q -DskipTests=true clean package

# 拷贝到模板根目录（packer 只 zip 根目录的产物，不进 target/）
cp -f target/scf-java-helloworld-1.0.0.jar ./scf-java-helloworld-1.0.0.jar

ls -lh scf-java-helloworld-1.0.0.jar
echo "[scf-java-helloworld] Build OK."
