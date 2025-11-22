/**
 * 错误消息横幅组件
 * 用于显示内联错误消息
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ErrorMessageBannerProps {
  /** 错误消息 */
  message: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 自定义样式 */
  style?: any;
}

/**
 * 错误消息横幅组件
 */
export function ErrorMessageBanner({ message, onClose, style }: ErrorMessageBannerProps) {
  const errorColor = useThemeColor({ light: '#FF3B30', dark: '#FF6B6B' }, 'error');

  if (!message || !message.trim()) {
    return <View style={{ height: 0, marginBottom: 0 }} />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: errorColor + '15',
          borderColor: errorColor,
        },
        style,
      ]}
    >
      <ThemedText
        style={[styles.errorText, { color: errorColor }]}
        numberOfLines={3}
      >
        {message}
      </ThemedText>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ThemedText style={[styles.closeText, { color: errorColor }]}>✕</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 48,
    width: '100%',
    ...Platform.select({
      web: {
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
      },
    }),
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '300',
    opacity: 0.8,
  },
});

