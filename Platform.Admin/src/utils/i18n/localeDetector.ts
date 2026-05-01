/**
 * 缺失翻译检测器 - 通过 console.warn 捕获 React Intl 的缺失消息
 */

import { getIntl as originalGetIntl, addLocale, getLocale, setLocale } from '@umijs/max';
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

  if (saved[currentLocale]) {
    const messages = saved[currentLocale];
    const currentMessages = getMessages(currentLocale);
    const merged = { ...currentMessages, ...messages };

    addLocale(currentLocale, merged, {
      momentLocale: currentLocale.split('-')[1]?.toLowerCase(),
      antd: { locale: currentLocale } as any,
    });

    console.log('[i18n] Loaded saved translations for:', currentLocale, Object.keys(messages).length);
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
  
  if (missingTranslations.has(cacheKey)) {
    return;
  }

  if (translatingIds.has(cacheKey)) {
    return;
  }

  if (currentLocale === 'en-US') {
    return;
  }

  const sourceText = getSourceText(id);
  if (!sourceText) {
    console.warn('[i18n] Missing source text for:', id);
    return;
  }

  missingTranslations.set(cacheKey, { id, locale: currentLocale, sourceText });
  translatingIds.add(cacheKey);

  console.log('[i18n] Missing translation detected:', { id, locale: currentLocale, sourceText });

  try {
    const translated = await translateText(sourceText, currentLocale, sourceText);
    
    if (translated && translated !== sourceText) {
      const currentMessages = getMessages(currentLocale);
      const updatedMessages = {
        ...currentMessages,
        [id]: translated,
      };

      addLocale(currentLocale, updatedMessages, {
        momentLocale: currentLocale.split('-')[1]?.toLowerCase(),
        antd: { locale: currentLocale } as any,
      });

      // 保存到 localStorage
      const saved = loadSavedTranslations();
      if (!saved[currentLocale]) saved[currentLocale] = {};
      saved[currentLocale][id] = translated;
      saveTranslationsToStorage(saved);

      console.log('[i18n] Translation added:', { id, locale: currentLocale, translated });
    }
  } catch (error) {
    console.error('[i18n] Translation failed:', error);
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
    return missingMatch[1];
  }
  
  return null;
}

/**
 * 启动缺失翻译检测
 */
export function startMissingTranslationDetection(): void {
  if (isEnabled) return;
  
  isEnabled = true;

  if (typeof window !== 'undefined') {
    consoleWarnSpy = console.warn;
    
    console.warn = function(...args: any[]) {
      const message = args[0];
      
      if (typeof message === 'string' && message.includes('Missing message')) {
        const missingId = parseIntlWarning(message);
        if (missingId && isEnabled) {
          handleMissingTranslation(missingId);
        }
      }
      
      return consoleWarnSpy.apply(this, args);
    };
  }
  
  console.log('[i18n] Missing translation detection enabled');
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