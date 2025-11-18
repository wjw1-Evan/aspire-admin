// Toast 提示组件 - 轻量级、自动消失的提示框

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ToastProps {
  readonly visible: boolean;
  readonly title?: string;
  readonly message: string;
  readonly type?: 'info' | 'success' | 'error' | 'warning';
  readonly duration?: number;
  readonly onDismiss: () => void;
}

export function Toast({
  visible,
  title,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({ light: '#FF3B30', dark: '#FF6B6B' }, 'error');
  const successColor = useThemeColor({ light: '#34C759', dark: '#30D158' }, 'success');
  const warningColor = useThemeColor({ light: '#FF9500', dark: '#FF9F0A' }, 'warning');

  useEffect(() => {
    // 清理之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (visible) {
      // 重置动画值（确保从初始状态开始）
      fadeAnim.setValue(0);
      slideAnim.setValue(-100);

      // 显示动画
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // 自动隐藏
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, duration);
      }
    } else {
      // 隐藏动画
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDismiss();
  };

  // 在 Web 平台上，即使 visible 为 false 也渲染，以便动画可以执行
  // 但在移动平台上，为了性能，可以提前返回
  if (!visible && Platform.OS !== 'web') {
    return null;
  }

  // 根据类型选择颜色
  const getTypeColor = () => {
    switch (type) {
      case 'error':
        return errorColor;
      case 'success':
        return successColor;
      case 'warning':
        return warningColor;
      default:
        return tintColor;
    }
  };

  const typeColor = getTypeColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          // 在 Web 平台上，如果不可见，使用 'none' 禁用交互
          // 如果可见，使用 'auto' 允许交互
          pointerEvents: visible ? (Platform.OS === 'web' ? 'auto' : 'box-none') : 'none',
        },
      ]}
    >
      <ThemedView
        style={[
          styles.toast,
          {
            backgroundColor,
            borderColor,
            borderLeftWidth: 4,
            borderLeftColor: typeColor,
          },
        ]}
      >
        <View style={styles.content}>
          {title && (
            <ThemedText style={styles.title} type="title">
              {title}
            </ThemedText>
          )}
          <ThemedText style={styles.message}>{message}</ThemedText>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeButtonText, { color: textColor }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 16,
    right: 16,
    zIndex: 9999, // 提高 z-index，确保在最上层
    alignItems: 'center',
    // 在 Web 平台上确保 Toast 可见
    ...Platform.select({
      web: {
        pointerEvents: 'auto' as const,
      },
    }),
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '300',
    opacity: 0.6,
  },
});

