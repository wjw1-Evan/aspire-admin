const tintColorLight = '#667eea';
const tintColorDark = '#818cf8';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#6e6e73',
    textTertiary: '#aeaeb2',
    background: '#ffffff',
    cardBackground: '#f2f2f7',
    tint: tintColorLight,
    tabIconDefault: '#aeaeb2',
    tabIconSelected: tintColorLight,
    border: '#d1d1d6',
    borderLight: '#e5e5ea',
    primary: '#667eea',
    primaryDark: '#764ba2',
    primaryLight: '#f093fb',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#8e8e93',
    textTertiary: '#636366',
    background: '#000000',
    cardBackground: '#1c1c1e',
    tint: tintColorDark,
    tabIconDefault: '#636366',
    tabIconSelected: tintColorDark,
    border: '#38383a',
    borderLight: '#2c2c2e',
    primary: '#818cf8',
    primaryDark: '#a78bfa',
    primaryLight: '#c4b5fd',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

export type ColorScheme = keyof typeof Colors;

export default Colors;
