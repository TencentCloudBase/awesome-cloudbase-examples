#!/bin/bash
#
# xpay-common 运行环境变量检查脚本
#
# ⚠️ 检查的是【当前 shell 进程】里已生效的环境变量，**不读 .env 文件**。
#    本地直接跑必然全红，需要先把 .env 加载进环境：
#
#      cd integration/cloudbase-virtualpay/functions/xpay-common
#      set -a; source .env; set +a
#      bash ../../skill/cloudbase-xpay/scripts/validate_env.sh
#
#    只想校验 cloudbaserc 占位符与 .env 键名是否对齐，用 check_env_keys.sh。
#
# 只检查是否配置，不打印敏感值。

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo "=== xpay-common 环境变量检查 ==="
echo

missing=0
warn=0

check_required() {
    local name=$1
    local desc=$2
    local val="${!name:-}"
    if [ -z "$val" ]; then
        printf "${RED}✗${NC} %-16s 未配置  (%s)\n" "$name" "$desc"
        missing=$((missing + 1))
    else
        # 只打印长度，不打印值（避免密钥泄露到日志）
        printf "${GREEN}✓${NC} %-16s 已配置  (长度 %s)\n" "$name" "${#val}"
    fi
}

check_optional() {
    local name=$1
    local desc=$2
    if [ -z "${!name:-}" ]; then
        printf "${YELLOW}·${NC} %-16s 未配置  (%s，可选)\n" "$name" "$desc"
        warn=$((warn + 1))
    else
        # 同上：只打印长度，避免把白名单之类的值刷进日志
        local val="${!name}"
        printf "${GREEN}✓${NC} %-16s 已配置  (长度 %s)\n" "$name" "${#val}"
    fi
}

# 变量名兼容：优先集成中心注入名，回退本地/旧名
# 用法：resolve appKey prodAppKey
resolve() {
    local primary=$1 legacy=$2
    if [ -n "${!primary:-}" ]; then
        echo "$primary"
    elif [ -n "${!legacy:-}" ]; then
        echo "$legacy"
    else
        echo "$primary"
    fi
}

check_required "offerId"      "虚拟支付商户号"
check_required "appId"        "小程序 AppID"
check_required "$(resolve secret appSecret)"     "换取 sessionKey 必需"
check_required "$(resolve appKey prodAppKey)"    "支付签名密钥"

echo
check_optional "notifyFormat"   "json / xml，默认 json"

echo

# 一致性校验
if [ -n "${notifyFormat:-}" ] && [ "$notifyFormat" != "json" ] && [ "$notifyFormat" != "xml" ]; then
    printf "${RED}✗${NC} notifyFormat 取值非法：%s（只能是 json 或 xml）\n" "$notifyFormat"
    missing=$((missing + 1))
fi

echo "=== 结果 ==="
if [ "$missing" -gt 0 ]; then
    printf "${RED}缺失必填项 %s 个${NC}，下单会失败。\n" "$missing"
    echo "参考：references/template-onboarding/env-config.md"
    exit 1
fi
printf "${GREEN}必填项齐备${NC}"
if [ "$warn" -gt 0 ]; then
    printf "，%s 个可选项使用默认值" "$warn"
fi
echo
exit 0
