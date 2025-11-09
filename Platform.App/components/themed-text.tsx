import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'body'
    | 'bodyStrong'
    | 'title'
    | 'display'
    | 'headline'
    | 'caption'
    | 'footnote'
    | 'link'
    | 'default'
    | 'defaultSemiBold'
    | 'subtitle';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'body',
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const variantStyle = (() => {
    switch (type) {
      case 'display':
        return theme.typography.display;
      case 'title':
        return theme.typography.title;
      case 'headline':
        return theme.typography.headline;
      case 'bodyStrong':
      case 'defaultSemiBold':
        return theme.typography.bodyStrong;
      case 'caption':
        return theme.typography.caption;
      case 'footnote':
        return theme.typography.footnote;
      case 'link':
        return [theme.typography.body, styles.link];
      case 'subtitle':
        return theme.typography.headline;
      case 'default':
      case 'body':
      default:
        return theme.typography.body;
    }
  })();

  const resolvedVariant = Array.isArray(variantStyle) ? variantStyle : [variantStyle];

  return (
    <Text
      style={[
        { color, fontFamily: theme.fonts.sans },
        ...resolvedVariant,
        type === 'link' ? { color: theme.colors.accent } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'none',
  },
});
