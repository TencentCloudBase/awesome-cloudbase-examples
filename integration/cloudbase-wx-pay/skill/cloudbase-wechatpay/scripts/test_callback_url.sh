#!/usr/bin/env bash
# test_callback_url.sh - 回调 URL 连通性测试
#
# 用法:
#   bash test_callback_url.sh <URL> [--json]
#   bash test_callback_url.sh https://example.com/callback [--json]
#
# 检查项:
#   1. DNS 解析是否成功
#   2. 是否为 HTTPS
#   3. TCP 连接是否可达
#   4. HTTP 状态码
#   5. 响应时间
#
# 退出码: 0=正常, 1=有问题, 2=参数错误

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "用法: $0 <URL> [--json]"
    echo ""
    echo "测试微信支付回调 URL 的连通性。"
    echo ""
    echo "参数:"
    echo "  URL     要测试的完整 HTTPS URL"
    echo "  --json  JSON 格式输出"
    echo ""
    echo "示例:"
    echo "  $0 https://<YOUR_HTTP_DOMAIN>/cloudrun/v1/pay/unifiedOrderTrigger"
    echo "  $0 https://integration-xxx.tcloudbase.com/wechatpay/order --json"
    exit 2
}

# 参数解析
URL=""
OUTPUT_FORMAT="human"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            OUTPUT_FORMAT="json"
            shift
            ;;
        -*)
            usage
            ;;
        *)
            if [[ -z "$URL" ]]; then
                URL="$1"
            else
                usage
            fi
            shift
            ;;
    esac
done

# 校验 URL
if [[ -z "$URL" ]]; then
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo '{"ok":false,"error":"缺少 URL 参数","exit_code":2}'
    else
        echo "❌ 错误: 请提供要测试的 URL" >&2
        usage
    fi
    exit 2
fi

# 提取协议和域名
PROTO="$(echo "$URL" | grep -oP '^\K(https?)')"
DOMAIN="$(echo "$URL" | grep -oP '^\w+://\K[^/]+')"

if [[ -z "$DOMAIN" ]]; then
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo "{\"ok\":false,\"error\":\"无法从 URL 提取域名: $URL\",\"exit_code\":1}"
    else
        echo "❌ 错误: 无法从 URL 提取域名: $URL"
    fi
    exit 1
fi

# 初始化结果
ISSUES=()
CHECKS=()

# 检查 1: 协议必须是 HTTPS
if [[ "$PROTO" != "https" ]]; then
    ISSUES+=("协议不是 HTTPS (当前: ${PROTO:-无})")
else
    CHECKS+=("HTTPS 协议 ✓")
fi

# 检查 2: DNS 解析
DNS_RESULT=""
if command -v dig &>/dev/null; then
    DNS_RESULT=$(dig +short "$DOMAIN" +time=5 2>&1 || echo "DNS_FAILED")
elif command -v nslookup &>/dev/null; then
    DNS_RESULT=$(nslookup "$DOMAIN" 2>&1 | grep -A1 'Name:' | tail -1 | awk '{print $NF}' || echo "DNS_FAILED")
else
    DNS_RESULT=$(getent hosts "$DOMAIN" 2>&1 | awk '{print $1}' | head -1 || echo "DNS_FAILED")
fi

if [[ "$DNS_RESULT" == *"FAILED"* ]] || [[ -z "$DNS_RESULT" ]] || [[ "$DNS_RESULT" == *";"* ]]; then
    ISSUES+=("DNS 解析失败: $DOMAIN")
else
    CHECKS+=("DNS 解析成功 → $DNS_RESULT ✓")
fi

# 检查 3 & 4 & 5: HTTP 连通性（使用 curl）
HTTP_CODE=""
TIME_TOTAL=""

if command -v curl &>/dev/null; then
    CURL_OUTPUT=$(curl -sS -o /tmp/cb_test_resp.txt \
        -w "%{http_code}\n%{time_total}" \
        --connect-timeout 10 \
        -m 15 \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"resource":{"ciphertext":"test"}}' \
        "$URL" 2>&1) || true

    HTTP_CODE=$(echo "$CURL_OUTPUT" | head -1)
    TIME_TOTAL=$(echo "$CURL_OUTPUT" | tail -1)

    # 分类状态码
    case "$HTTP_CODE" in
        200|201|202|204)
            CHECKS+=("HTTP 状态码: $HTTP_CODE ✓")
            ;;
        400|404|405|422)
            ISSUES+=("HTTP 状态码: $HTTP_CODE（路由可能不存在或方法不对）")
            CHECKS+=("HTTP 连通但返回 $HTTP_CODE ⚠️")
            ;;
        401|403)
            # 回调路由如果开了鉴权会返回 401/403 —— 这是一个常见问题！
            ISSUES+=("HTTP 状态码: $HTTP_CODE（⚠️ 回调路由不应开启鉴权！）")
            CHECKS+=("HTTP 连通但被鉴权拦截 ($HTTP_CODE) ⚠️"
            ;;
        500|502|503|504)
            ISSUES+=("HTTP 状态码: $HTTP_CODE（服务端错误）")
            CHECKS+=("HTTP 连通但服务异常 ($HTTP_CODE) ✗"
            ;;
        000|"")
            ISSUES+=("连接失败: 无法建立 TCP 连接（可能是防火墙/安全组/域名不可达）")
            ;;
        *)
            ISSUES+=("HTTP 状态码: $HTTP_CODE（未知状态码）")
            ;;
    esac

    if [[ -n "$TIME_TOTAL" && "$TIME_TOTAL" != "0.000000" ]]; then
        TIME_MS=$(echo "$TIME_TOTAL * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "${TIME_TOTAL}s")
        CHECKS+=("响应时间: ~${TIME_MS}ms ✓")
    fi
else
    ISSUES+=("curl 不可用，无法测试 HTTP 连通性")
fi

# 输出结果
ISSUE_COUNT=${#ISSUES[@]}
OK=false
if [[ $ISSUE_COUNT -eq 0 ]]; then
    OK=true
fi

if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    # 构建 JSON 输出
    CHECKS_JSON=$(printf '%s\n' "${CHECKS[@]}" | jq -R . | jq -s . 2>/dev/null || echo "[]")
    ISSUES_JSON=$(printf '%s\n' "${ISSUES[@]}" | jq -R . | jq -s . 2>/dev/null || echo "[]")

    cat <<EOF
{
  "ok": $OK,
  "url": "$URL",
  "domain": "$DOMAIN",
  "protocol": "${PROTO:-N/A}",
  "dns_result": "${DNS_RESULT:-N/A}",
  "http_code": "${HTTP_CODE:-N/A}",
  "response_time_s": "${TIME_TOTAL:-N/A}",
  "check_count": ${#CHECKS[@]},
  "issue_count": $ISSUE_COUNT,
  "checks": $CHECKS_JSON,
  "issues": $ISSUES_JSON
}
EOF
else
    echo ""
    echo "==========================================="
    echo "  回调 URL 连通性测试: $URL"
    echo "==========================================="
    echo ""

    # 打印检查项
    for check in "${CHECKS[@]}"; do
        echo "  ✅ $check"
    done

    # 打印问题
    if [[ $ISSUE_COUNT -gt 0 ]]; then
        echo ""
        echo "  ❌ 发现 $ISSUE_COUNT 个问题:"
        echo ""
        for issue in "${ISSUES[@]}"; do
            echo "     • $issue"
        done
        echo ""
    fi

    # 总结
    if $OK; then
        echo -e "${GREEN}✅ 所有检查通过 — URL 可达${NC}"
    else
        echo -e "${RED}❌ 发现 $ISSUE_COUNT 个问题 — URL 可能不可用${NC}"
    fi
    echo ""
fi

# 清理临时文件
rm -f /tmp/cb_test_resp.txt

$OK && exit 0 || exit 1
