import type { LayoutSettings } from '../src/types/layout';

/**
 * @name 现代化主题配置
 * @description 支持日间/夜间模式切换的现代化企业级管理平台主题
 */
const Settings: LayoutSettings = {
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
  title: '通用管理平台',
  pwa: true,
  logo: '/logo.svg',
  iconfontUrl: '',
  token: {
    // 现代化设计 token 配置
    colorPrimary: '#1677ff',
  },
};

export default Settings;
