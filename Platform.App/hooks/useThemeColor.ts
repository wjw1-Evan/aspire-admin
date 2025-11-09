import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type ThemeColorName = keyof AppTheme['colors'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName
) {
  const { isDark, theme } = useTheme();
  const overrideColor = isDark ? props.dark : props.light;

  if (overrideColor) {
    return overrideColor;
  }

  return theme.colors[colorName];
}
