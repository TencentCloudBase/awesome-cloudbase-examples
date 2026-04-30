#!/usr/bin/env python3
"""
check_pem_format.py - PEM 私钥格式检查工具

用法:
    python3 check_pem_format.py '<PRIVATE_KEY_STRING>'
    python3 check_pem_format.py --file /path/to/pem/file.pem
    python3 check_pem_format.py --help

退出码:
    0 = 格式正确
    1 = 有问题
    2 = 参数错误

安全说明:
    - 不输出私钥原文到 stdout/stderr
    - 仅报告格式状态，不泄露密钥内容
"""

import argparse
import json
import sys
import re


def check_pem_string(pem_str: str) -> dict:
    """
    检查 PEM 字符串格式。

    Returns:
        dict with keys:
            valid (bool): 是否有效
            format_type (str): "literal_newline" | "escaped_newline" | "unknown" | "invalid"
            issues (list[str]): 发现的问题列表
            summary (str): 人类可读的摘要
    """
    issues = []
    
    if not pem_str or not pem_str.strip():
        return {
            "valid": False,
            "format_type": "empty",
            "issues": ["PEM string is empty"],
            "summary": "EMPTY: 输入为空",
        }

    stripped = pem_str.strip()
    
    # 检查 BEGIN/END 标记
    has_begin = bool(re.search(r'-----BEGIN.*?-----', stripped))
    has_end = bool(re.search(r'-----END.*?-----', stripped))
    
    if not has_begin:
        issues.append("缺少 BEGIN 标记 (如 -----BEGIN PRIVATE KEY-----)")
    if not has_end:
        issues.append("缺少 END 标记 (如 -----END PRIVATE KEY-----)")
    
    if not has_begin or not has_end:
        return {
            "valid": False,
            "format_type": "invalid",
            "issues": issues,
            "summary": f"INVALID: 缺少 PEM 头尾标记 ({len(issues)} 个问题)",
        }
    
    # 判断换行格式类型
    format_type = "unknown"
    
    # 情况1: 包含字面 \n（两个字符：反斜杠 + n）→ 这是 .env 中期望的正确格式
    if '\\n' in pem_str and '\n' not in pem_str:
        format_type = "escaped_newline"
        
        # 检查是否所有换行都是 \n 形式（即整个字符串在一行中）
        lines_by_escaped = pem_str.split('\\n')
        # 如果拆分后第一行包含 BEGIN 且最后一行包含 END，说明是正确的单行+转义格式
        
        # 检查是否有非法的真换行混入
        actual_newlines = pem_str.count('\n')
        if actual_newlines > 0:
            issues.append(f"混合了真换行(\\n, {actual_newlines}个) 和字面\\n转义，可能导致解析异常")
            
    # 情况2: 包含真换行符 → 多行格式
    elif '\n' in pem_str and '\\n' not in pem_str:
        format_type = "literal_newline"
        issues.append("使用真换行符而非 \\n 转义。在 .env 文件中应使用字面 \\n 表示换行")
        
    # 情况3: 两者都有 → 可能是混乱的混合
    elif '\\n' in pem_str and '\n' in pem_str:
        format_type = "mixed"
        issues.append("同时包含字面\\\\n 和真换行，格式不统一")

    # 检查 Base64 内容部分
    # 提取 BEGIN 和 END 之间的内容
    body_match = re.search(
        r'-----BEGIN[^-]*-----\s*(.*?)\s*-----END[^-]*-----',
        pem_str,
        re.DOTALL
    )
    
    if body_match:
        body = body_match.group(1)
        
        # 检查 body 长度
        # RSA 私钥通常在 1600-3000 字符范围（Base64 编码后）
        clean_body = body.replace('\\n', '').replace('\n', '').replace(' ', '').strip()
        body_len = len(clean_body)
        
        if body_len < 100:
            issues.append(f"PEM body 过短 ({body_len} 字符)，可能内容被截断或不完整")
        elif body_len > 10000:
            issues.append(f"PEM body 异常长 ({body_len} 字符)，可能包含了多余内容")
            
        # 检查是否只包含合法的 Base64 字符
        base64_invalid = re.sub(r'[A-Za-z0-9+/=\s\\\\]', '', clean_body)
        if base64_invalid:
            issues.append(f"PEM body 包含非 Base64 字符: {repr(base64_invalid[:20])}")
            
    # 检查常见私钥类型标识
    key_types = {
        'PRIVATE KEY': '通用私钥',
        'RSA PRIVATE KEY': 'RSA 私钥',
        'EC PRIVATE KEY': '椭圆曲线私钥',
    }
    detected_type = None
    for marker, name in key_types.items():
        if marker in pem_str.upper():
            detected_type = name
            break
    
    valid = len(issues) == 0
    
    if format_type == "escaped_newline":
        format_desc = "正确: 使用 \\n 转义（.env 期望格式）"
    elif format_type == "literal_newline":
        format_desc = "警告: 使用真换行符（.env 中需改为 \\n）"
    elif format_type == "mixed":
        format_desc = "错误: 混合格式（需统一为 \\n 转义）"
    else:
        format_desc = f"未知格式类型"

    type_info = f", 密钥类型: {detected_type}" if detected_type else ""
    
    return {
        "valid": valid,
        "format_type": format_type,
        "detected_key_type": detected_type,
        "issues": issues,
        "body_length": len(body_match.group(1).replace('\\n','').strip()) if body_match else 0,
        "summary": f"{format_desc}{type_info}" + (f", {len(issues)} 个问题" if issues else ""),
    }


def check_pem_file(file_path: str) -> dict:
    """从文件读取 PEM 内容并检查。"""
    try:
        with open(file_path, 'r') as f:
            content = f.read().strip()
        result = check_pem_string(content)
        result["source"] = f"file:{file_path}"
        return result
    except FileNotFoundError:
        return {"valid": False, "format_type": "error", "issues": [f"文件不存在: {file_path}"], "summary": f"FILE_NOT_FOUND: {file_path}"}
    except Exception as e:
        return {"valid": False, "format_type": "error", "issues": [f"读取文件失败: {e}"], "summary": f"READ_ERROR: {e}"}


def main():
    parser = argparse.ArgumentParser(
        description='Check PEM private key format for pay-common .env configuration',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 检查字符串形式的私钥
  python3 check_pem_format.py '-----BEGIN PRIVATE KEY-----\\nMIIEvQ...'

  # 检查 PEM 文件
  python3 check_pem_format.py --file apiclient_key.pem

  # JSON 输出（供程序调用）
  python3 check_pem_format.py --json '-----BEGIN PRIVATE KEY-----\\nMIIE...'
"""
    )
    parser.add_argument('input', nargs='?', help='PEM key string or use --file for file path')
    parser.add_argument('--file', '-f', dest='filepath', help='Read PEM from file instead of argument')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')
    parser.add_argument('--quiet', '-q', action='store_true', help='Only output exit code (no text)')
    
    args = parser.parse_args()
    
    # 确定输入源
    if args.filepath:
        result = check_pem_file(args.filepath)
    elif args.input:
        result = check_pem_string(args.input)
    else:
        parser.print_help()
        sys.exit(2)
    
    # 输出
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif not args.quiet:
        print(f"=== PEM Format Check ===")
        
        status_icon = "PASS" if result["valid"] else "FAIL"
        print(f"Status:   {status_icon}")
        print(f"Format:   {result.get('format_type', '?')}")
        if result.get('detected_key_type'):
            print(f"Key Type: {result['detected_key_type']}")
        if result.get('body_length'):
            print(f"Body Len: {result['body_length']} chars")
        print(f"Summary:  {result['summary']}")
        
        if result.get('issues'):
            print("\nIssues:")
            for issue in result['issues']:
                print(f"  - {issue}")
    
    sys.exit(0 if result["valid"] else 1)


if __name__ == '__main__':
    main()
