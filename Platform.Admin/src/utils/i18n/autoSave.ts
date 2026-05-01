/**
 * 自动保存翻译到语言包文件
 * 注意：此功能需要在 Node 环境下运行（构建时或 CLI）
 * 浏览器环境下此模块不执行任何操作
 */

interface LocaleFile {
  path: string;
  locale: string;
  module?: string;
}

interface TranslationItem {
  id: string;
  text: string;
  locale: string;
}

/**
 * 检查是否在 Node 环境
 */
function isNodeEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined';
}

/**
 * 保存缺失的翻译到语言包（Node 环境）
 * 由 CLI 或构建脚本调用
 */
export async function saveMissingTranslations(
  missingTranslations: TranslationItem[]
): Promise<void> {
  if (!isNodeEnvironment()) {
    console.warn('[i18n] saveMissingTranslations can only run in Node environment');
    return;
  }

  const fs = require('fs');
  const path = require('path');

  const LOCALES_DIR = path.join(__dirname, '../../locales');

  // 按语言分组
  const groupedByLocale: Record<string, Record<string, string>> = {};

  for (const { id, text, locale } of missingTranslations) {
    if (!groupedByLocale[locale]) {
      groupedByLocale[locale] = {};
    }
    groupedByLocale[locale][id] = text;
  }

  // 更新每个语言包文件
  for (const [locale, messages] of Object.entries(groupedByLocale)) {
    try {
      const localeDir = path.join(LOCALES_DIR, locale);

      if (!fs.existsSync(localeDir)) {
        console.warn('[i18n] Locale directory not found:', localeDir);
        continue;
      }

      // 找到对应的模块文件
      const files = fs.readdirSync(localeDir).filter((f: string) => f.endsWith('.ts'));

      for (const file of files) {
        const filePath = path.join(localeDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // 解析现有的导出对象
        const match = content.match(/export\s+default\s*(\{[\s\S]*?\});?\s*$/m);
        if (!match) {
          console.warn('[i18n] Cannot parse locale file:', filePath);
          continue;
        }

        let existing: Record<string, string>;
        try {
          existing = eval(`(${match[1]})`);
        } catch {
          console.warn('[i18n] Failed to parse locale file:', filePath);
          continue;
        }

        // 合并新翻译
        const updated = { ...existing, ...messages };

        // 生成新的文件内容
        const newExport = `export default ${JSON.stringify(updated, null, 2)};`;
        const newContent = content.replace(/export\s+default\s*\{[\s\S]*?\};\s*$/m, newExport);

        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log('[i18n] Updated locale file:', filePath);
      }
    } catch (error) {
      console.error('[i18n] Failed to update locale:', locale, error);
    }
  }

  console.log('[i18n] Saved', missingTranslations.length, 'translations to locale files');
}

/**
 * CLI 入口 - 用于手动触发保存
 */
export async function runSaveTranslationsCLI(): Promise<void> {
  if (!isNodeEnvironment()) {
    console.error('[i18n] CLI can only run in Node environment');
    return;
  }

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('[i18n] Usage: node save-translations.js <locale> <key> <value>');
    return;
  }

  const [locale, key, value] = args;

  if (!locale || !key || !value) {
    console.error('[i18n] Invalid arguments');
    return;
  }

  await saveMissingTranslations([
    { id: key, text: value, locale },
  ]);
}

export default {
  saveMissingTranslations,
  runSaveTranslationsCLI,
};
