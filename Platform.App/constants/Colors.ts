const tintColorLight = '#4A7C59';
const tintColorDark = '#6BAF8D';

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
    primary: '#4A7C59',
    primaryDark: '#3A6347',
    primaryLight: '#6BAF8D',
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
    primary: '#6BAF8D',
    primaryDark: '#4A7C59',
    primaryLight: '#8FC9A5',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

export type ColorScheme = keyof typeof Colors;

export default Colors;
