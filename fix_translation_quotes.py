#!/usr/bin/env python3
"""
修复翻译文件中的单引号转义问题
遍历所有语言文件，修复未正确转义的单引号
"""

import os
import re
from pathlib import Path

BASE_DIR = "/Users/mac/Projects/aspire-admin/Platform.Admin/src/locales"
LANGUAGES = [
    "ar-EG", "bn-BD", "de-DE", "es-ES", "fa-IR", "fr-FR", "id-ID", 
    "it-IT", "ja-JP", "ko-KR", "pt-BR", "ru-RU", "th-TH", 
    "tr-TR", "vi-VN", "zh-TW"
]

def fix_file(file_path):
    """修复单个文件中的单引号问题"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 找到所有 'key': 'value' 模式
        # 我们需要正确处理值中的转义单引号
        pattern = r"'([^']+)'\s*:\s*'(.*?)'(?=\s*[,}])"
        
        def replace_match(match):
            key = match.group(1)
            value = match.group(2)
            # 确保值中的单引号正确转义（但不是 \\' 这种已经转义的）
            # 将单个 ' 替换为 \'，但跳过已经转义的 \'
            # 使用负向回顾后发断言
            escaped_value = re.sub(r"(?<!\\)'", r"\\'", value)
            return f"'{key}': '{escaped_value}'"
        
        # 多次应用以确保所有情况都被处理
        new_content = content
        for _ in range(3):  # 最多3次迭代
            new_content = re.sub(pattern, replace_match, new_content, flags=re.DOTALL)
            if new_content == content:
                break
            content = new_content
        
        if new_content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
        
    except Exception as e:
        print(f"  处理文件失败 {file_path}: {e}")
        return False

def main():
    print("=" * 60)
    print("修复翻译文件中的单引号问题")
    print("=" * 60)
    
    total_fixed = 0
    
    for lang in LANGUAGES:
        lang_dir = os.path.join(BASE_DIR, lang)
        if not os.path.exists(lang_dir):
            continue
            
        print(f"\n处理语言: {lang}")
        
        # 处理模块文件
        modules_dir = os.path.join(lang_dir, "modules")
        if os.path.exists(modules_dir):
            for filename in os.listdir(modules_dir):
                if filename.endswith('.ts'):
                    file_path = os.path.join(modules_dir, filename)
                    if fix_file(file_path):
                        print(f"  已修复: {filename}")
                        total_fixed += 1
        
        # 处理根目录文件
        for filename in ['pages.ts', 'menu.ts', 'request.ts']:
            file_path = os.path.join(lang_dir, filename)
            if os.path.exists(file_path):
                if fix_file(file_path):
                    print(f"  已修复: {filename}")
                    total_fixed += 1
    
    print(f"\n总共修复了 {total_fixed} 个文件")

if __name__ == "__main__":
    main()
