import type { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    fontFamily: 'AlibabaSans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f7ff',
      itemSelectedColor: '#1677ff',
      itemHoverBg: '#f5f5f5',
      itemHoverColor: '#1677ff',
    },
    Card: {
      headerBg: '#fafafa',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
    },
  },
};

export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#4096ff',
    colorSuccess: '#73d13d',
    colorWarning: '#ffc53d',
    colorError: '#ff7875',
    colorInfo: '#4096ff',
    fontFamily: 'AlibabaSans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Layout: {
      headerBg: '#141414',
      siderBg: '#141414',
      bodyBg: '#000000',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#111b26',
      itemSelectedColor: '#4096ff',
      itemHoverBg: 'rgba(255, 255, 255, 0.08)',
      itemHoverColor: '#4096ff',
    },
    Card: {
      headerBg: '#1f1f1f',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.2)',
    },
  },
};

export const getThemeConfig = (theme: 'light' | 'dark'): ThemeConfig => {
  return theme === 'dark' ? darkTheme : lightTheme;
};

export type ThemeType = 'light' | 'dark';
