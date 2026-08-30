#!/bin/bash
# Wrapper: 设置 CF_ROOT 后 source 共享函数库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CF_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/../../tools/deploy-verify/lib-common.sh"
