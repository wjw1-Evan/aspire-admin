/**
 * 自动保存翻译到语言包文件
 * 注意：此功能需要在 Node 环境下运行（构建时或 CLI）
 */

import * as fs from 'fs';
import * as path from 'path';

interface LocaleFile {
  path: string;
  locale: string;
  module?: string;
}

const LOCALES_DIR = path.join(__dirname, '../../locales');

/**
 * 获取所有语言包文件
 */
function getAllLocaleFiles(): LocaleFile[] {
  const files: LocaleFile[] = [];
  const entries = fs.readdirSync(LOCALES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const localeDir = path.join(LOCALES_DIR, entry.name);
      const localeFiles = fs.readdirSync(localeDir);

      for (const file of localeFiles) {
        if (file.endsWith('.ts')) {
          const moduleMatch = file.match(/^(.+)\.ts$/);
          files.push({
            path: path.join(localeDir, file),
            locale: entry.name,
            module: moduleMatch?.[1],
          });
        }
      }
    }
  }

  return files;
}

/**
 * 读取语言包内容
 */
function readLocaleFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const match = content.match(/export default\s*(\{[\s\S]*\});?$/m);
  if (!match) return {};

  try {
    const evalResult = eval(`(${match[1]})`);
    return evalResult;
  } catch (error) {
    console.error('[i18n] Failed to parse locale file:', filePath, error);
    return {};
  }
}

/**
 * 写入语言包内容
 */
function writeLocaleFile(
  filePath: string,
  messages: Record<string, string>,
  existingContent: string
): void {
  const lines = existingContent.split('\n');
  
  let startIdx = -1;
  let endIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export default')) {
      startIdx = i;
    }
    if (startIdx !== -1 && lines[i].trim() === '};') {
      endIdx = i;
      break;
    }
  }

  if (startIdx === -1 || endIdx === -1) {
    console.error('[i18n] Cannot find export default in file:', filePath);
    return;
  }

  const newExport = `export default ${JSON.stringify(messages, null, 2)};`;
  const newLines = [...lines.slice(0, startIdx), newExport, ...lines.slice(endIdx + 1)];
  
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
}

/**
 * 更新语言包文件
 */
function updateLocaleFile(
  locale: string,
  module: string | undefined,
  newMessages: Record<string, string>
): void {
  const files = getAllLocaleFiles().filter(
    (f) => f.locale === locale && (module ? f.module === module : true)
  );

  for (const file of files) {
    try {
      const existing = readLocaleFile(file.path);
      const merged = { ...existing, ...newMessages };
      writeLocaleFile(file.path, merged, fs.readFileSync(file.path, 'utf-8'));
      console.log('[i18n] Updated locale file:', file.path);
    } catch (error) {
      console.error('[i18n] Failed to update locale file:', file.path, error);
    }
  }
}

/**
 * 保存缺失的翻译到语言包
 * 由 CLI 或构建脚本调用
 */
export async function saveMissingTranslations(
  missingTranslations: Array<{ id: string; text: string; locale: string }>
): Promise<void> {
  const groupedByLocale = new Map<string, Record<string, string>>();

  for (const { id, text, locale } of missingTranslations) {
    if (!groupedByLocale.has(locale)) {
      groupedByLocale.set(locale, {});
    }
    groupedByLocale.get(locale)![id] = text;
  }

  for (const [locale, messages] of groupedByLocale) {
    updateLocaleFile(locale, undefined, messages);
  }

  console.log('[i18n] Saved', missingTranslations.length, 'translations to locale files');
}

/**
 * CLI 入口 - 用于手动触发保存
 */
export async function runSaveTranslationsCLI(): Promise<void> {
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