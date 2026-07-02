#!/bin/bash
# 本地测试 / Local tests (Tier 0 + Tier 1)
# 不依赖 CloudBase 环境 / Does not require a CloudBase environment.
#
# Usage:
#   ./test-local.sh [--tier=0|1|all] [--only a,b] [--skip c,d]

set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib-common.sh"

show_help() {
    cat <<EOF
test-local.sh - 本地测试 / Local tests
Options:
  --tier=0|1|all   选择执行哪一层 / Pick tier(s). Default: all
  --only LIST      只跑指定函数（逗号分隔）/ Only run these functions
  --skip LIST      跳过指定函数（逗号分隔）/ Skip these functions
  --dry-run        仅打印计划，不执行 / Print plan without executing
  -h, --help       显示帮助
EOF
}

parse_args_only_skip "$@"
rc=$?
if [ $rc -eq 99 ]; then show_help; exit 0; fi

require_cmd python3 || exit 1
require_cmd curl || exit 1

names="$(matrix_filter_only_skip "$ONLY" "$SKIP")"

# ============================================================================
# Tier 0：静态检查 / Static checks
# ============================================================================
run_tier0() {
    log_step "Tier 0 静态检查 / Static checks"
    local name dir type lang cfg cfg_example bs entry
    while IFS= read -r name; do
        [ -z "$name" ] && continue
        dir="$CF_ROOT/$name"
        type="$(matrix_field "$name" type)"
        lang="$(matrix_field "$name" lang)"

        cfg="$dir/cloudbaserc.json"
        cfg_example="$dir/cloudbaserc.json.example"
        if [ -f "$cfg" ]; then
            if python3 -c "import json; json.load(open('$cfg'))" 2>/dev/null; then
                report_add "$name" "tier0:json" ok "cloudbaserc.json valid"
            else
                report_add "$name" "tier0:json" fail "cloudbaserc.json invalid"
            fi
        elif [ -f "$cfg_example" ]; then
            report_add "$name" "tier0:json" skip "only example exists"
        else
            report_add "$name" "tier0:json" fail "missing cloudbaserc.json"
        fi

        if [ "$type" = "http" ]; then
            bs="$dir/scf_bootstrap"
            if [ -f "$bs" ]; then
                if [ -x "$bs" ]; then
                    report_add "$name" "tier0:bootstrap" ok "scf_bootstrap +x"
                else
                    report_add "$name" "tier0:bootstrap" fail "scf_bootstrap not executable"
                fi
            else
                report_add "$name" "tier0:bootstrap" fail "scf_bootstrap missing"
            fi
        fi

        case "$lang" in
            nodejs)
                entry="$dir/index.js"
                if [ -f "$entry" ]; then
                    if command -v node >/dev/null 2>&1; then
                        if node --check "$entry" >/dev/null 2>&1; then
                            report_add "$name" "tier0:lint" ok "node --check"
                        else
                            report_add "$name" "tier0:lint" fail "node --check failed"
                        fi
                    else
                        report_add "$name" "tier0:lint" skip "node not installed"
                    fi
                fi
                ;;
            python)
                if [ -f "$dir/main.py" ]; then entry="$dir/main.py"
                elif [ -f "$dir/app.py" ]; then entry="$dir/app.py"
                elif [ -f "$dir/index.py" ]; then entry="$dir/index.py"
                else entry=""
                fi
                if [ -n "$entry" ]; then
                    if python3 -m py_compile "$entry" 2>/dev/null; then
                        report_add "$name" "tier0:lint" ok "py_compile $(basename "$entry")"
                    else
                        report_add "$name" "tier0:lint" fail "py_compile failed"
                    fi
                fi
                ;;
            php)
                entry=""
                for cand in "$dir/index.php" "$dir/router.php" "$dir/public/index.php"; do
                    [ -f "$cand" ] && { entry="$cand"; break; }
                done
                if [ -n "$entry" ]; then
                    if command -v php >/dev/null 2>&1; then
                        if php -l "$entry" >/dev/null 2>&1; then
                            report_add "$name" "tier0:lint" ok "php -l $(basename "$entry")"
                        else
                            report_add "$name" "tier0:lint" fail "php -l failed"
                        fi
                    else
                        report_add "$name" "tier0:lint" skip "php not installed"
                    fi
                fi
                ;;
            go)
                entry="$dir/main.go"
                if [ -f "$entry" ]; then
                    if command -v go >/dev/null 2>&1; then
                        if (cd "$dir" && go vet ./... >/dev/null 2>&1); then
                            report_add "$name" "tier0:lint" ok "go vet"
                        else
                            report_add "$name" "tier0:lint" warn "go vet warnings (run manually)"
                        fi
                    else
                        report_add "$name" "tier0:lint" skip "go not installed"
                    fi
                fi
                ;;
            java)
                if [ -d "$dir/src" ]; then
                    if command -v javac >/dev/null 2>&1; then
                        local tmpout
                        tmpout="$(mktemp -d)"
                        if (find "$dir/src" -name '*.java' -print0 | xargs -0 javac -d "$tmpout" >/dev/null 2>&1); then
                            report_add "$name" "tier0:lint" ok "javac compile"
                        else
                            report_add "$name" "tier0:lint" warn "javac needs full classpath; use mvn package"
                        fi
                        rm -rf "$tmpout"
                    else
                        report_add "$name" "tier0:lint" skip "javac not installed"
                    fi
                fi
                ;;
        esac
    done <<< "$names"
}

# ============================================================================
# Tier 1：本地启动检查 / Local runtime checks
# ============================================================================
run_one_http_local() {
    local name="$1" dir="$CF_ROOT/$1"
    local prepare local_start port http_path http_status http_keys
    prepare="$(matrix_field "$name" prepare)"
    local_start="$(matrix_field "$name" localStart)"
    port="$(matrix_field "$name" localPort)"; port="${port:-9000}"
    http_path="$(matrix_field "$name" http.path)"; http_path="${http_path:-/}"
    http_status="$(matrix_field "$name" http.expectStatus)"; http_status="${http_status:-200}"
    http_keys="$(matrix_field "$name" http.expectContains)"

    if [ -z "$local_start" ]; then
        report_add "$name" "tier1:http" skip "no localStart defined"
        return 0
    fi

    if port_in_use "$port"; then
        report_add "$name" "tier1:http" fail "port $port already in use, stop other process first"
        return 1
    fi

    if [ "$DRY_RUN" = "1" ]; then
        log_info "[dry-run] cd $dir && ${prepare:+$prepare && }$local_start"
        report_add "$name" "tier1:http" skip "dry-run"
        return 0
    fi

    log_info "[$name] preparing"
    if [ -n "$prepare" ]; then
        if ! (cd "$dir" && bash -lc "$prepare") >/tmp/cf-prepare.log 2>&1; then
            report_add "$name" "tier1:http" warn "prepare failed (see /tmp/cf-prepare.log) — likely missing local toolchain"
            return 0
        fi
    fi

    log_info "[$name] starting: $local_start (port $port)"
    local log_file
    log_file="$(mktemp -t cf-$name.XXXXXX.log)"
    ( cd "$dir" && bash -lc "$local_start" ) >"$log_file" 2>&1 &
    local pid=$!

    if ! wait_port_ready "$port" 20; then
        kill "$pid" 2>/dev/null || true
        report_add "$name" "tier1:http" fail "service did not listen on $port (log: $log_file)"
        return 1
    fi

    local body status
    status=$(curl -sS -o /tmp/cf-body.txt -w "%{http_code}" --max-time 8 "http://127.0.0.1:$port$http_path" || echo "000")
    body="$(cat /tmp/cf-body.txt)"

    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true

    if [ "$status" != "$http_status" ]; then
        report_add "$name" "tier1:http" fail "HTTP $status (want $http_status); log: $log_file"
        return 1
    fi

    if [ -n "$http_keys" ] && [ "$http_keys" != "[]" ]; then
        local ok=1 key
        while read -r key; do
            [ -z "$key" ] && continue
            if ! grep -q -- "$key" <<< "$body"; then ok=0; fi
        done < <(python3 -c "import json,sys; [print(x) for x in json.loads(sys.argv[1])]" "$http_keys")
        if [ $ok -eq 1 ]; then
            report_add "$name" "tier1:http" ok "HTTP $status & body contains keys"
        else
            report_add "$name" "tier1:http" fail "HTTP $status but body missing keys; got: $(head -c 200 <<<"$body")"
            return 1
        fi
    else
        report_add "$name" "tier1:http" ok "HTTP $status"
    fi
}

run_one_scf_local() {
    local name="$1" dir="$CF_ROOT/$1" lang
    lang="$(matrix_field "$name" lang)"
    case "$lang" in
        nodejs)
            if [ ! -f "$dir/index.js" ]; then
                report_add "$name" "tier1:scf" skip "no index.js"
                return 0
            fi
            if ! command -v node >/dev/null 2>&1; then
                report_add "$name" "tier1:scf" skip "node not installed"
                return 0
            fi
            if [ "$DRY_RUN" = "1" ]; then
                report_add "$name" "tier1:scf" skip "dry-run"
                return 0
            fi
            local params
            params="$(matrix_field "$name" invoke.params)"; params="${params:-{}}"
            local out
            out=$(cd "$dir" && node -e "
              const fn = require('./index.js');
              const event = $params;
              const ctx = { requestId: 'test', sse: () => ({ on(){}, send(){return true;}, end(){}, closed: false }) };
              Promise.resolve()
                .then(() => Promise.resolve(typeof fn.main === 'function' ? fn.main(event, ctx) : (fn.exports && fn.exports.main && fn.exports.main(event, ctx))))
                .then((r) => { try { console.log(JSON.stringify(r)); } catch(e) { console.log(String(r)); } })
                .catch((e) => { console.error('ERR', e && e.message); process.exit(2); });
            " 2>&1) || {
                report_add "$name" "tier1:scf" warn "invoke threw (likely needs cloud env): $(head -c 120 <<<"$out")"
                return 0
            }
            report_add "$name" "tier1:scf" ok "invoked; out: $(head -c 120 <<<"$out")"
            ;;
        python)
            if [ ! -f "$dir/index.py" ]; then
                report_add "$name" "tier1:scf" skip "no index.py"
                return 0
            fi
            if [ "$DRY_RUN" = "1" ]; then
                report_add "$name" "tier1:scf" skip "dry-run"
                return 0
            fi
            local out
            out=$(cd "$dir" && python3 -c "
import importlib.util, json
spec = importlib.util.spec_from_file_location('mod', 'index.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
handler = getattr(m, 'main_handler', None) or getattr(m, 'main', None)
print(handler({}, {}) if handler else 'NO_HANDLER')
" 2>&1) || {
                report_add "$name" "tier1:scf" warn "invoke threw: $(head -c 120 <<<"$out")"
                return 0
            }
            report_add "$name" "tier1:scf" ok "invoked; out: $(head -c 120 <<<"$out")"
            ;;
        *)
            report_add "$name" "tier1:scf" skip "no local mock for $lang"
            ;;
    esac
}

run_tier1() {
    log_step "Tier 1 本地运行检查 / Local runtime checks"
    local name type deployable
    while IFS= read -r name; do
        [ -z "$name" ] && continue
        type="$(matrix_field "$name" type)"
        deployable="$(matrix_field "$name" deployable)"

        if [ "$deployable" = "false" ]; then
            report_add "$name" "tier1" skip "$(matrix_field "$name" skipReason)"
            continue
        fi

        if [ "$type" = "http" ]; then
            run_one_http_local "$name"
        else
            run_one_scf_local "$name"
        fi
    done <<< "$names"
}

# ============================================================================
# Main
# ============================================================================
case "$TIER" in
    0) run_tier0 ;;
    1) run_tier1 ;;
    all|"") run_tier0; run_tier1 ;;
    *) log_fail "Unknown --tier=$TIER"; exit 2 ;;
esac

report_print
