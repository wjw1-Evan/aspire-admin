import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/ThemeContext';

export type WeChatButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface WeChatButtonProps {
  readonly title: string;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly variant?: WeChatButtonVariant;
  readonly style?: ViewStyle;
  readonly textStyle?: TextStyle;
}

export function WeChatButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}: WeChatButtonProps) {
  const { theme } = useTheme();

  const background = (() => {
    switch (variant) {
      case 'secondary':
        return theme.colors.card;
      case 'ghost':
        return 'transparent';
      case 'primary':
      default:
        return theme.colors.accent;
    }
  })();

  const borderColor = (() => {
    switch (variant) {
      case 'secondary':
        return theme.colors.border;
      case 'ghost':
        return 'transparent';
      case 'primary':
      default:
        return theme.colors.accent;
    }
  })();

  const textColor = (() => {
    switch (variant) {
      case 'secondary':
        return theme.colors.text;
      case 'ghost':
        return theme.colors.accent;
      case 'primary':
      default:
        return theme.colors.accentContrastText;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: theme.colors.highlight }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && variant !== 'ghost' ? theme.colors.accentMuted : background,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <ThemedText type="bodyStrong" style={[styles.label, { color: textColor }, textStyle]}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    textAlign: 'center',
  },
});
