#!/bin/bash
# 远端部署 + 调用测试 / Deploy + invoke tests (Tier 2)
# 依赖：已 tcb login，并通过环境变量 ENV_ID 指定环境。
#       ENV_ID 也可写在 scripts/.env 中（参考 .env.example），脚本会自动加载。
#
# Usage:
#   # 推荐：cp .env.example .env 后填写 ENV_ID，再执行
#   # Recommended: copy .env.example to .env, fill in ENV_ID, then run
#   ./test-deploy.sh                     # 部署 + 调用，不清理
#   ./test-deploy.sh --only http-nodejs-koa
#   ./test-deploy.sh --skip http-php-laravel,scf-nodejs-wxpay-product
#   ./test-deploy.sh --prefix test-      # 用前缀重命名后再部署，避免覆盖
#   ./test-deploy.sh --cleanup           # 部署+调用后再自动清理 service + function
#   ./test-deploy.sh --clean-up          # 只清理（来源 = 本仓库 cloudfunctions/ 子目录 + .env::PREFIX）
#   ./test-deploy.sh --dry-run           # 仅打印命令

set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib-common.sh"

show_help() {
    cat <<EOF
test-deploy.sh - 远端部署 + 调用 + 清理 / Deploy + invoke + cleanup
Options:
  --only LIST     仅处理这些函数（逗号分隔）/ Only run these functions
  --skip LIST     跳过这些函数（逗号分隔）/ Skip these functions
  --prefix STR    在部署/清理时给函数名加前缀（不修改源文件）
                  Apply a name prefix at deploy/cleanup time (source files untouched)
  --cleanup       部署+调用结束后自动清理 HTTP service + 函数
                  After deploy & invoke, also delete HTTP service + function
  --clean-up      只执行清理（来源 = 本仓库 cloudfunctions/ 子目录 + .env::PREFIX），不部署不调用
                  Only run cleanup (sources = local cloudfunctions/ subdirs + .env::PREFIX); skip deploy/invoke
  --dry-run       仅打印命令，不执行 / Print commands without executing
  -h, --help      显示帮助
Environment:
  ENV_ID          CloudBase 环境 ID（必填，也可写在 scripts/.env）
                  CloudBase env id (required; may also be set in scripts/.env)
EOF
}

parse_args_only_skip "$@"
rc=$?
if [ $rc -eq 99 ]; then show_help; exit 0; fi

if [ -z "${ENV_ID:-}" ]; then
    log_fail "请先 export ENV_ID 或在 scripts/.env 中设置 ENV_ID"
    log_fail "Please export ENV_ID or set ENV_ID in scripts/.env (see .env.example)"
    exit 2
fi
require_cmd tcb || { log_fail "请先 npm install -g @cloudbase/cli"; exit 1; }
require_cmd python3 || exit 1
require_cmd curl || exit 1

# 检查登录状态
if ! tcb env list >/dev/null 2>&1; then
    log_fail "tcb 未登录或环境不可访问，请先执行 'tcb login'"
    exit 2
fi

names="$(matrix_filter_only_skip "$ONLY" "$SKIP")"

# ---- 工具 / Helpers -----------------------------------------------------
tcb_run() {
    # 包装 tcb 调用，支持 dry-run + 自动重试（exit code 5 重试一次）
    if [ "$DRY_RUN" = "1" ]; then
        log_info "[dry-run] tcb $*"
        return 0
    fi
    tcb "$@"
    local code=$?
    if [ $code -eq 5 ]; then
        log_warn "tcb cloud API error (exit 5), retrying in 5s..."
        sleep 5
        tcb "$@"
        code=$?
    fi
    return $code
}

# 备份并改写 cloudbaserc.json 的 functions[].name（如有 prefix）
# 同时写入 functions[].dir="." 让 CLI 用 cloudbaserc.json 所在目录作为函数源码目录，
# 而不是默认的 functionRoot + name（否则改名后 CLI 会去找一个不存在的子目录）。
patch_name() {
    local dir="$1" old_name="$2" new_name="$3"
    if [ "$old_name" = "$new_name" ]; then return 0; fi
    python3 - "$dir/cloudbaserc.json" "$old_name" "$new_name" <<'PY'
import json, sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    data = json.load(f)
for fn in data.get('functions', []):
    if fn.get('name') == old:
        fn['name'] = new
        # 显式指定源码目录为当前目录，绕过 functionRoot+name 默认拼接
        fn['dir'] = '.'
with open(path, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
PY
}

# 为 HTTP 函数创建访问服务路径 / Create HTTP access service for an HTTP function
# 等价于：tcb service create -e <env> -p /<name> -f <name>
# CloudBase 必须先建访问路径，HTTP 域名才能解析到该函数；同名 service 已存在时忽略错误。
#
# 返回值 / Return code:
#   0  - 新建成功，调用方应等待网关路由传播
#   2  - 已存在（复用），无需额外等待
#   其它 - 失败
ensure_http_service() {
    local deploy_name="$1"
    local service_path="/$deploy_name"
    if [ "$DRY_RUN" = "1" ]; then
        log_info "[dry-run] tcb service create -e $ENV_ID -p $service_path -f $deploy_name"
        return 0
    fi
    local out
    out=$(tcb service create -e "$ENV_ID" -p "$service_path" -f "$deploy_name" 2>&1)
    local code=$?
    if [ $code -eq 0 ]; then
        log_ok "[$deploy_name] HTTP service ready: ${service_path}"
        return 0
    fi
    # 已存在的情况按"路径已被占用 / already exists / 重复"的关键字判定
    if echo "$out" | grep -Eqi 'already|exist|重复|占用|已存在'; then
        log_info "[$deploy_name] HTTP service already exists at ${service_path}; reusing"
        return 2
    fi
    log_warn "[$deploy_name] tcb service create failed (exit=$code): $(echo "$out" | head -c 200)"
    return $code
}

# 删除 HTTP 访问服务（按函数名）/ Delete all HTTP access services bound to a function
delete_http_service() {
    local deploy_name="$1"
    if [ "$DRY_RUN" = "1" ]; then
        log_info "[dry-run] tcb service delete -e $ENV_ID --name $deploy_name"
        return 0
    fi
    local out
    out=$(tcb service delete -e "$ENV_ID" --name "$deploy_name" 2>&1)
    local code=$?
    if [ $code -eq 0 ]; then
        log_info "  service deleted: --name $deploy_name"
        return 0
    fi
    # 未绑定 / 不存在 等价于 already clean，不算错误
    # "not found" semantics: treat as already clean
    if echo "$out" | grep -Eqi 'not.*found|未找到|没有匹配|不存在|no.*service|没有'; then
        log_info "  service: no binding found for $deploy_name (already clean)"
        return 0
    fi
    # 真错误：打印最后一行（CLI 的 spinner 输出会有控制字符，截取最后一行最干净）
    local last
    last=$(echo "$out" | tr -d '\r' | grep -v '^$' | tail -n 1)
    log_warn "  service delete returned exit=$code: $(echo "$last" | head -c 200)"
    return 0
}

# 删除函数本身 / Delete the function itself
# CLI v3.3 已经移除 --force；改用 --yes 跳过交互确认。
# CLI v3.3 removed --force; use --yes to skip the interactive confirmation instead.
delete_function() {
    local deploy_name="$1"
    if [ "$DRY_RUN" = "1" ]; then
        log_info "[dry-run] tcb fn delete $deploy_name --yes -e $ENV_ID"
        return 0
    fi
    local out code
    out=$(tcb fn delete "$deploy_name" --yes -e "$ENV_ID" 2>&1)
    code=$?
    # 兼容旧版本：如果 --yes 不被识别，回退到 --force
    # Backward compatibility: if --yes is rejected, try --force
    if echo "$out" | grep -Eqi "unknown option .*--yes"; then
        out=$(tcb fn delete "$deploy_name" --force -e "$ENV_ID" 2>&1)
        code=$?
    fi
    if [ $code -eq 0 ]; then
        log_info "  function deleted: $deploy_name"
        return 0
    fi
    # 不存在 == 已清理
    if echo "$out" | grep -Eqi 'not.*found|不存在|no.*function|没有'; then
        log_info "  function: $deploy_name does not exist (already clean)"
        return 0
    fi
    local last
    last=$(echo "$out" | tr -d '\r' | grep -v '^$' | tail -n 1)
    log_warn "  fn delete returned exit=$code: $(echo "$last" | head -c 200)"
    return 0
}

# 部署单个函数（含 prepare、改名、deploy、invoke、可选 cleanup）
deploy_one() {
    local name="$1" dir="$CF_ROOT/$1"
    local deployable prepare type
    deployable="$(matrix_field "$name" deployable)"
    if [ "$deployable" = "false" ]; then
        report_add "$name" "tier2:deploy" skip "$(matrix_field "$name" skipReason)"
        return 0
    fi
    prepare="$(matrix_field "$name" prepare)"
    type="$(matrix_field "$name" type)"
    local deploy_name="$name"
    if [ -n "$PREFIX" ]; then deploy_name="${PREFIX}${name}"; fi

    log_info "[$name] preparing"
    if [ -n "$prepare" ]; then
        if [ "$DRY_RUN" = "1" ]; then
            log_info "[dry-run] (cd $dir && $prepare)"
        else
            if ! (cd "$dir" && bash -lc "$prepare") >/tmp/cf-prepare.log 2>&1; then
                report_add "$name" "tier2:prepare" warn "prepare failed (see /tmp/cf-prepare.log); skipping deploy"
                return 0
            fi
        fi
    fi

    # 临时改名（如有 prefix），部署完恢复
    if [ "$DRY_RUN" != "1" ] && [ -n "$PREFIX" ]; then
        cp "$dir/cloudbaserc.json" "$dir/cloudbaserc.json.bak"
        patch_name "$dir" "$name" "$deploy_name"
    fi

    log_info "[$name] deploying as '$deploy_name'"
    local deploy_log
    deploy_log="$(mktemp)"
    # 注意：tcb fn deploy --yes 在部分函数部署失败时仍会 exit 0；
    # 必须同时检查输出里的「失败: N 个」/「部署失败」文本，否则会误判成功。
    # Note: `tcb fn deploy --yes` may exit 0 even when some functions fail in batch mode.
    # We must scan stdout for "失败: N" / "部署失败" markers to detect real failures.
    ( cd "$dir" && tcb_run fn deploy --yes -e "$ENV_ID" ) 2>&1 | tee "$deploy_log"
    local code="${PIPESTATUS[0]}"

    # 恢复 cloudbaserc.json
    if [ "$DRY_RUN" != "1" ] && [ -n "$PREFIX" ] && [ -f "$dir/cloudbaserc.json.bak" ]; then
        mv "$dir/cloudbaserc.json.bak" "$dir/cloudbaserc.json"
    fi

    # 1) 进程退出码非 0 → 直接判失败
    if [ "$code" -ne 0 ]; then
        local reason
        reason="$(grep -E '部署失败|失败:|✖|error|Error' "$deploy_log" | head -n 3 | tr '\n' ' ' | head -c 200)"
        report_add "$name" "tier2:deploy" fail "tcb fn deploy exit=$code: ${reason:-no detail}"
        rm -f "$deploy_log"
        return 1
    fi
    # 2) 进程退出 0 但输出里有 "失败: N 个" 且 N>0，或包含「部署失败」字样 → 视为失败
    if grep -Eq '失败:[[:space:]]*[1-9][0-9]*[[:space:]]*个' "$deploy_log" \
       || grep -Eq '\[.*\] 部署失败' "$deploy_log"; then
        local reason
        reason="$(grep -E '部署失败|失败:|✖|runtime|error|Error' "$deploy_log" | head -n 5 | tr '\n' ' ' | head -c 300)"
        report_add "$name" "tier2:deploy" fail "tcb 输出含部署失败: ${reason:-no detail}"
        rm -f "$deploy_log"
        return 1
    fi
    rm -f "$deploy_log"
    report_add "$name" "tier2:deploy" ok "deployed as $deploy_name"

    # HTTP 函数：在 HTTP 访问服务中注册路径
    # HTTP function: register access path so the gateway routes to it as an HTTP function
    if [ "$type" = "http" ]; then
        ensure_http_service "$deploy_name"
        local svc_rc=$?
        # 仅在「新建」路径时等待网关路由传播；「复用已存在」无需等待。
        # Wait only when newly created; skip wait when reusing an existing service.
        if [ $svc_rc -eq 0 ] && [ "$DRY_RUN" != "1" ]; then
            local wait_sec="${HTTP_SERVICE_WAIT_SEC:-15}"
            log_info "[$deploy_name] HTTP service 新建，等待 ${wait_sec}s 让网关路由生效... / Waiting ${wait_sec}s for gateway to propagate"
            sleep "$wait_sec"
        fi
    fi

    # 调用验证
    invoke_one "$name" "$deploy_name"

    if [ "$CLEANUP" = "1" ] && [ "$DRY_RUN" != "1" ]; then
        cleanup_one "$name" "$deploy_name"
    fi
}

# 清理单个函数（先删 service，再删 function）
cleanup_one() {
    local name="$1" deploy_name="$2"
    local type
    type="$(matrix_field "$name" type)"
    log_info "[$name] cleanup: removing HTTP service and function '$deploy_name'"
    if [ "$type" = "http" ]; then
        delete_http_service "$deploy_name"
    fi
    delete_function "$deploy_name"
    report_add "$name" "tier2:cleanup" ok "service + function removed ($deploy_name)"
}

# 调用单个函数
invoke_one() {
    local name="$1" deploy_name="$2"
    local type http_path http_keys params keys body status
    type="$(matrix_field "$name" type)"
    if [ "$type" = "http" ]; then
        http_path="$(matrix_field "$name" http.path)"; http_path="${http_path:-/}"
        http_keys="$(matrix_field "$name" http.expectContains)"
        local url="https://${ENV_ID}.service.tcloudbase.com/${deploy_name}${http_path}"
        if [ "$DRY_RUN" = "1" ]; then
            log_info "[dry-run] curl $url"
            report_add "$name" "tier2:invoke" skip "dry-run"
            return 0
        fi
        # 访问服务路径在 service create 后会有 5~60s 生效延迟 + 函数冷启动；最多重试 8 次（≈ 60s 总等待）
        # The HTTP access path takes 5-60s to propagate after `tcb service create`,
        # plus function cold-start; retry up to 8 times (~ 60s total wait).
        local curl_err curl_exit
        status="000"; body=""
        for attempt in 1 2 3 4 5 6 7 8; do
            curl_err="$(mktemp)"
            status=$(curl -sS -o /tmp/cf-body.txt -w "%{http_code}" \
                          --max-time 25 --retry 0 "$url" 2>"$curl_err")
            curl_exit=$?
            body="$(cat /tmp/cf-body.txt 2>/dev/null || true)"
            # 仅保留最后 3 位数字，过滤可能的 stderr 杂音
            status=$(echo "$status" | tail -c 4 | tr -cd '0-9')
            [ -z "$status" ] && status="000"
            log_info "[$name] curl attempt=$attempt status=$status exit=$curl_exit url=$url"
            if [ "$status" = "200" ] || [ "$status" = "202" ]; then
                rm -f "$curl_err"
                break
            fi
            # 前 3 次 5s 间隔，之后 10s 间隔，给冷启动+路径传播更多时间
            if [ $attempt -lt 8 ]; then
                if [ $attempt -le 3 ]; then sleep 5; else sleep 10; fi
            fi
        done
        if [ "$status" != "200" ] && [ "$status" != "202" ]; then
            local diag=""
            if [ -s "$curl_err" ]; then diag="; curl_stderr: $(head -c 160 "$curl_err")"; fi
            report_add "$name" "tier2:invoke" fail \
                "HTTP $status (curl exit=$curl_exit) from $url; body: $(head -c 120 <<<"$body")${diag}"
            log_warn "[$name] 诊断提示 / hints:"
            log_warn "  - 检查 HTTP 访问服务总开关：tcb service switch -e $ENV_ID  （交互式）"
            log_warn "  - 检查访问鉴权是否开启：tcb service auth switch -e $ENV_ID"
            log_warn "  - 检查路径绑定情况：tcb service list -e $ENV_ID"
            log_warn "  - 检查函数日志：tcb fn log $deploy_name -e $ENV_ID"
            rm -f "$curl_err"
            return 1
        fi
        rm -f "$curl_err" 2>/dev/null || true
        local ok=1
        if [ -n "$http_keys" ] && [ "$http_keys" != "[]" ]; then
            local key
            while read -r key; do
                [ -z "$key" ] && continue
                grep -q -- "$key" <<< "$body" || ok=0
            done < <(python3 -c "import json,sys; [print(x) for x in json.loads(sys.argv[1])]" "$http_keys")
        fi
        if [ $ok -eq 1 ]; then
            report_add "$name" "tier2:invoke" ok "HTTP $status & body keys ok ($url)"
        else
            report_add "$name" "tier2:invoke" warn "HTTP $status but body missing keys"
        fi
    else
        # SCF 事件型
        params="$(matrix_field "$name" invoke.params)"
        # 注意：bash 的 ${var:-{}} 在某些版本下会把右大括号当作默认值闭合，
        # 导致 params 末尾多一个 '}'，让 tcb fn invoke 报 "--params 参数不是有效的 JSON 字符串"。
        # 用显式判空替代。/ Avoid the bash brace-expansion bug: use explicit if-else.
        if [ -z "$params" ]; then params='{}'; fi
        if [ "$DRY_RUN" = "1" ]; then
            log_info "[dry-run] tcb fn invoke $deploy_name --params '$params' -e $ENV_ID"
            report_add "$name" "tier2:invoke" skip "dry-run"
            return 0
        fi
        local tmp
        tmp="$(mktemp)"
        if tcb fn invoke "$deploy_name" --params "$params" -e "$ENV_ID" >"$tmp" 2>&1; then
            keys="$(matrix_field "$name" expectInvokeContains)"
            local ok=1
            if [ -n "$keys" ] && [ "$keys" != "[]" ]; then
                local key
                while read -r key; do
                    [ -z "$key" ] && continue
                    grep -q -- "$key" "$tmp" || ok=0
                done < <(python3 -c "import json,sys; [print(x) for x in json.loads(sys.argv[1])]" "$keys")
            fi
            if [ $ok -eq 1 ]; then
                report_add "$name" "tier2:invoke" ok "invoke ok"
            else
                report_add "$name" "tier2:invoke" warn "invoke ok but missing expected keys"
            fi
        else
            report_add "$name" "tier2:invoke" warn "invoke threw (likely needs business data): $(head -c 120 "$tmp")"
        fi
        rm -f "$tmp"
    fi
}

# --clean-up 模式：扫描 cloudfunctions/*/cloudbaserc.json 拿到函数列表（目录名），
# 结合 .env 中的 ENV_ID 与 PREFIX 计算 deploy_name=PREFIX+目录名，先删 service 再删 function。
# --clean-up mode: enumerate functions by scanning cloudfunctions/*/cloudbaserc.json
# (directory names = function names), combine with ENV_ID + PREFIX from .env, compute
# deploy_name = PREFIX + dir_name, then delete HTTP service first, function next.
run_cleanup_only() {
    log_step "Tier 2 仅清理 / --clean-up against ENV_ID=$ENV_ID (prefix='${PREFIX:-<empty>}')"
    if [ -z "${PREFIX:-}" ]; then
        log_warn "PREFIX 为空 / PREFIX is empty"
        log_warn "  将按原函数名（无前缀）尝试删除，可能与生产函数同名。"
        log_warn "  Will attempt deletion with original (un-prefixed) names — these may match production."
        log_warn "  如需删除测试函数，请使用：--prefix test-  或在 scripts/.env 设置 TEST_NAME_PREFIX=test-"
        log_warn "  To target test functions, pass --prefix test- or set TEST_NAME_PREFIX=test- in scripts/.env"
    fi

    # 扫描当前仓库 cloudfunctions/ 下含 cloudbaserc.json 的子目录，目录名即函数名
    # Enumerate function names by scanning cloudfunctions/*/cloudbaserc.json
    local local_names
    local_names=$(find "$CF_ROOT" -mindepth 2 -maxdepth 2 -name cloudbaserc.json -type f 2>/dev/null \
        | sed -e "s|^$CF_ROOT/||" -e 's|/cloudbaserc.json$||' \
        | sort)

    if [ -z "$local_names" ]; then
        log_warn "未在 $CF_ROOT 下扫描到任何 cloudbaserc.json，没有可清理的目标"
        log_warn "No cloudbaserc.json found under $CF_ROOT; nothing to clean"
        return 0
    fi

    # 应用 --only / --skip 过滤
    # Apply --only / --skip filters on the directory names
    if [ -n "${ONLY:-}" ]; then
        local_names=$(printf "%s\n" "$local_names" | awk -v only=",$ONLY," 'index(only, "," $0 ",") > 0')
    fi
    if [ -n "${SKIP:-}" ]; then
        local_names=$(printf "%s\n" "$local_names" | awk -v skip=",$SKIP," 'index(skip, "," $0 ",") == 0')
    fi

    local total
    total=$(printf "%s\n" "$local_names" | sed '/^$/d' | wc -l | tr -d ' ')
    log_info "扫描到 $total 个本地函数目录 / Found $total local function director(ies)"
    log_info "目标清理列表 / planned targets:"
    while IFS= read -r name; do
        [ -z "$name" ] && continue
        local deploy_name="$name"
        if [ -n "${PREFIX:-}" ]; then deploy_name="${PREFIX}${name}"; fi
        printf "  - %s  (deploy_name=%s)\n" "$name" "$deploy_name"
    done <<< "$local_names"

    # 二次确认（dry-run 跳过）/ Double-confirm unless in dry-run
    if [ "$DRY_RUN" != "1" ] && [ "$total" != "0" ]; then
        printf "\n确认清理以上 %s 个函数及其 HTTP 服务路径？(yes/no) " "$total"
        local ans
        read -r ans
        case "$ans" in
            yes|YES|y|Y) : ;;
            *) log_warn "已取消 / cancelled"; return 0 ;;
        esac
    fi

    while IFS= read -r name; do
        [ -z "$name" ] && continue
        local deploy_name="$name"
        if [ -n "${PREFIX:-}" ]; then deploy_name="${PREFIX}${name}"; fi
        cleanup_one "$name" "$deploy_name"
    done <<< "$local_names"
}

# ============================================================================
# Main
# ============================================================================
if [ "$CLEANUP_ONLY" = "1" ]; then
    run_cleanup_only
    report_print
    exit $?
fi

log_step "Tier 2 部署 + 调用 / Deploy + invoke against ENV_ID=$ENV_ID"
while IFS= read -r name; do
    [ -z "$name" ] && continue
    deploy_one "$name"
done <<< "$names"

report_print
