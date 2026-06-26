#!/usr/bin/env bash
# validate_env.sh - 校验 pay-common .env 配置完整性
# 用法: bash scripts/validate_env.sh /path/to/.env
# 退出码: 0=正常, 1=有问题, 2=参数错误

set -euo pipefail

# --- 颜色输出 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    cat <<EOF
Usage: bash validate_env.sh <.env_file_path>

Validate pay-common .env configuration completeness.

Options:
  --help     Show this help message
  --json     Output in JSON format (for programmatic use)

Exit codes:
  0  All checks passed
  1  Issues found
  2  Parameter error
EOF
}

OUTPUT_FORMAT="human"

# --- 参数解析 ---
if [[ $# -lt 1 ]]; then
    usage
    exit 2
fi

case "${1:-}" in
    --help|-h)
        usage
        exit 0
        ;;
    --json)
        OUTPUT_FORMAT="json"
        shift
        ;;
esac

ENV_FILE="$1"

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo '{"error": "file not found", "path": "'"$ENV_FILE"'" }'
    else
        echo -e "${RED}ERROR${NC}: File not found: $ENV_FILE"
    fi
    exit 2
fi

# --- 结果收集 ---
declare -a ERRORS=()
declare -a WARNINGS=()

# 加载 .env（不 export 到当前环境，避免污染）
# 读取每一行，跳过注释和空行
load_env_var() {
    local key="$1"
    # 使用 grep 提取值（处理等号后可能有的空格和引号）
    grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | sed "s/^${key}=//" | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//"
}

has_var() {
    grep -q "^${1}=" "$ENV_FILE" 2>/dev/null
}

# --- 检查项 ---

# 1. signMode 必填且合法
if has_var "signMode"; then
    SM=$(load_env_var "signMode")
    if [[ "$SM" != "sdk" && "$SM" != "gateway" ]]; then
        ERRORS+=("signMode='$SM' is invalid: must be 'sdk' or 'gateway'")
    fi
else
    ERRORS+=("signMode is REQUIRED but missing")
fi

# 2. 基础信息必填
for var in appId merchantId merchantSerialNumber apiV3Key; do
    if ! has_var "$var"; then
        ERRORS+=("$var is REQUIRED but missing")
    fi
done

# 3. 凭证必填
for var in privateKey wxPayPublicKey wxPayPublicKeyId; do
    if ! has_var "$var"; then
        ERRORS+=("$var is REQUIRED but missing")
    else
        VAL=$(load_env_var "$var")
        # 检查是否为空
        if [[ -z "$VAL" || "$VAL" == "''" || "$VAL" == '""' ]]; then
            ERRORS+=("$var is present but EMPTY")
        fi
    fi
done

# 4. 回调 URL 必填且必须是 HTTPS
for var in notifyURLPayURL notifyURLRefundsURL transferNotifyUrl; do
    if ! has_var "$var"; then
        ERRORS+=("$var is REQUIRED but missing")
    else
        URL=$(load_env_var "$var")
        if [[ "$URL" != https* ]]; then
            ERRORS+=("$var must be HTTPS, got: ${URL:0:30}...")
        fi
        if [[ "$URL" == *\?* ]]; then
            WARNINGS+=("$var contains query parameters (?), WeChat may reject callbacks")
        fi
        if [[ "$URL" == *localhost* ]]; then
            WARNINGS+=("$var points to localhost, not accessible for WeChat callbacks")
        fi
    fi
done

# 5. PEM 格式基本检查（privateKey 和 wxPayPublicKey）
for var in privateKey wxPayPublicKey; do
    if has_var "$var"; then
        VAL=$(load_env_var "$var")
        # 检查是否有 BEGIN/END 标记
        if [[ "$VAL" != *BEGIN*KEY* ]] || [[ "$VAL" != *END*KEY* ]]; then
            ERRORS+=("$var does not look like a valid PEM format (missing BEGIN/END markers)")
        fi
        # 检查是否包含 \n（字面换行标记）
        if [[ "$VAL" != *\\n* && "${#VAL}" -gt 100 ]]; then
            WARNINGS+=("$var is very long (${#VAL} chars) but contains no \\n line separators — might be real newlines instead of literal \\n")
        fi
    fi
done

# 6. appId 格式检查（应以 wx 开头）
if has_var "appId"; then
    APPID=$(load_env_var "appId")
    if [[ "$APPID" != wx* ]]; then
        WARNINGS+=("appId='$APPID' does not start with 'wx', verify it's correct")
    fi
fi

# 7. merchantId 应为数字
if has_var "merchantId"; then
    MID=$(load_env_var "merchantId")
    if ! [[ "$MID" =~ ^[0-9]+$ ]]; then
        ERRORS+=("merchantId='$MID' should be numeric (10 digits)")
    elif [[ ${#MID} -ne 10 ]]; then
        WARNINGS+=("merchantId length=${#MID}, expected 10 digits")
    fi
fi

# 8. apiV3Key 长度应为 32
if has_var "apiV3Key"; then
    KEY=$(load_env_var "apiV3Key")
    if [[ ${#KEY} -ne 32 ]]; then
        WARNINGS+=("apiV3Key length=${#KEY}, expected exactly 32 bytes")
    fi
fi

# 9. merchantSerialNumber 长度检查
if has_var "merchantSerialNumber"; then
    SN=$(load_env_var "merchantSerialNumber")
    if [[ ${#SN} -lt 20 ]]; then
        WARNINGS+=("merchantSerialNumber seems too short (${#SN} chars), expected ~40 hex chars")
    fi
fi

# 10. signMode 与回调 URL 一致性检查
if has_var "signMode" && has_var "notifyURLPayURL"; then
    SM=$(load_env_var "signMode")
    URL=$(load_env_var "notifyURLPayURL")
    if [[ "$SM" == "sdk" && "$URL" == *integration-* ]]; then
        ERRORS+=("signMode=sdk but notifyURLPayURL points to integration center ($URL) — mismatch!")
    elif [[ "$SM" == "gateway" && "$URL" != *integration-* && "$URL" != *tcloudbase.com*wechatpay* ]]; then
        WARNINGS+=("signMode=gateway but notifyURLPayURL does not look like an integration center URL ($URL) — verify it's correct")
    fi
fi

# --- 输出结果 ---
ERROR_COUNT=${#ERRORS[@]}
WARNING_COUNT=${#WARNINGS[@]}

if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    echo "{"
    echo "  \"status\": $([ $ERROR_COUNT -eq 0 ] && echo 'pass' || echo 'fail'),"
    echo "  \"errors\": ["
    for i in "${!ERRORS[@]}"; do
        COMMA=","
        [[ $i -eq $((${#ERRORS[@]} - 1)) ]] && COMMA=""
        echo "    \"${ERRORS[$i]}\"$COMMA"
    done
    echo "  ],"
    echo "  \"warnings\": ["
    for i in "${!WARNINGS[@]}"; do
        COMMA=","
        [[ $i -eq $((${#WARNINGS[@]} - 1)) ]] && COMMA=""
        echo "    \"${WARNINGS[$i]}\"$COMMA"
    done
    echo "  ],"
    echo "  \"error_count\": $ERROR_COUNT,"
    echo "  \"warning_count\": $WARNING_COUNT"
    echo "}"
else
    echo "=== pay-common .env Validation Report ==="
    echo "File: $ENV_FILE"
    echo ""

    if [[ $ERROR_COUNT -eq 0 && $WARNING_COUNT -eq 0 ]]; then
        echo -e "${GREEN}✅ All checks passed!${NC}"
        exit 0
    fi

    if [[ $ERROR_COUNT -gt 0 ]]; then
        echo -e "${RED}❌ Errors ($ERROR_COUNT):${NC}"
        for err in "${ERRORS[@]}"; do
            echo "   - $err"
        done
        echo ""
    fi

    if [[ $WARNING_COUNT -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Warnings ($WARNING_COUNT):${NC}"
        for warn in "${WARNINGS[@]}"; do
            echo "   - $warn"
        done
        echo ""
    fi

    if [[ $ERROR_COUNT -gt 0 ]]; then
        echo -e "${RED}Result: FAIL ($ERROR_COUNT errors, $WARNING_COUNT warnings)${NC}"
        exit 1
    else
        echo -e "${YELLOW}Result: PASS with warnings ($ERROR_COUNT errors, $WARNING_COUNT warnings)${NC}"
        exit 0
    fi
fi
