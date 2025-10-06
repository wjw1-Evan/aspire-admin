/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Using Prussian Blue color palette - deep, professional, and authoritative colors.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// 普鲁士蓝色系 - 浅色模式
const tintColorLight = '#003A6B'; // 普鲁士蓝
const tintColorDark = '#4A90E2'; // 普鲁士蓝浅色

export const Colors = {
  light: {
    text: '#1A1A1A', // 深黑色文字
    background: '#F5F7FA', // 浅灰蓝背景
    tint: tintColorLight,
    icon: '#5A6C7D', // 普鲁士蓝中灰
    tabIconDefault: '#8A9BA8', // 普鲁士蓝浅灰
    tabIconSelected: tintColorLight,
    // 扩展的普鲁士蓝色系
    card: '#FFFFFF', // 纯白卡片
    border: '#D1D9E0', // 普鲁士蓝浅边框
    placeholder: '#9CA3AF', // 普鲁士蓝占位符色
    success: '#10B981', // 翠绿色
    warning: '#F59E0B', // 琥珀色
    error: '#EF4444', // 红色
    info: '#3B82F6', // 蓝色
  },
  dark: {
    text: '#F1F5F9', // 浅灰白文字
    background: '#0F172A', // 深普鲁士蓝背景
    tint: tintColorDark,
    icon: '#94A3B8', // 普鲁士蓝中浅色
    tabIconDefault: '#64748B', // 普鲁士蓝中灰
    tabIconSelected: tintColorDark,
    // 扩展的普鲁士蓝色系
    card: '#1E293B', // 普鲁士蓝深卡片
    border: '#334155', // 普鲁士蓝深边框
    placeholder: '#64748B', // 普鲁士蓝深占位符色
    success: '#059669', // 深翠绿色
    warning: '#D97706', // 深琥珀色
    error: '#DC2626', // 深红色
    info: '#2563EB', // 深蓝色
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
