#!/bin/bash
# 通用工具 / Shared helpers for test scripts
# 用法：在脚本顶部 `source "$(dirname "$0")/lib-common.sh"`

set -u

# ---- 颜色 / Color helpers ------------------------------------------------
if [ -t 1 ]; then
    C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
    C_BLUE=$'\033[34m'; C_DIM=$'\033[2m'; C_RESET=$'\033[0m'
else
    C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_DIM=""; C_RESET=""
fi

log_info()  { printf "%s[INFO]%s  %s\n" "$C_BLUE"   "$C_RESET" "$*"; }
log_ok()    { printf "%s[ OK ]%s  %s\n" "$C_GREEN"  "$C_RESET" "$*"; }
log_warn()  { printf "%s[WARN]%s  %s\n" "$C_YELLOW" "$C_RESET" "$*"; }
log_fail()  { printf "%s[FAIL]%s  %s\n" "$C_RED"    "$C_RESET" "$*"; }
log_skip()  { printf "%s[SKIP]%s  %s\n" "$C_DIM"    "$C_RESET" "$*"; }
log_step()  { printf "\n%s== %s ==%s\n" "$C_BLUE"   "$*" "$C_RESET"; }

# ---- 路径 / Path helpers -------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CF_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MATRIX_FILE="$SCRIPT_DIR/test-matrix.json"
REPORT_FILE="$SCRIPT_DIR/.last-report.json"
ENV_FILE="$SCRIPT_DIR/.env"

# ---- .env 加载 / Load .env file -----------------------------------------
# 自动加载 scripts/.env 中的环境变量；命令行已经 export 的同名变量优先生效。
# Auto-load env vars from scripts/.env; vars already exported on the CLI win.
load_env_file() {
    local file="${1:-$ENV_FILE}"
    if [ ! -f "$file" ]; then
        return 0
    fi
    # 临时关闭 set -u 以支持间接展开 / temporarily disable nounset for indirect expansion
    local _had_u=0
    case "$-" in *u*) _had_u=1; set +u ;; esac

    local line key val current
    # 仅读取形如 KEY=VALUE 的非注释、非空行
    # Only KEY=VALUE lines are parsed; comments and blank lines are skipped
    while IFS= read -r line || [ -n "$line" ]; do
        # 去除行首空白 / strip leading whitespace
        line="${line#"${line%%[![:space:]]*}"}"
        [ -z "$line" ] && continue
        case "$line" in
            \#*) continue ;;
            "export "*) line="${line#export }" ;;
        esac
        case "$line" in
            *=*) : ;;
            *) continue ;;
        esac
        key="${line%%=*}"
        val="${line#*=}"
        # 去除尾部空白与可选引号 / trim trailing whitespace & optional surrounding quotes
        val="${val%"${val##*[![:space:]]}"}"
        case "$val" in
            \"*\") val="${val#\"}"; val="${val%\"}" ;;
            \'*\') val="${val#\'}"; val="${val%\'}" ;;
        esac
        # 命令行已显式 export 的变量不覆盖 / do not override pre-exported vars
        eval "current=\${$key-__UNSET__}"
        if [ "$current" = "__UNSET__" ] || [ -z "$current" ]; then
            export "$key=$val"
        fi
    done < "$file"

    [ "$_had_u" = "1" ] && set -u
    return 0
}

# source 此文件时立即尝试加载 .env / Auto-load on source
load_env_file

# ---- 依赖检查 / Dependency check ----------------------------------------
require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log_fail "缺少命令 / Missing command: $1"
        return 1
    fi
}

# ---- 矩阵解析 / Matrix helpers ------------------------------------------
# 使用 python3 解析 JSON，避免对 jq 的依赖
# Uses python3 to parse JSON, avoiding a hard jq dependency
matrix_names() {
    python3 -c "
import json
with open('$MATRIX_FILE') as f:
    data = json.load(f)
print('\n'.join(f['name'] for f in data['functions']))
"
}

matrix_field() {
    # $1 = name, $2 = field path (dot path), 不存在时输出空
    python3 -c "
import json
with open('$MATRIX_FILE') as f:
    data = json.load(f)
items = [x for x in data['functions'] if x['name'] == '$1']
if not items:
    raise SystemExit(0)
val = items[0]
for p in '$2'.split('.'):
    if not p:
        continue
    if isinstance(val, dict) and p in val:
        val = val[p]
    else:
        raise SystemExit(0)
if isinstance(val, (dict, list)):
    print(json.dumps(val, ensure_ascii=False))
elif val is None:
    pass
elif isinstance(val, bool):
    print('true' if val else 'false')
else:
    print(val)
"
}

matrix_filter_only_skip() {
    # $1 = 逗号分隔 only, $2 = 逗号分隔 skip
    local only="${1:-}" skip="${2:-}"
    local all
    all="$(matrix_names)"
    if [ -n "$only" ]; then
        printf "%s\n" "$all" | awk -v only=",$only," 'index(only, "," $0 ",") > 0'
    else
        if [ -n "$skip" ]; then
            printf "%s\n" "$all" | awk -v skip=",$skip," 'index(skip, "," $0 ",") == 0'
        else
            printf "%s\n" "$all"
        fi
    fi
}

# ---- 端口管理 / Port helpers --------------------------------------------
port_in_use() {
    # 返回 0 表示占用 / returns 0 when in use
    if command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:"$1" -sTCP:LISTEN -nP >/dev/null 2>&1
    else
        # macOS without lsof, fall back to nc
        nc -z 127.0.0.1 "$1" >/dev/null 2>&1
    fi
}

wait_port_ready() {
    # $1 = port, $2 = timeout seconds (default 15)
    local port="$1" t="${2:-15}" i=0
    while [ $i -lt $t ]; do
        if port_in_use "$port"; then return 0; fi
        sleep 1
        i=$((i + 1))
    done
    return 1
}

# ---- 报告 / Reporting ----------------------------------------------------
REPORT_ROWS=()
report_add() {
    # $1 name $2 phase $3 status (ok|fail|warn|skip) $4 detail
    REPORT_ROWS+=("$1|$2|$3|$4")
}

report_print() {
    local total=${#REPORT_ROWS[@]}
    if [ "$total" -eq 0 ]; then
        log_warn "no entries recorded"
        return
    fi
    local ok=0 fail=0 warn=0 skip=0
    printf "\n%s%-40s %-12s %-8s %s%s\n" "$C_BLUE" "NAME" "PHASE" "STATUS" "DETAIL" "$C_RESET"
    printf "%s\n" "------------------------------------------------------------------------------------------"
    for row in "${REPORT_ROWS[@]}"; do
        local n p s d
        IFS='|' read -r n p s d <<< "$row"
        local color="$C_RESET"
        case "$s" in
            ok)   color="$C_GREEN"; ok=$((ok+1)) ;;
            fail) color="$C_RED";   fail=$((fail+1)) ;;
            warn) color="$C_YELLOW"; warn=$((warn+1)) ;;
            skip) color="$C_DIM";   skip=$((skip+1)) ;;
        esac
        printf "%-40s %-12s %s%-8s%s %s\n" "$n" "$p" "$color" "$s" "$C_RESET" "$d"
    done
    printf "\nTotals: %s%d ok%s, %s%d warn%s, %s%d skip%s, %s%d fail%s (total %d)\n" \
        "$C_GREEN" "$ok" "$C_RESET" \
        "$C_YELLOW" "$warn" "$C_RESET" \
        "$C_DIM" "$skip" "$C_RESET" \
        "$C_RED" "$fail" "$C_RESET" \
        "$total"

    # 写 JSON 报告
    python3 - "$REPORT_FILE" <<PY
import json, sys, os, datetime
path = sys.argv[1]
rows = []
raw = """${REPORT_ROWS[@]+$(printf '%s\n' "${REPORT_ROWS[@]}")}"""
for line in raw.splitlines():
    line = line.strip()
    if not line:
        continue
    name, phase, status, detail = (line.split('|', 3) + ['','','',''])[:4]
    rows.append({'name': name, 'phase': phase, 'status': status, 'detail': detail})
report = {
    'generatedAt': datetime.datetime.utcnow().isoformat() + 'Z',
    'total': len(rows),
    'rows': rows,
}
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(f"Report written to {path}")
PY

    if [ "$fail" -gt 0 ]; then
        return 1
    fi
    return 0
}

parse_args_only_skip() {
    # 解析 --only / --skip / --tier 参数，输出 export 语句供 eval
    ONLY=""
    SKIP=""
    TIER="all"
    DRY_RUN=0
    CLEANUP=0
    CLEANUP_ONLY=0
    PREFIX="${TEST_NAME_PREFIX:-}"
    while [ $# -gt 0 ]; do
        case "$1" in
            --only) ONLY="$2"; shift 2 ;;
            --only=*) ONLY="${1#*=}"; shift ;;
            --skip) SKIP="$2"; shift 2 ;;
            --skip=*) SKIP="${1#*=}"; shift ;;
            --tier) TIER="$2"; shift 2 ;;
            --tier=*) TIER="${1#*=}"; shift ;;
            --dry-run) DRY_RUN=1; shift ;;
            --cleanup) CLEANUP=1; shift ;;
            # --clean-up：只清理，不部署不调用 / Only run cleanup (no deploy/invoke)
            --clean-up) CLEANUP_ONLY=1; CLEANUP=1; shift ;;
            --prefix) PREFIX="$2"; shift 2 ;;
            --prefix=*) PREFIX="${1#*=}"; shift ;;
            -h|--help) return 99 ;;
            *) log_warn "未知参数 / unknown arg: $1"; shift ;;
        esac
    done
    export ONLY SKIP TIER DRY_RUN CLEANUP CLEANUP_ONLY PREFIX
}
