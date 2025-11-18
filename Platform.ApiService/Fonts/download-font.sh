#!/bin/bash

# 下载 DejaVu Sans Bold 字体文件
# 用于修复验证码字体加载问题

set -e

FONT_DIR="$(cd "$(dirname "$0")" && pwd)"
FONT_FILE="DejaVuSans-Bold.ttf"
FONT_PATH="${FONT_DIR}/${FONT_FILE}"

echo "开始下载 DejaVu Sans Bold 字体文件..."
echo "目标目录: ${FONT_DIR}"
echo "目标文件: ${FONT_PATH}"

# 删除旧文件（如果存在）
if [ -f "${FONT_PATH}" ]; then
    echo "删除旧文件: ${FONT_PATH}"
    rm -f "${FONT_PATH}"
fi

# 方法1: 从 GitHub 原始文件下载（推荐）
echo "尝试从 GitHub 下载..."
if curl -L -f -o "${FONT_PATH}" "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf"; then
    echo "✓ 从 GitHub 下载成功"
else
    echo "✗ 从 GitHub 下载失败，尝试备用源..."
    
    # 方法2: 从 SourceForge 下载
    if curl -L -f -o "${FONT_PATH}" "https://sourceforge.net/projects/dejavu/files/dejavu/2.37/dejavu-fonts-ttf-2.37.tar.bz2/download"; then
        echo "✓ 从 SourceForge 下载压缩包成功，正在解压..."
        cd "${FONT_DIR}"
        tar -xjf dejavu-fonts-ttf-2.37.tar.bz2 2>/dev/null || true
        if [ -f "dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf" ]; then
            cp "dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf" "${FONT_PATH}"
            rm -rf dejavu-fonts-ttf-2.37* 2>/dev/null || true
            echo "✓ 解压并复制成功"
        else
            echo "✗ 解压失败"
            exit 1
        fi
    else
        echo "✗ 所有下载源都失败"
        exit 1
    fi
fi

# 验证文件
if [ ! -f "${FONT_PATH}" ]; then
    echo "✗ 文件不存在"
    exit 1
fi

FILE_SIZE=$(stat -f%z "${FONT_PATH}" 2>/dev/null || stat -c%s "${FONT_PATH}" 2>/dev/null || echo "0")
echo "文件大小: ${FILE_SIZE} bytes"

if [ "${FILE_SIZE}" -lt 100000 ]; then
    echo "⚠ 警告: 文件大小异常小（正常应该 > 100KB），可能下载不完整"
fi

# 检查文件类型
if command -v file >/dev/null 2>&1; then
    FILE_TYPE=$(file "${FONT_PATH}" 2>/dev/null || echo "unknown")
    echo "文件类型: ${FILE_TYPE}"
    
    if echo "${FILE_TYPE}" | grep -qi "TrueType\|font"; then
        echo "✓ 文件类型验证通过"
    else
        echo "⚠ 警告: 文件类型可能不正确"
    fi
fi

echo ""
echo "✓ 字体文件下载完成: ${FONT_PATH}"
echo "请重新构建项目以确保字体文件被正确包含。"

