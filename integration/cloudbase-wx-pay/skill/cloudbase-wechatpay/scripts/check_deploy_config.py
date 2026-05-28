#!/usr/bin/env python3
"""
check_deploy_config.py - cloudbaserc.json 与 .env 一致性检查

检查 cloudbaserc.json 中的 envVariables 与 .env 文件是否一致，
以及 .env 中是否有 cloudbaserc.json 未声明的变量。

用法:
    python3 check_deploy_config.py /path/to/project [--json]
    python3 check_deploy_config.py /path/to/project/.env [--json]

退出码: 0=正常, 1=有问题, 2=参数错误
"""

import argparse
import json
import os
import re
import sys

REQUIRED_ENV_VARS = [
    "signMode", "appId", "merchantId", "merchantSerialNumber",
    "apiV3Key", "privateKey", "wxPayPublicKey", "wxPayPublicKeyId",
    "notifyURLPayURL",
]

OPTIONAL_ENV_VARS = [
    "notifyURLRefundsURL", "transferNotifyUrl", "corsAllowOrigin",
]


def load_env_file(env_path):
    """解析 .env 文件为字典"""
    env_vars = {}
    if not os.path.isfile(env_path):
        return None, f"文件不存在: {env_path}"

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
                if match:
                    key, value = match.groups()
                    env_vars[key] = value
    except Exception as e:
        return None, f"读取 .env 文件失败: {e}"

    return env_vars, None


def load_cloudbaserc(project_dir):
    """加载 cloudbaserc.json"""
    cbc_path = os.path.join(project_dir, "cloudbaserc.json")
    if not os.path.isfile(cbc_path):
        return None, None  # 不是错误，可能没有此文件（如云托管项目）

    try:
        with open(cbc_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        # 提取 envVariables（可能在函数级别或全局）
        env_vars = {}
        functions = config.get("functions", [])
        for func in functions:
            fev = func.get("envVariables", {})
            env_vars.update(fev)
        # 全局环境变量
        gev = config.get("envVariables", {})
        env_vars.update(gev)
        return env_vars if env_vars else {}, None
    except Exception as e:
        return None, f"读取 cloudbaserc.json 失败: {e}"


def validate_env_keys(env_vars):
    """检查必填键是否存在"""
    issues = []
    for key in REQUIRED_ENV_VARS:
        if key not in env_vars or not env_vars[key]:
            issues.append({
                "type": "missing_required",
                "key": key,
                "message": f"缺少必填变量: {key}",
            })
    return issues


def validate_sign_mode(env_vars):
    """检查 signMode 值"""
    sign_mode = env_vars.get("signMode", "")
    if sign_mode not in ("sdk", "gateway"):
        return [{
            "type": "invalid_value",
            "key": "signMode",
            "message": f"signMode 应为 'sdk' 或 'gateway'，当前值: '{sign_mode}'",
        }]
    return []


def validate_notify_urls(env_vars):
    """检查回调 URL 是否为 HTTPS"""
    url_keys = [
        "notifyURLPayURL", "notifyURLRefundsURL", "transferNotifyUrl"
    ]
    issues = []
    for key in url_keys:
        val = env_vars.get(key, "")
        if val and not val.startswith("https://"):
            issues.append({
                "type": "invalid_url",
                "key": key,
                "message": f"{key} 必须以 https:// 开头，当前值: {val[:30]}...",
            })
        if val and "?" in val.split("://", 1)[-1].split("/", 1)[0] if "://" in val else False:
            issues.append({
                "type": "url_with_params",
                "key": key,
                "message": f"{key} 不能带 ? 查询参数",
            })
    return issues


def compare_env_vs_cloudbaserc(env_vars, cbc_vars):
    """对比 .env 和 cloudbaserc 的差异"""
    if cbc_vars is None:
        return []

    issues = []
    env_keys = set(env_vars.keys())
    cbc_keys = set(cbc_vars.keys())

    # .env 有但 cloudbaserc 没有的
    only_in_env = env_keys - cbc_keys
    for key in sorted(only_in_env):
        issues.append({
            "type": "only_in_env",
            "key": key,
            "message": f"变量 '{key}' 在 .env 中存在但未在 cloudbaserc.json 中声明（部署时不会生效）",
        })

    # cloudbaserc 有但 .env 没有的
    only_in_cbc = cbc_keys - env_keys
    for key in sorted(only_in_cbc):
        issues.append({
            "type": "only_in_cloudbaserc",
            "key": key,
            "message": f"变量 '{key}' 在 cloudbaserc.json 中声明但 .env 中不存在（值为空或缺失）",
        })

    # 两边都有但值不同的
    common = env_keys & cbc_keys
    for key in sorted(common):
        env_val = env_vars.get(key, "")
        cbc_val = str(cbc_vars.get(key, ""))
        # 对于敏感信息只显示是否有值，不显示内容
        sensitive = ("privateKey" in key.lower() or "key" in key.lower()
                     or "secret" in key.lower() or "token" in key.lower())
        if env_val and cbc_val and env_val != cbc_val and not sensitive:
            issues.append({
                "type": "value_mismatch",
                "key": key,
                "message": f"'{key}' 值不一致 (.env='{env_val[:20]}...' vs cloudbaserc='{cbc_val[:20]}...')",
            })

    return issues


def check_gitignore(project_dir):
    """检查 .gitignore 是否包含 .env"""
    gitignore_path = os.path.join(project_dir, ".gitignore")
    if not os.path.isfile(gitignore_path):
        return [{"type": "warning", "message": "不存在 .gitignore 文件"}]

    try:
        with open(gitignore_path, "r") as f:
            content = f.read()
        has_env_ignore = any(
            line.strip() in (".env", ".env.*", "*.env")
            for line in content.splitlines()
            if line.strip() and not line.startswith("#")
        )
        if not has_env_ignore:
            return [{"type": "warning", "message": ".gitignore 未包含 .env 规则"}]
        return []
    except Exception as e:
        return [{"type": "warning", "message": f"无法读取 .gitignore: {e}"}]


def main():
    parser = argparse.ArgumentParser(
        description="检查 cloudbaserc.json 与 .env 一致性",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例:
  python3 check_deploy_config.py ./pay-common
  python3 check_deploy_config.py ./pay-common --json""",
    )
    parser.add_argument("path", help="项目目录路径或 .env 文件路径")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    args = parser.parse_args()

    target_path = args.path
    is_json = args.json

    # 确定是目录还是文件
    if os.path.isdir(target_path):
        project_dir = target_path
        env_path = os.path.join(target_path, ".env")
    elif os.path.isfile(target_path) and target_path.endswith(".env"):
        project_dir = os.path.dirname(target_path)
        env_path = target_path
    else:
        result = {
            "ok": False,
            "error": f"无效的路径: {target_path}",
            "issues": [],
        }
        print(json.dumps(result, ensure_ascii=False) if is_json else result["error"])
        return 2

    # 加载 .env
    env_vars, err = load_env_file(env_path)
    if err:
        print(json.dumps({"ok": False, "error": err}, ensure_ascii=False) if is_json else err)
        return 1

    # 加载 cloudbaserc
    cbc_vars, cbc_err = load_cloudbaserc(project_dir)
    if cbc_err:
        print(json.dumps({"ok": False, "error": cbc_err}, ensure_ascii=False) if is_json else cbc_err)
        return 1

    # 执行所有检查
    all_issues = []
    all_issues.extend(validate_env_keys(env_vars))
    all_issues.extend(validate_sign_mode(env_vars))
    all_issues.extend(validate_notify_urls(env_vars))

    if cbc_vars is not None:
        all_issues.extend(compare_env_vs_cloudbaserc(env_vars, cbc_vars))

    all_issues.extend(check_gitignore(project_dir))

    # 输出结果
    ok = len(all_issues) == 0
    result = {
        "ok": ok,
        "project": project_dir,
        "env_file": env_path,
        "has_cloudbaserc": cbc_vars is not None,
        "env_var_count": len(env_vars),
        "issue_count": len(all_issues),
        "issues": all_issues,
    }

    if is_json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"=== 部署配置检查: {project_dir} ===")
        print(f".env 变量数: {len(env_vars)}")
        if cbc_vars is not None:
            print(f"cloudbaserc 变量数: {len(cbc_vars)}")

        if ok:
            print("\n✅ 所有检查通过")
        else:
            print(f"\n❌ 发现 {len(all_issues)} 个问题:\n")
            for i, issue in enumerate(all_issues, 1):
                itype = issue.get("type", "")
                key = issue.get("key", "")
                msg = issue.get("message", "")
                icon = {"warning": "⚠️"}.get(itype, "❌")
                print(f"  {i}. [{icon}] {itype}: {msg}")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
