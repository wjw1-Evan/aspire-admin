import type { ThemeConfig } from 'antd';

/**
 * 日间模式主题配置
 */
export const lightTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    
    // 字体配置
    fontFamily: 'AlibabaSans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    
    // 圆角配置
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // 阴影配置
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.08)',
    
    // 间距配置
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    
    // 高度配置
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    
    // 动画配置
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',
    
    // 背景色配置
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgMask: 'rgba(0, 0, 0, 0.45)',
    
    // 文字颜色配置
    colorText: 'rgba(0, 0, 0, 0.88)',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',
    
    // 边框颜色配置
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // 组件背景色
    colorFill: 'rgba(0, 0, 0, 0.06)',
    colorFillSecondary: 'rgba(0, 0, 0, 0.04)',
    colorFillTertiary: 'rgba(0, 0, 0, 0.02)',
    colorFillQuaternary: 'rgba(0, 0, 0, 0.01)',
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

/**
 * 夜间模式主题配置
 */
export const darkTheme: ThemeConfig = {
  token: {
    // 主色调（夜间模式使用更亮的颜色）
    colorPrimary: '#4096ff',
    colorSuccess: '#73d13d',
    colorWarning: '#ffc53d',
    colorError: '#ff7875',
    colorInfo: '#4096ff',
    
    // 字体配置
    fontFamily: 'AlibabaSans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    
    // 圆角配置
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // 阴影配置（夜间模式使用更深的阴影）
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.12)',
    
    // 间距配置
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    
    // 高度配置
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    
    // 动画配置
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',
    
    // 背景色配置（夜间模式深色背景）
    colorBgContainer: '#141414',
    colorBgElevated: '#1f1f1f',
    colorBgLayout: '#000000',
    colorBgMask: 'rgba(0, 0, 0, 0.65)',
    
    // 文字颜色配置（夜间模式浅色文字）
    colorText: 'rgba(255, 255, 255, 0.88)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
    
    // 边框颜色配置（夜间模式深色边框）
    colorBorder: '#424242',
    colorBorderSecondary: '#303030',
    
    // 组件背景色（夜间模式深色填充）
    colorFill: 'rgba(255, 255, 255, 0.06)',
    colorFillSecondary: 'rgba(255, 255, 255, 0.04)',
    colorFillTertiary: 'rgba(255, 255, 255, 0.02)',
    colorFillQuaternary: 'rgba(255, 255, 255, 0.01)',
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

/**
 * 获取主题配置
 * @param theme 主题名称
 * @returns 主题配置对象
 */
export const getThemeConfig = (theme: 'light' | 'dark'): ThemeConfig => {
  return theme === 'dark' ? darkTheme : lightTheme;
};

/**
 * 主题配置类型
 */
export type ThemeType = 'light' | 'dark';
