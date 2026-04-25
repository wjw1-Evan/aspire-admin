#!/usr/bin/env node

/**
 * 翻译键检查脚本
 * 检查代码中使用的翻译键是否在翻译文件中定义
 *
 * 使用方法：
 * node scripts/check-missing-keys.js
 */

const fs = require('fs');
const path = require('path');

// 读取所有模块文件
function getDefinedKeys(lang) {
  const pagesDir = path.join(__dirname, `../Platform.Admin/src/locales/${lang}/pages`);
  const keys = new Set();

  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  for (const file of files) {
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
    const matches = content.matchAll(/^\s*'([^']+)':/gm);
    for (const match of matches) {
      keys.add(match[1]);
    }
  }

  return keys;
}

// 提取代码中使用的翻译键
function getUsedKeys() {
  const pagesDir = path.join(__dirname, '../Platform.Admin/src/pages');
  const keys = new Set();

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const matches = content.matchAll(/formatMessage\s*\(\s*\{\s*id:\s*['"]([^'"]+)['"]/g);
        for (const match of matches) {
          keys.add(match[1]);
        }
      }
    }
  }

  walkDir(pagesDir);
  return keys;
}

// 主函数
function main() {
  const lang = process.argv[2] || 'zh-CN';

  console.log(`🔍 检查 ${lang} 语言的翻译键...\n`);

  const definedKeys = getDefinedKeys(lang);
  const usedKeys = getUsedKeys();

  // 找出缺失的键
  const missingKeys = [];
  for (const key of usedKeys) {
    if (!definedKeys.has(key)) {
      missingKeys.push(key);
    }
  }

  // 按模块分组
  const grouped = {};
  for (const key of missingKeys) {
    const parts = key.split('.');
    const module = parts.slice(0, 2).join('.');
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(key);
  }

  // 输出结果
  console.log(`📊 统计结果：`);
  console.log(`  - 定义的翻译键: ${definedKeys.size}`);
  console.log(`  - 使用的翻译键: ${usedKeys.size}`);
  console.log(`  - 缺失的翻译键: ${missingKeys.length}\n`);

  if (missingKeys.length > 0) {
    console.log('❌ 缺失的翻译键（按模块分组）：\n');
    for (const [module, keys] of Object.entries(grouped)) {
      console.log(`  ${module}:`);
      for (const key of keys) {
        console.log(`    - ${key}`);
      }
      console.log();
    }

    // 生成占位符翻译
    console.log('📝 生成占位符翻译...\n');
    const placeholders = {};
    for (const key of missingKeys) {
      const parts = key.split('.');
      const lastPart = parts[parts.length - 1];
      placeholders[key] = lastPart;
    }

    // 保存到文件
    const outputPath = path.join(__dirname, `../Platform.Admin/src/locales/${lang}/pages/missing.ts`);
    let content = `/**
 * 缺失的翻译键
 * 包含 ${missingKeys.length} 个翻译键（占位符）
 */\n\nexport default {\n`;
    for (const [key, value] of Object.entries(placeholders)) {
      content += `  '${key}': '${value}',\n`;
    }
    content += `};\n`;

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`✅ 已生成占位符文件: ${outputPath}`);
  } else {
    console.log('✅ 所有翻译键都已定义');
  }
}

// 运行主函数
main();