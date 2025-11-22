/**
 * 统一的错误提示组件
 * 支持 Toast 和 Banner 两种显示模式
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type ErrorToastMode = 'toast' | 'banner';

interface ErrorToastProps {
  /** 错误消息 */
  message: string;
  /** 标题（可选） */
  title?: string;
  /** 是否可见 */
  visible: boolean;
  /** 显示模式：toast（浮动提示）或 banner（顶部横幅） */
  mode?: ErrorToastMode;
  /** 是否可重试 */
  retryable?: boolean;
  /** 自动隐藏时间（毫秒），0 表示不自动隐藏 */
  autoHideDuration?: number;
  /** 关闭回调 */
  onDismiss: () => void;
  /** 重试回调 */
  onRetry?: () => void;
  /** 自定义样式 */
  style?: any;
}

export function ErrorToast({
  message,
  title,
  visible,
  mode = 'toast',
  retryable = false,
  autoHideDuration = 5000,
  onDismiss,
  onRetry,
  style,
}: ErrorToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(mode === 'toast' ? -100 : -50)).current;
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backgroundColor = useThemeColor({ light: '#FFF2F0', dark: '#3A1F1D' }, 'error');
  const borderColor = useThemeColor({ light: '#FF4D4F', dark: '#FF6B6B' }, 'error');
  const textColor = useThemeColor({ light: '#FF4D4F', dark: '#FF6B6B' }, 'error');
  const cardBackgroundColor = useThemeColor({}, 'card');
  const iconColor = useThemeColor({ light: '#FF4D4F', dark: '#FF6B6B' }, 'error');

  useEffect(() => {
    if (visible) {
      // 显示动画
      const useNativeDriver = Platform.OS !== 'web';
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver,
        }),
      ]).start();

      // 自动隐藏
      if (autoHideDuration > 0) {
        autoHideTimerRef.current = setTimeout(() => {
          handleDismiss();
        }, autoHideDuration);
      }
    } else {
      // 隐藏动画
      const useNativeDriver = Platform.OS !== 'web';
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: mode === 'toast' ? -100 : -50,
          duration: 200,
          useNativeDriver,
        }),
      ]).start();
    }

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [visible, mode, fadeAnim, slideAnim, autoHideDuration]);

  const handleDismiss = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    onDismiss();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  if (!visible) {
    return null;
  }

  const isToast = mode === 'toast';

  return (
    <Animated.View
      style={[
        isToast ? styles.toastContainer : styles.bannerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: isToast ? cardBackgroundColor : backgroundColor,
          borderColor: isToast ? borderColor : undefined,
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.content, isToast && styles.toastContent]}>
        <View style={styles.messageContainer}>
          {isToast && (
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={20}
              color={iconColor}
              style={styles.icon}
            />
          )}
          <View style={styles.textContainer}>
            {title && isToast && (
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            )}
            <Text style={[styles.message, { color: textColor }]} numberOfLines={3}>
              {message}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          {retryable && onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: textColor }]}
              onPress={handleRetry}
            >
              <Text style={[styles.retryButtonText, { color: textColor }]}>重试</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <IconSymbol name="xmark" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 8,
    borderWidth: 1,
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
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    borderBottomWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    minHeight: 48,
  },
  toastContent: {
    padding: 16,
  },
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 4,
  },
});

