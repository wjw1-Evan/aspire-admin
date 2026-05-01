/**
 * 缺失翻译检测器 - 运行时捕获 React Intl 的缺失警告
 */

import { getIntl as originalGetIntl, addLocale, getLocale } from '@umijs/max';
import { translateText } from './translationService';

interface MissingTranslation {
  id: string;
  locale: string;
  sourceText: string;
}

const missingTranslations = new Map<string, MissingTranslation>();
const translatingIds = new Set<string>();
let isEnabled = false;

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
 * 检查翻译是否缺失
 */
function isMissing(id: string, locale: string): boolean {
  if (locale === 'en-US') return false;
  
  const messages = getMessages(locale);
  return !messages[id] || messages[id] === id;
}

/**
 * 处理缺失的翻译
 */
async function handleMissingTranslation(id: string, locale: string): Promise<void> {
  const cacheKey = `${locale}:${id}`;
  
  if (missingTranslations.has(cacheKey)) {
    return;
  }

  if (translatingIds.has(cacheKey)) {
    return;
  }

  const sourceText = getSourceText(id);
  if (!sourceText) {
    console.warn('[i18n] Missing source text for:', id);
    return;
  }

  missingTranslations.set(cacheKey, { id, locale, sourceText });
  translatingIds.add(cacheKey);

  console.log('[i18n] Missing translation detected:', { id, locale, sourceText });

  try {
    const translated = await translateText(sourceText, locale, sourceText);
    
    if (translated && translated !== sourceText) {
      const currentMessages = getMessages(locale);
      const updatedMessages = {
        ...currentMessages,
        [id]: translated,
      };

      addLocale(locale, updatedMessages, {
        momentLocale: locale.split('-')[1]?.toLowerCase(),
        antd: { locale } as any,
      });
      
      console.log('[i18n] Translation added:', { id, locale, translated });
    }
  } catch (error) {
    console.error('[i18n] Translation failed:', error);
  } finally {
    translatingIds.delete(cacheKey);
  }
}

/**
 * 创建带有缺失检测的 getIntl 包装
 */
function createMonitoredGetIntl() {
  const originalCreateIntl = (window as any).__react_intl_createIntl;
  
  if (originalCreateIntl) {
    return;
  }

  const { createIntl } = require('react-intl');
  (window as any).__react_intl_createIntl = createIntl;

  require('react-intl').createIntl = function (config: any, cache?: any) {
    const originalOnWarn = config.onWarn;
    
    const wrappedConfig = {
      ...config,
      onWarn: (warning: any, ...args: any[]) => {
        if (
          warning &&
          typeof warning === 'object' &&
          (warning.message?.includes('Missing message') ||
            warning.message?.includes('MISSING_TRANSLATION') ||
            warning.id)
        ) {
          const id = warning.id || warning.message?.match(/'(.+)'/)?.[1];
          if (id && isEnabled) {
            handleMissingTranslation(id, config.locale);
          }
        }
        
        if (originalOnWarn) {
          originalOnWarn(warning, ...args);
        }
      },
    };

    return (window as any).__react_intl_createIntl(wrappedConfig, cache);
  };
}

/**
 * 启动缺失翻译检测
 */
export function startMissingTranslationDetection(): void {
  if (isEnabled) return;
  
  isEnabled = true;
  
  if (typeof window !== 'undefined') {
    createMonitoredGetIntl();
  }
  
  console.log('[i18n] Missing translation detection enabled');
}

/**
 * 停止缺失翻译检测
 */
export function stopMissingTranslationDetection(): void {
  isEnabled = false;
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