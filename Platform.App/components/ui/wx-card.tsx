import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export interface WeChatCardProps extends ViewProps {
  readonly padding?: 'none' | 'sm' | 'md' | 'lg';
  readonly bordered?: boolean;
}

export function WeChatCard({
  style,
  children,
  padding = 'md',
  bordered = true,
  ...rest
}: WeChatCardProps) {
  const { theme } = useTheme();
  const paddingMap = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.lg,
    lg: theme.spacing.xl,
  } as const;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: bordered ? theme.colors.border : 'transparent',
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          padding: paddingMap[padding],
          shadowColor: theme.effects.shadowColor,
          shadowOffset: theme.effects.shadowOffset,
          shadowOpacity: theme.effects.shadowOpacity,
          shadowRadius: theme.effects.shadowRadius,
          elevation: theme.effects.elevation,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
});
