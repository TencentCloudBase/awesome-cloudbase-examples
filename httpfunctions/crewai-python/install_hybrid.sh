#!/bin/bash
set -e

echo "=== 安装 crewai-python 依赖（SCF Linux 兼容版）==="

# 清空并重建 env 目录
rm -rf env
mkdir -p env

# 检查 requirements.txt 是否存在
if [ ! -f "requirements.txt" ]; then
    echo "[错误] requirements.txt 文件不存在"
    exit 1
fi

echo ""
echo "步骤 1: 安装所有依赖（本地平台，包含传递依赖）..."
python3 -m pip install \
    -r requirements.txt \
    --target ./env \
    --upgrade

echo ""
echo "步骤 2: 检测所有包含非 Linux 二进制的包..."
# 查找所有二进制文件并检测是否为 ELF
NON_LINUX_PACKAGES=""
PROCESSED_DIRS=""
BINARY_FILES=$(find env -type f \( -name "*.so" -o -name "*.pyd" -o -name "*.dylib" \) 2>/dev/null)

if [ -n "$BINARY_FILES" ]; then
    echo "检测到的二进制文件:"
    
    for file in $BINARY_FILES; do
        # 检查是否为 ELF 格式
        if ! file "$file" 2>/dev/null | grep -q "ELF"; then
            echo "  [非 Linux] $file"
            # 提取目录名
            pkg_dir=$(echo "$file" | sed 's|^env/\([^/]*\)/.*|\1|')
            
            # 检查是否已处理过这个目录
            if [ -n "$pkg_dir" ] && [ "$pkg_dir" != "env" ] && ! echo "$PROCESSED_DIRS" | grep -q " $pkg_dir "; then
                PROCESSED_DIRS="$PROCESSED_DIRS $pkg_dir "
                
                # 方法1: 直接搜索匹配的 dist-info (大小写不敏感)
                dist_info=$(find env -maxdepth 1 -iname "${pkg_dir}*.dist-info" -type d 2>/dev/null | head -1)
                
                # 方法2: 如果找不到，通过 RECORD 文件反向查找
                if [ -z "$dist_info" ]; then
                    rel_path=$(echo "$file" | sed 's|^env/||')
                    dist_info=$(grep -l "^${rel_path}," env/*.dist-info/RECORD 2>/dev/null | sed 's|/RECORD$||' | head -1)
                fi
                
                if [ -n "$dist_info" ]; then
                    # 从 METADATA 文件读取 Name 字段
                    real_name=$(grep -E "^Name:" "$dist_info/METADATA" 2>/dev/null | sed 's/^Name: *//')
                    if [ -n "$real_name" ]; then
                        NON_LINUX_PACKAGES="$NON_LINUX_PACKAGES $real_name"
                    else
                        # 退回到目录名
                        NON_LINUX_PACKAGES="$NON_LINUX_PACKAGES $pkg_dir"
                    fi
                else
                    # 没有 dist-info，使用目录名
                    NON_LINUX_PACKAGES="$NON_LINUX_PACKAGES $pkg_dir"
                fi
            fi
        fi
    done
    
    # 去重并移除空行
    NON_LINUX_PACKAGES=$(echo "$NON_LINUX_PACKAGES" | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ')
    
    if [ -n "$NON_LINUX_PACKAGES" ]; then
        echo ""
        echo "需要重装为 Linux 版本的包:"
        echo "$NON_LINUX_PACKAGES" | tr ' ' '\n' | sed 's/^/  - /'
    fi
else
    echo "[提示] 未检测到二进制文件"
fi

echo ""
echo "步骤 3: 强制重装这些包为 Linux 版本..."
if [ -n "$NON_LINUX_PACKAGES" ]; then
    python3 -m pip install \
        $NON_LINUX_PACKAGES \
        --platform manylinux_2_17_x86_64 \
        --target ./env \
        --python-version 3.10 \
        --only-binary=:all: \
        --upgrade \
        --force-reinstall \
        --no-deps || echo "[警告] 部分包重装失败，继续..."
else
    echo "[跳过] 所有二进制已是 Linux 版本"
fi

echo ""
echo "步骤 3.5: 补充 Python 3.10 可能缺失的纯 Python 依赖..."
# 在 Python 3.13+ 环境，exceptiongroup 等包因内置而不安装，但 Python 3.10 需要
echo "检查并安装 exceptiongroup（Python 3.10 必需）..."
python3 -m pip install \
    exceptiongroup \
    --target ./env \
    --upgrade 2>&1 | grep -E "(Requirement already satisfied|Successfully installed)" || echo "[提示] 依赖检查完成"

echo ""
echo "步骤 4: 清理残留的非 Linux 二进制文件..."
CLEANED_COUNT=0
BINARY_FILES=$(find env -type f \( -name "*.so" -o -name "*.pyd" -o -name "*.dylib" \) 2>/dev/null)

if [ -n "$BINARY_FILES" ]; then
    for file in $BINARY_FILES; do
        if ! file "$file" 2>/dev/null | grep -q "ELF"; then
            echo "  删除: $file"
            rm -f "$file"
            CLEANED_COUNT=$((CLEANED_COUNT + 1))
        fi
    done
fi

if [ $CLEANED_COUNT -gt 0 ]; then
    echo "[完成] 已删除 $CLEANED_COUNT 个非 Linux 二进制文件"
else
    echo "[完成] 没有需要清理的非 Linux 二进制文件"
fi

echo ""
echo "=== 完成 ==="
echo "已安装的包数量: $(ls -1 env | wc -l)"
echo ""
echo "最终验证: 检查是否还有非 Linux 二进制文件..."
NON_ELF_COUNT=0
BINARY_FILES=$(find env -type f \( -name "*.so" -o -name "*.pyd" -o -name "*.dylib" \) 2>/dev/null)

if [ -n "$BINARY_FILES" ]; then
    for file in $BINARY_FILES; do
        if ! file "$file" 2>/dev/null | grep -q "ELF"; then
            echo "  [警告] 非 Linux 文件: $file"
            NON_ELF_COUNT=$((NON_ELF_COUNT + 1))
        fi
    done
fi

if [ $NON_ELF_COUNT -eq 0 ]; then
    echo "[完成] 所有二进制文件都是 Linux (ELF) 格式"
else
    echo "[警告] 还有 $NON_ELF_COUNT 个非 Linux 二进制文件"
fi

echo ""
echo "验证关键包:"
echo "- pydantic_core: $(ls env | grep -c '^pydantic_core' || echo '[失败]')"
echo "- numpy: $(ls env | grep -c '^numpy' || echo '[失败]')"
echo "- orjson: $(ls env | grep -c '^orjson' || echo '[失败]')"
echo "- pysqlite3: $(ls env | grep -c 'pysqlite3' || echo '[失败]')"
echo "- crewai: $(ls env | grep -c '^crewai$' || echo '[失败]')"
echo "- litellm: $(ls env | grep -c '^litellm' || echo '[失败]')"
echo ""
echo "[完成] 可以部署到 SCF 了！"
