import { Platform } from 'react-native';

export type ThemeColorScheme = {
  text: string;
  secondaryText: string;
  tertiaryText: string;
  background: string;
  listBackground: string;
  card: string;
  cardMuted: string;
  accent: string;
  accentMuted: string;
  accentContrastText: string;
  tint: string;
  tintMuted: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
  divider: string;
  placeholder: string;
  success: string;
  warning: string;
  danger: string;
  error: string;
  info: string;
  navBar: string;
  navBorder: string;
  messageIncoming: string;
  messageIncomingText: string;
  messageOutgoing: string;
  messageOutgoingText: string;
  tooltip: string;
  mask: string;
  highlight: string;
};

const LightColors: ThemeColorScheme = {
  text: '#191919',
  secondaryText: '#6B6B6B',
  tertiaryText: '#A6A6A6',
  background: '#F5F5F5',
  listBackground: '#FFFFFF',
  card: '#FFFFFF',
  cardMuted: '#F7F7F7',
  accent: '#07C160',
  accentMuted: '#C6F4D6',
  accentContrastText: '#FFFFFF',
  tint: '#07C160',
  tintMuted: '#C6F4D6',
  icon: '#6F6F6F',
  tabIconDefault: '#9B9B9B',
  tabIconSelected: '#07C160',
  border: '#E6E6E6',
  divider: '#EFEFEF',
  placeholder: '#B2B2B2',
  success: '#07C160',
  warning: '#FFB300',
  danger: '#FA5151',
  error: '#FA5151',
  info: '#10AEFF',
  navBar: '#FAFAFA',
  navBorder: '#E5E5E5',
  messageIncoming: '#FFFFFF',
  messageIncomingText: '#191919',
  messageOutgoing: '#95EC69',
  messageOutgoingText: '#0A0A0A',
  tooltip: '#4C4C4C',
  mask: 'rgba(0, 0, 0, 0.55)',
  highlight: '#E8F5EA',
};

const DarkColors: ThemeColorScheme = {
  text: '#F1F1F1',
  secondaryText: '#9C9C9C',
  tertiaryText: '#6B6B6B',
  background: '#111111',
  listBackground: '#1E1E1E',
  card: '#1F1F1F',
  cardMuted: '#242424',
  accent: '#07C160',
  accentMuted: '#1F3B2B',
  accentContrastText: '#111111',
  tint: '#07C160',
  tintMuted: '#1F3B2B',
  icon: '#A5A5A5',
  tabIconDefault: '#7D7D7D',
  tabIconSelected: '#07C160',
  border: '#2A2A2A',
  divider: '#2F2F2F',
  placeholder: '#5A5A5A',
  success: '#1AAD19',
  warning: '#F2C230',
  danger: '#F56C6C',
  error: '#F56C6C',
  info: '#3C9BFF',
  navBar: '#151515',
  navBorder: '#262626',
  messageIncoming: '#1F1F1F',
  messageIncomingText: '#F1F1F1',
  messageOutgoing: '#1F3F2E',
  messageOutgoingText: '#E4FFE9',
  tooltip: '#3A3A3A',
  mask: 'rgba(0, 0, 0, 0.65)',
  highlight: '#1D3324',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 16,
} as const;

export const Typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  headline: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
} as const;

const Effects = {
  light: {
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
  },
  dark: {
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.45)',
  },
} as const;

export const ThemeTokens = {
  light: {
    colors: LightColors,
    effects: Effects.light,
  },
  dark: {
    colors: DarkColors,
    effects: Effects.dark,
  },
} as const;

export type ThemeTokensKey = keyof typeof ThemeTokens;

export interface AppTheme {
  mode: ThemeTokensKey;
  colors: ThemeColorScheme;
  spacing: typeof Spacing;
  typography: typeof Typography;
  effects: (typeof Effects)[ThemeTokensKey];
  fonts: typeof Fonts;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'system-ui',
    serif: 'system-ui',
    rounded: 'system-ui',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
