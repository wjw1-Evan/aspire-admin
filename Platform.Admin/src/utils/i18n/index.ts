/**
 * i18n 自动翻译工具
 * 
 * 功能：
 * 1. 运行时检测缺失的多语言翻译
 * 2. 调用 OpenAI API 自动翻译
 * 3. 动态更新语言包
 * 
 * 使用方式：
 * 在 app.tsx 中引入并调用 startMissingTranslationDetection()
 */

export {
  translateText,
  translateBatch,
  translateWithOpenAI,
  getLocaleDisplayName,
} from './translationService';

export {
  startMissingTranslationDetection,
  stopMissingTranslationDetection,
  getMissingTranslationsCount,
  getMissingTranslationsList,
  clearMissingTranslationsCache,
} from './localeDetector';

export {
  saveMissingTranslations,
  runSaveTranslationsCLI,
} from './autoSave';