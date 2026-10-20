#!/bin/bash
#
# cloudbaserc.json 的 {{env.X}} 占位符 ←→ .env 键名 一致性检查
#
# 为什么需要这个检查：
#   CLI 部署时按 .env 解析 {{env.X}}。名字对不上（哪怕是大小写差异）
#   不会报错，而是写入【空值】，把云函数的环境变量覆盖成空 ——
#   现象是「部署成功但运行时才炸」：
#     41004 appsecret missing / 41002 appid missing / 缺少 secret
#
# 用法：
#   bash check_env_keys.sh [cloudbaserc.json] [.env]
#   不带参数时默认检查 xpay-common 模板
#
# 只读，不修改任何文件；只打印变量名与值长度，不打印值。

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_DIR="$(cd "$SCRIPT_DIR/../../../functions/xpay-common" && pwd)"

CBC="${1:-$DEFAULT_DIR/cloudbaserc.json}"
ENV_FILE="${2:-$DEFAULT_DIR/.env}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo "=== cloudbaserc 占位符 ↔ .env 键名一致性检查 ==="
echo "cloudbaserc : $CBC"
echo ".env        : $ENV_FILE"
echo

if [ ! -f "$CBC" ]; then
    printf "${RED}✗${NC} 找不到 %s\n" "$CBC"
    exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
    printf "${RED}✗${NC} 找不到 %s\n" "$ENV_FILE"
    exit 1
fi

# 1) cloudbaserc 里引用的全部环境变量名（去重）
KEYS=$(grep -oE '\{\{env\.[A-Za-z0-9_]+\}\}' "$CBC" \
    | sed -E 's/\{\{env\.([A-Za-z0-9_]+)\}\}/\1/' \
    | sort -u)

if [ -z "$KEYS" ]; then
    printf "${YELLOW}!${NC} cloudbaserc.json 里没有任何 {{env.X}} 占位符\n"
fi

missing=0
empty=0

while IFS= read -r key; do
    [ -n "$key" ] || continue

    line=$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | head -1 || true)
    if [ -z "$line" ]; then
        printf "${RED}✗${NC} %-18s .env 里没有这个键 —— 部署时会写成空值\n" "$key"
        missing=$((missing + 1))
        continue
    fi

    val="${line#*=}"
    if [ -z "$val" ]; then
        printf "${YELLOW}!${NC} %-18s 键存在但值为空\n" "$key"
        empty=$((empty + 1))
    else
        printf "${GREEN}✓${NC} %-18s 已配置 (长度 %s)\n" "$key" "${#val}"
    fi
done <<< "$KEYS"

# 2) 反向检查：.env 里有、但没被占位符引用的键（多半是名字写错了）
ENV_KEYS=$(grep -oE '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" \
    | sed -E 's/^[[:space:]]*//; s/=$//' \
    | sort -u)

unused=""
while IFS= read -r key; do
    [ -n "$key" ] || continue
    if ! echo "$KEYS" | grep -qx "$key"; then
        unused="$unused $key"
    fi
done <<< "$ENV_KEYS"

if [ -n "$unused" ]; then
    echo
    printf "${YELLOW}!${NC} .env 中未被占位符引用的键（可能是名字写错了）：%s\n" "$unused"
fi

echo
echo "=== 结果 ==="
if [ "$missing" -gt 0 ]; then
    printf "${RED}%s 个占位符在 .env 里找不到对应键${NC} —— 部署会把云函数环境变量覆盖成空值。\n" "$missing"
    echo "修法：让两边的名字逐字一致（占位符 {{env.foo}} ↔ .env 里的 foo=）。"
    exit 1
fi

printf "${GREEN}占位符与 .env 键名全部对得上${NC}"
if [ "$empty" -gt 0 ]; then
    printf "（%s 个键存在但值为空，确认是否符合预期）" "$empty"
fi
echo
exit 0
