import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { storage } from './storage';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

const STORAGE_KEY = 'app_language';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export const initLanguage = async () => {
  const saved = await storage.get<string>(STORAGE_KEY);
  if (saved && ['zh', 'en'].includes(saved)) {
    await i18n.changeLanguage(saved);
    return;
  }
  const locale = Localization.getLocales()?.[0]?.languageCode;
  if (locale === 'en') {
    await i18n.changeLanguage('en');
  }
};

export const changeLanguage = async (lang: 'zh' | 'en') => {
  await i18n.changeLanguage(lang);
  await storage.set(STORAGE_KEY, lang);
};

export const getCurrentLanguage = (): 'zh' | 'en' => {
  return (i18n.language?.startsWith('zh') ? 'zh' : 'en') as 'zh' | 'en';
};

export default i18n;
