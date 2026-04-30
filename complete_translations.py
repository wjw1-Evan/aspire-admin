#!/usr/bin/env python3
"""
翻译文件补全脚本
用于补全16种语言的翻译文件，确保与en-US的键完全匹配
"""

import os
import re
from pathlib import Path

# 配置
BASE_DIR = "/Users/mac/Projects/aspire-admin/Platform.Admin/src/locales"
EN_US_DIR = os.path.join(BASE_DIR, "en-US")
LANGUAGES = [
    "ar-EG", "bn-BD", "de-DE", "es-ES", "fa-IR", "fr-FR", "id-ID", 
    "it-IT", "ja-JP", "ko-KR", "pt-BR", "ru-RU", "th-TH", 
    "tr-TR", "vi-VN", "zh-TW"
]

# 需要检查的模块文件
MODULE_FILES = [
    "auth.ts", "company.ts", "dashboard.ts", "document.ts", "help.ts", 
    "iot.ts", "missing.ts", "organization.ts", "other.ts", "park.ts", 
    "project.ts", "role.ts", "task.ts", "user.ts", "workflow.ts", "xiaoke.ts"
]

# 需要检查的根目录文件
ROOT_FILES = ["pages.ts", "menu.ts", "request.ts"]

def extract_keys_from_file(file_path):
    """从翻译文件中提取所有键"""
    keys = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # 匹配 'key': 'value' 或 'key': "value" 的模式
            pattern = r"'([^']+)'\s*:"
            matches = re.findall(pattern, content)
            keys.update(matches)
    except Exception as e:
        print(f"  读取文件失败 {file_path}: {e}")
    return keys

def get_value_from_en_us(key, en_us_files):
    """从en-US文件中获取键对应的值"""
    for file_path in en_us_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # 转义键中的特殊字符用于正则匹配
                escaped_key = re.escape(key)
                pattern = rf"'{escaped_key}'\s*:\s*'([^']*)'"
                match = re.search(pattern, content)
                if match:
                    return match.group(1)
                # 也尝试双引号
                pattern = rf"'{escaped_key}'\s*:\s*\"([^\"]*)\""
                match = re.search(pattern, content)
                if match:
                    return match.group(1)
        except Exception as e:
            pass
    return None

def get_all_en_us_files():
    """获取en-US的所有翻译文件路径"""
    en_us_files = []
    
    # 模块文件
    modules_dir = os.path.join(EN_US_DIR, "modules")
    for module_file in MODULE_FILES:
        file_path = os.path.join(modules_dir, module_file)
        if os.path.exists(file_path):
            en_us_files.append(file_path)
    
    # 根目录文件
    for root_file in ROOT_FILES:
        file_path = os.path.join(EN_US_DIR, root_file)
        if os.path.exists(file_path):
            en_us_files.append(file_path)
    
    return en_us_files

def get_all_en_us_keys():
    """获取en-US的所有翻译键及其来源文件"""
    all_keys = {}
    
    # 模块文件
    modules_dir = os.path.join(EN_US_DIR, "modules")
    for module_file in MODULE_FILES:
        file_path = os.path.join(modules_dir, module_file)
        if os.path.exists(file_path):
            keys = extract_keys_from_file(file_path)
            for key in keys:
                all_keys[key] = module_file
    
    # 根目录文件
    for root_file in ROOT_FILES:
        file_path = os.path.join(EN_US_DIR, root_file)
        if os.path.exists(file_path):
            keys = extract_keys_from_file(file_path)
            for key in keys:
                all_keys[key] = root_file
    
    return all_keys

def add_missing_keys_to_file(file_path, missing_keys, en_us_files):
    """向文件添加缺失的键"""
    if not missing_keys:
        return 0
    
    # 读取原文件
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  无法读取文件 {file_path}: {e}")
        return 0
    
    # 找出需要添加的键及其值
    keys_to_add = []
    for key in missing_keys:
        value = get_value_from_en_us(key, en_us_files)
        if value is None:
            # 使用键的最后一部分作为占位符
            value = key.split('.')[-1]
        keys_to_add.append((key, value))
    
    if not keys_to_add:
        return 0
    
    # 在最后一个 }; 之前插入新的键值对
    last_brace = content.rfind('};')
    if last_brace == -1:
        print(f"  文件格式错误，未找到 }} 符号: {file_path}")
        return 0
    
    # 构建要插入的文本
    new_entries = []
    for key, value in keys_to_add:
        # 转义值中的单引号
        escaped_value = value.replace("'", "\\'")
        new_entries.append(f"  '{key}': '{escaped_value}'")
    
    # 在原内容的最后一个 }; 之前插入
    before_brace = content[:last_brace].rstrip()
    after_brace = content[last_brace:]
    
    # 检查before_brace最后一个非空行是否有逗号
    lines = before_brace.strip().split('\n')
    last_line = lines[-1].strip() if lines else ""
    comma_needed = not last_line.endswith(',') and not last_line.endswith('{')
    
    new_content = before_brace
    if comma_needed:
        new_content += ','
    new_content += '\n'
    new_content += ',\n'.join(new_entries)
    new_content += '\n'
    new_content += after_brace
    
    # 写回文件
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return len(keys_to_add)
    except Exception as e:
        print(f"  写入文件失败 {file_path}: {e}")
        return 0

def process_language(lang):
    """处理一种语言的翻译文件"""
    print(f"\n处理语言: {lang}")
    lang_dir = os.path.join(BASE_DIR, lang)
    
    if not os.path.exists(lang_dir):
        print(f"  目录不存在: {lang_dir}")
        return
    
    # 获取en-US的所有键及其来源文件
    en_us_keys = get_all_en_us_keys()
    en_us_files = get_all_en_us_files()
    
    print(f"  en-US 共有 {len(en_us_keys)} 个翻译键")
    
    total_added = 0
    
    # 检查模块文件
    modules_dir = os.path.join(lang_dir, "modules")
    if os.path.exists(modules_dir):
        for module_file in MODULE_FILES:
            file_path = os.path.join(modules_dir, module_file)
            if not os.path.exists(file_path):
                print(f"  文件不存在: {module_file}")
                continue
            
            # 提取当前文件的键
            current_keys = extract_keys_from_file(file_path)
            
            # 找出该文件应该有的键（来自en-US的对应文件）
            expected_keys = {k for k, v in en_us_keys.items() if v == module_file}
            missing_keys = expected_keys - current_keys
            
            if missing_keys:
                print(f"  {module_file}: 缺失 {len(missing_keys)} 个键")
                added = add_missing_keys_to_file(file_path, missing_keys, en_us_files)
                total_added += added
                print(f"    已添加 {added} 个键")
            else:
                print(f"  {module_file}: 完整")
    else:
        print(f"  modules 目录不存在")
    
    # 检查根目录文件
    for root_file in ROOT_FILES:
        file_path = os.path.join(lang_dir, root_file)
        if not os.path.exists(file_path):
            print(f"  文件不存在: {root_file}")
            continue
        
        # 提取当前文件的键
        current_keys = extract_keys_from_file(file_path)
        
        # 找出该文件应该有的键（来自en-US的对应文件）
        expected_keys = {k for k, v in en_us_keys.items() if v == root_file}
        missing_keys = expected_keys - current_keys
        
        if missing_keys:
            print(f"  {root_file}: 缺失 {len(missing_keys)} 个键")
            added = add_missing_keys_to_file(file_path, missing_keys, en_us_files)
            total_added += added
            print(f"    已添加 {added} 个键")
        else:
            print(f"  {root_file}: 完整")
    
    print(f"  语言 {lang} 处理完成，共添加 {total_added} 个键")

def main():
    """主函数"""
    print("=" * 60)
    print("翻译文件补全脚本")
    print("=" * 60)
    
    # 检查en-US目录是否存在
    if not os.path.exists(EN_US_DIR):
        print(f"错误: en-US目录不存在: {EN_US_DIR}")
        return
    
    # 处理每种语言
    for lang in LANGUAGES:
        process_language(lang)
    
    print("\n" + "=" * 60)
    print("所有语言处理完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
