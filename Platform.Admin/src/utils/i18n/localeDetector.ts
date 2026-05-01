/**
 * 缺失翻译检测器 - 通过 console.warn 捕获 React Intl 的缺失消息
 */

import { getIntl as originalGetIntl, addLocale, getLocale } from '@umijs/max';
import { translateText } from './translationService';

interface MissingTranslation {
  id: string;
  locale: string;
  sourceText: string;
  translated?: string;
}

const missingTranslations = new Map<string, MissingTranslation>();
const translatingIds = new Set<string>();
let isEnabled = false;
let consoleWarnSpy: any = null;
const STORAGE_KEY = 'i18n_missing_translations';

/**
 * 从 localStorage 加载已保存的翻译
 */
function loadSavedTranslations(): Record<string, Record<string, string>> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * 保存翻译到 localStorage
 */
function saveTranslationsToStorage(translations: Record<string, Record<string, string>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(translations));
  } catch (error) {
    console.error('[i18n] Failed to save translations to storage:', error);
  }
}

/**
 * 初始化：加载已保存的翻译并应用到当前 locale
 */
export function initSavedTranslations(): void {
  const saved = loadSavedTranslations();
  const currentLocale = getLocale();

  console.log('[i18n] 📦 初始化翻译加载:', { currentLocale, savedLocales: Object.keys(saved) });

  if (saved[currentLocale]) {
    const messages = saved[currentLocale];
    const currentMessages = getMessages(currentLocale);
    const merged = { ...currentMessages, ...messages };

    addLocale(currentLocale, merged, {
      momentLocale: currentLocale.split('-')[1]?.toLowerCase(),
    });

    console.log('[i18n] ✅ 已加载保存的翻译:', { locale: currentLocale, count: Object.keys(messages).length, keys: Object.keys(messages) });
  } else {
    console.log('[i18n] ℹ️  没有保存的翻译:', { locale: currentLocale });
  }
}

/**
 * 获取当前 locale 的所有消息
 */
function getMessages(locale: string): Record<string, string> {
  try {
    const intl = originalGetIntl(locale);
    return intl.messages as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * 获取源语言（en-US）的翻译文本
 */
function getSourceText(id: string): string | undefined {
  const messages = getMessages('en-US');
  return messages[id];
}

/**
 * 处理缺失的翻译
 */
async function handleMissingTranslation(id: string): Promise<void> {
  const currentLocale = getLocale();
  const cacheKey = `${currentLocale}:${id}`;

  console.log('[i18n] 🔍 发现未翻译的内容:', { id, locale: currentLocale });

  if (missingTranslations.has(cacheKey)) {
    console.log('[i18n] ⏭️  已在翻译队列中，跳过:', id);
    return;
  }

  if (translatingIds.has(cacheKey)) {
    console.log('[i18n] ⏳ 正在翻译中，跳过:', id);
    return;
  }

  if (currentLocale === 'en-US') {
    console.log('[i18n] ℹ️  当前语言为 en-US，无需翻译:', id);
    return;
  }

  const sourceText = getSourceText(id);
  if (!sourceText) {
    console.warn('[i18n] ⚠️  找不到源文本（en-US）:', id);
    return;
  }

  missingTranslations.set(cacheKey, { id, locale: currentLocale, sourceText });
  translatingIds.add(cacheKey);

  console.log('[i18n] 🚀 开始翻译:', { id, sourceText, targetLocale: currentLocale });

  try {
    const translated = await translateText(sourceText, currentLocale, sourceText);

    console.log('[i18n] ✅ 翻译完成:', { id, sourceText, translated, targetLocale: currentLocale });

    if (translated && translated !== sourceText) {
      const currentMessages = getMessages(currentLocale);
      const updatedMessages = {
        ...currentMessages,
        [id]: translated,
      };

      addLocale(currentLocale, updatedMessages, {
        momentLocale: currentLocale.split('-')[1]?.toLowerCase(),
      });

      // 保存到 localStorage
      const saved = loadSavedTranslations();
      if (!saved[currentLocale]) saved[currentLocale] = {};
      saved[currentLocale][id] = translated;
      saveTranslationsToStorage(saved);

      console.log('[i18n] 💾 翻译已保存并应用:', { id, locale: currentLocale });
    } else {
      console.log('[i18n] ⚠️  翻译结果与原文相同，跳过保存:', { id, translated });
    }
  } catch (error) {
    console.error('[i18n] ❌ 翻译失败:', { id, error });
  } finally {
    translatingIds.delete(cacheKey);
  }
}

/**
 * 解析 React Intl 的警告消息
 * React Intl 格式: [React Intl] Missing message: "id" for locale: "en-US"
 */
function parseIntlWarning(message: string): string | null {
  // 匹配格式: Missing message: "id" 或 Missing message: 'id'
  const missingMatch = message.match(/Missing message:\s*["']([^"']+)["']/i);
  if (missingMatch) {
    const id = missingMatch[1];
    console.log('[i18n] 📝 捕获到缺失翻译警告:', { id, rawMessage: message });
    return id;
  }

  return null;
}

/**
 * 启动缺失翻译检测
 */
export function startMissingTranslationDetection(): void {
  if (isEnabled) {
    console.log('[i18n] ⚠️  翻译检测已启用，跳过重复启动');
    return;
  }

  isEnabled = true;

  if (typeof window !== 'undefined') {
    consoleWarnSpy = console.warn;

    console.warn = function(...args: any[]) {
      const message = args[0];

      // 调试：打印所有 console.warn 调用
      if (typeof message === 'string' && message.includes('Missing message')) {
        console.log('[i18n] 🔔 拦截到 console.warn:', message);
      }

      if (typeof message === 'string' && message.includes('Missing message')) {
        const missingId = parseIntlWarning(message);
        if (missingId && isEnabled) {
          handleMissingTranslation(missingId);
        }
      }

      return consoleWarnSpy.apply(this, args);
    };

    console.log('[i18n] 🎯 缺失翻译检测已启动（开发模式）');
  } else {
    console.log('[i18n] ℹ️  非浏览器环境，跳过翻译检测');
  }
}

/**
 * 停止缺失翻译检测
 */
export function stopMissingTranslationDetection(): void {
  isEnabled = false;

  if (consoleWarnSpy) {
    console.warn = consoleWarnSpy;
    consoleWarnSpy = null;
  }

  console.log('[i18n] Missing translation detection disabled');
}

/**
 * 获取缺失翻译的统计
 */
export function getMissingTranslationsCount(): number {
  return missingTranslations.size;
}

/**
 * 获取所有缺失翻译列表
 */
export function getMissingTranslationsList(): MissingTranslation[] {
  return Array.from(missingTranslations.values());
}

/**
 * 清除已缓存的缺失翻译记录
 */
export function clearMissingTranslationsCache(): void {
  missingTranslations.clear();
}

export default {
  startMissingTranslationDetection,
  stopMissingTranslationDetection,
  getMissingTranslationsCount,
  getMissingTranslationsList,
  clearMissingTranslationsCache,
};
