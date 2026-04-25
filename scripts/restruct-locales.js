#!/usr/bin/env node

/**
 * 重新整理多语言目录结构脚本
 * 将翻译文件组织为更清晰的目录结构
 */

const fs = require('fs');
const path = require('path');

const languages = [
  'zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR',
  'es-ES', 'it-IT', 'ru-RU', 'pt-BR', 'ar-EG', 'fa-IR', 'id-ID',
  'bn-BD', 'th-TH', 'tr-TR', 'vi-VN',
];

const allModules = [
  'auth', 'user', 'task', 'project', 'workflow', 'document',
  'iot', 'park', 'organization', 'role', 'company', 'help',
  'xiaoke', 'other', 'missing'
];

function processLanguage(lang) {
  const baseDir = path.join(__dirname, `../Platform.Admin/src/locales/${lang}`);

  const modulesDir = path.join(baseDir, 'modules');
  const commonDir = path.join(baseDir, 'common');

  if (!fs.existsSync(modulesDir)) {
    fs.mkdirSync(modulesDir, { recursive: true });
  }
  if (!fs.existsSync(commonDir)) {
    fs.mkdirSync(commonDir, { recursive: true });
  }

  // 移动 common.ts 到 common 目录
  const commonFile = path.join(baseDir, 'pages', 'common.ts');
  if (fs.existsSync(commonFile)) {
    fs.renameSync(commonFile, path.join(commonDir, 'common.ts'));
  }

  // 移动模块文件到 modules 目录
  for (const module of allModules) {
    const moduleFile = path.join(baseDir, 'pages', `${module}.ts`);
    if (fs.existsSync(moduleFile)) {
      fs.renameSync(moduleFile, path.join(modulesDir, `${module}.ts`));
    }
  }

  // 只导入存在的模块
  const existingModules = allModules.filter(m =>
    fs.existsSync(path.join(modulesDir, `${m}.ts`))
  );

  let content = `/**
 * 模块翻译统一导出入口 (${lang})
 * 
 * 目录结构:
 * - modules/    - 功能模块翻译
 * - common/     - 通用翻译
 * 
 * 包含模块: ${existingModules.join(', ')}
 */

`;

  const commonExists = fs.existsSync(path.join(commonDir, 'common.ts'));
  if (commonExists) {
    content += `import common from './common/common';\n\n`;
  }

  for (const module of existingModules) {
    content += `import ${module} from './modules/${module}';\n`;
  }

  content += `\n// 导出所有模块\n`;
  if (commonExists) {
    content += `export { common };\n`;
  }
  content += `export { ${existingModules.join(', ')} };\n\n`;

  content += `// 默认导出：合并所有模块\nexport default {\n`;
  if (commonExists) {
    content += `  ...common,\n`;
  }
  for (const module of existingModules) {
    content += `  ...${module},\n`;
  }
  content += `};\n`;

  fs.writeFileSync(path.join(baseDir, 'pages.ts'), content, 'utf-8');

  const oldIndex = path.join(baseDir, 'pages', 'index.ts');
  if (fs.existsSync(oldIndex)) {
    fs.unlinkSync(oldIndex);
  }

  if (fs.existsSync(path.join(baseDir, 'pages'))) {
    const pagesDir = path.join(baseDir, 'pages');
    if (fs.readdirSync(pagesDir).length === 0) {
      fs.rmdirSync(pagesDir);
    }
  }

  console.log(`✓ ${lang} 整理完成 (${existingModules.length} 个模块)`);
}

console.log('🗂️  重新整理多语言目录结构...\n');

for (const lang of languages) {
  processLanguage(lang);
}

console.log('\n✅ 所有语言目录整理完成！');