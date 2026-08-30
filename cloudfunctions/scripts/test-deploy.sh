#!/bin/bash
# Wrapper: 设置 CF_ROOT 后委托给共享部署验证脚本
# Sets CF_ROOT then delegates to the shared deploy-verify tool
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export CF_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
exec "$SCRIPT_DIR/../../tools/deploy-verify/test-deploy.sh" "$@"
