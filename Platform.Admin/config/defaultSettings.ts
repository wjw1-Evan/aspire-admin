import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name 现代化主题配置
 * @description 支持日间/夜间模式切换的现代化企业级管理平台主题
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  // 默认日间模式
  navTheme: 'light',
  // 现代化主题色 - 科技蓝
  colorPrimary: '#1677ff',
  // 混合布局，更现代化
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  title: 'Aspire Admin Platform',
  pwa: true,
  logo: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
  iconfontUrl: '',
  token: {
    // 现代化设计 token 配置
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
  },
};

export default Settings;
