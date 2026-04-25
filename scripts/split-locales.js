#!/usr/bin/env node

/**
 * 翻译文件拆分脚本
 * 自动将 pages.ts 拆分成多个模块文件
 *
 * 使用方法：
 * node scripts/split-locales.js
 */

const fs = require('fs');
const path = require('path');

// 模块映射配置
const moduleMapping = {
  // 通用
  common: [
    'pages.common',
    'pages.action',
    'common.upload',
    'pages.message',
    'pages.button',
    'pages.table',
    'pages.search',
    'pages.placeholder',
    'pages.status',
    'pages.boolean',
    'pages.modal',
    'pages.bulkAction',
  ],
  // 认证
  auth: [
    'pages.login',
    'pages.register',
    'pages.changePassword',
    'pages.captcha',
    'pages.register.result',
    'pages.forgotPassword',
    'VALIDATION:',
    'pages.error.',
  ],
  // 用户
  user: [
    'pages.userManagement',
    'pages.userDetail',
    'pages.account.center',
    'pages.myActivity',
  ],
  // 任务
  task: [
    'pages.taskManagement',
  ],
  // 项目
  project: [
    'pages.projectManagement',
  ],
  // 工作流
  workflow: [
    'pages.workflow',
  ],
  // 公文
  document: [
    'pages.document',
  ],
  // IoT
  iot: [
    'pages.iotPlatform',
  ],
  // 园区
  park: [
    'pages.parkManagement',
  ],
  // 组织
  organization: [
    'pages.organization',
  ],
  // 角色
  role: [
    'pages.roleManagement',
    'pages.roleForm',
  ],
  // 企业
  company: [
    'pages.company',
    'pages.companySettings',
    'pages.joinRequests',
  ],
  // 帮助
  help: [
    'pages.help',
  ],
  // 小科
  xiaoke: [
    'pages.xiaokeManagement',
  ],
  // 其他
  other: [
    'pages.layouts',
    'pages.admin',
    'pages.searchTable',
    'pages.unifiedNotificationCenter',
    'pages.404',
    'pages.userLog',
    'pages.logDetail',
    'pages.welcome',
    'pages.cloud-storage',
  ],
};

// 主函数
function main() {
  const pagesPath = path.join(__dirname, '../Platform.Admin/src/locales/zh-CN/pages.ts');
  const pagesDir = path.join(__dirname, '../Platform.Admin/src/locales/zh-CN/pages');

  // 读取原文件
  console.log('📖 读取原文件...');
  const content = fs.readFileSync(pagesPath, 'utf-8');

  // 解析翻译键值对
  console.log('🔍 解析翻译键值对...');
  const translations = parseTranslations(content);

  // 按模块分组
  console.log('📦 按模块分组...');
  const modules = groupByModule(translations);

  // 生成模块文件
  console.log('📝 生成模块文件...');
  generateModuleFiles(modules, pagesDir);

  // 生成 index.ts
  console.log('📄 生成 index.ts...');
  generateIndexFile(modules, pagesDir);

  console.log('✅ 拆分完成！');
}

// 解析翻译键值对
function parseTranslations(content) {
  const translations = {};
  const lines = content.split('\n');

  for (const line of lines) {
    // 匹配单引号包裹的键值对，支持转义单引号
    const match = line.match(/^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)'/);
    if (match) {
      const key = match[1];
      // 处理转义字符
      let value = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      translations[key] = value;
    }
  }

  return translations;
}

// 按模块分组
function groupByModule(translations) {
  const modules = {};

  // 初始化模块
  for (const moduleName in moduleMapping) {
    modules[moduleName] = {};
  }

  // 分配翻译到模块
  for (const key in translations) {
    let assigned = false;

    // 检查每个模块的前缀
    for (const moduleName in moduleMapping) {
      const prefixes = moduleMapping[moduleName];
      for (const prefix of prefixes) {
        if (key.startsWith(prefix)) {
          modules[moduleName][key] = translations[key];
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    // 未分配的放入 other 模块
    if (!assigned) {
      modules.other[key] = translations[key];
    }
  }

  return modules;
}

// 生成模块文件
function generateModuleFiles(modules, pagesDir) {
  for (const moduleName in modules) {
    const translations = modules[moduleName];
    const keys = Object.keys(translations);

    if (keys.length === 0) {
      console.log(`⚠️  模块 ${moduleName} 没有翻译，跳过`);
      continue;
    }

    // 生成文件内容
    let content = `/**\n * ${moduleName} 翻译模块\n * 包含 ${keys.length} 个翻译键\n */\n\nexport default {\n`;

    // 按键排序
    keys.sort();

    for (const key of keys) {
      const value = translations[key];
      // 转义单引号
      const escapedValue = value.replace(/'/g, "\\'");
      content += `  '${key}': '${escapedValue}',\n`;
    }

    content += `};\n`;

    // 写入文件
    const filePath = path.join(pagesDir, `${moduleName}.ts`);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ 生成 ${moduleName}.ts (${keys.length} 个翻译)`);
  }
}

// 生成 index.ts
function generateIndexFile(modules, pagesDir) {
  let content = `/**\n * 翻译模块统一导出入口\n * 按功能模块组织翻译文本，便于维护和 AI 开发\n *\n * 使用方式：\n * 1. 在组件中导入特定模块：import auth from './pages/auth';\n * 2. 或使用默认导出（向后兼容）：import pages from './pages';\n */\n\n`;

  // 导入所有模块
  for (const moduleName in modules) {
    content += `import ${moduleName} from './${moduleName}';\n`;
  }

  content += `\n// 导出所有模块\n`;
  for (const moduleName in modules) {
    content += `export { default as ${moduleName} } from './${moduleName}';\n`;
  }

  content += `\n// 默认导出：合并所有模块（向后兼容）\nexport default {\n`;
  for (const moduleName in modules) {
    content += `  ...${moduleName},\n`;
  }
  content += `};\n`;

  // 写入文件
  const filePath = path.join(pagesDir, 'index.ts');
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ 生成 index.ts`);
}

// 运行主函数
main();
