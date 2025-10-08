// 增强的错误提示组件 - 包含更多帮助信息和恢复建议

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { AuthError, AuthErrorType } from '@/types/unified-api';

interface EnhancedErrorToastProps {
  readonly error: AuthError | null;
  readonly onDismiss: () => void;
  readonly onRetry?: () => void;
  readonly visible: boolean;
  readonly remainingAttempts?: number;
  readonly lockInfo?: {
    readonly isLocked: boolean;
    readonly timeRemaining: number;
    readonly formattedTime: string;
    readonly reason: string;
  } | null;
}

export function EnhancedErrorToast({ 
  error, 
  onDismiss, 
  onRetry, 
  visible, 
  remainingAttempts,
  lockInfo 
}: EnhancedErrorToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [showHelp, setShowHelp] = useState(false);
  
  
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const errorColor = useThemeColor(
    { light: '#FF3B30', dark: '#FF6B6B' },
    'error'
  );
  const warningColor = useThemeColor(
    { light: '#FF9500', dark: '#FF9F0A' },
    'warning'
  );
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const linkColor = useThemeColor({}, 'tint');

  const handleDismiss = useCallback(() => {
    setShowHelp(false);
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (visible && error) {
      // 显示动画
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 自动隐藏（除了网络错误和锁定状态）
      if (error.type !== AuthErrorType.NETWORK_ERROR && !lockInfo?.isLocked) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 8000); // 增加显示时间以显示帮助信息
        return () => clearTimeout(timer);
      }
      
      // 如果没有自动隐藏，返回空的清理函数
      return () => {};
    } else {
      // 隐藏动画
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // 返回空的清理函数
      return () => {};
    }
  }, [visible, error, lockInfo, fadeAnim, slideAnim, handleDismiss]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleShowHelp = () => {
    setShowHelp(!showHelp);
  };

  const handleContactSupport = () => {
    // 可以打开邮件应用或跳转到支持页面
    Linking.openURL('mailto:support@example.com?subject=登录问题&body=我遇到了登录问题，请帮助我解决。');
  };

  if (!visible || !error) {
    return null;
  }

  const getErrorIcon = () => {
    if (lockInfo?.isLocked) {
      return 'lock.circle.fill';
    }
    
    switch (error.type) {
      case AuthErrorType.NETWORK_ERROR:
        return 'wifi.slash';
      case AuthErrorType.LOGIN_FAILED:
        return 'person.crop.circle.badge.exclamationmark';
      case AuthErrorType.TOKEN_EXPIRED:
        return 'clock.badge.exclamationmark';
      case AuthErrorType.PERMISSION_DENIED:
        return 'lock.circle';
      default:
        return 'exclamationmark.triangle';
    }
  };

  const getErrorTitle = () => {
    if (lockInfo?.isLocked) {
      return '账户已锁定';
    }
    
    switch (error.type) {
      case AuthErrorType.NETWORK_ERROR:
        return '网络连接异常';
      case AuthErrorType.LOGIN_FAILED:
        return '登录失败';
      case AuthErrorType.TOKEN_EXPIRED:
        return '登录已过期';
      case AuthErrorType.PERMISSION_DENIED:
        return '权限不足';
      default:
        return '操作失败';
    }
  };

  const getErrorDescription = () => {
    if (lockInfo?.isLocked) {
      return `账户已被锁定 ${lockInfo.formattedTime}，请稍后再试`;
    }
    
    if (remainingAttempts !== undefined && remainingAttempts > 0) {
      return `${error.message}（剩余尝试次数：${remainingAttempts}）`;
    }
    
    return error.message;
  };

  const getHelpSuggestions = () => {
    if (lockInfo?.isLocked) {
      return [
        '请等待锁定时间结束后再尝试登录',
        '如果问题持续，请联系技术支持',
        '确保使用正确的用户名和密码',
      ];
    }
    
    // 根据错误消息内容提供更具体的建议
    if (error.message?.includes('用户名已存在')) {
      return [
        '尝试使用不同的用户名',
        '检查是否已经注册过账户',
        '联系管理员获取帮助',
      ];
    }
    
    if (error.message?.includes('邮箱已被使用')) {
      return [
        '尝试使用不同的邮箱地址',
        '检查是否已经注册过账户',
        '联系管理员获取帮助',
      ];
    }
    
    if (error.message?.includes('密码长度')) {
      return [
        '确保密码长度至少6个字符',
        '使用包含字母和数字的强密码',
        '避免使用过于简单的密码',
      ];
    }
    
    if (error.message?.includes('邮箱格式')) {
      return [
        '检查邮箱地址格式是否正确',
        '确保包含@符号和域名',
        '例如：user@example.com',
      ];
    }
    
    if (error.message?.includes('当前密码不正确')) {
      return [
        '确认当前密码是否正确',
        '检查大小写和特殊字符',
        '如果忘记密码，请联系管理员',
      ];
    }
    
    if (error.message?.includes('新密码和确认密码不一致')) {
      return [
        '确保新密码和确认密码完全相同',
        '检查是否有额外的空格或字符',
        '重新输入密码',
      ];
    }
    
    switch (error.type) {
      case AuthErrorType.NETWORK_ERROR:
        return [
          '检查设备是否连接到网络',
          '尝试切换到其他网络（WiFi/移动数据）',
          '检查防火墙或代理设置',
          '重启网络连接',
        ];
      case AuthErrorType.LOGIN_FAILED:
        return [
          '确认用户名和密码是否正确',
          '检查大小写和特殊字符',
          '尝试重置密码',
          '确认账户是否被禁用',
        ];
      case AuthErrorType.TOKEN_EXPIRED:
        return [
          '重新登录以获取新的访问令牌',
          '检查系统时间是否正确',
          '清除应用缓存后重试',
        ];
      case AuthErrorType.PERMISSION_DENIED:
        return [
          '联系管理员获取相应权限',
          '确认账户角色是否正确',
          '检查是否在允许的IP范围内',
        ];
      default:
        return [
          '稍后重试',
          '检查网络连接',
          '联系技术支持',
        ];
    }
  };

  const currentColor = lockInfo?.isLocked ? warningColor : errorColor;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ThemedView style={[styles.toast, { backgroundColor: cardBackgroundColor, borderColor }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol
              name={getErrorIcon()}
              size={24}
              color={currentColor}
            />
          </View>
          
          <View style={styles.textContainer}>
            <ThemedText style={[styles.title, { color: currentColor }]}>
              {getErrorTitle()}
            </ThemedText>
            <ThemedText style={styles.description}>
              {getErrorDescription()}
            </ThemedText>
          </View>
          
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleShowHelp}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol
                name={showHelp ? "chevron.up" : "questionmark.circle"}
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 帮助建议 */}
        {showHelp && (
          <View style={styles.helpContainer}>
            <ThemedText style={styles.helpTitle}>解决建议：</ThemedText>
            {getHelpSuggestions().map((suggestion) => (
              <View key={suggestion} style={styles.suggestionItem}>
                <IconSymbol
                  name="checkmark.circle"
                  size={14}
                  color={linkColor}
                  style={styles.suggestionIcon}
                />
                <ThemedText style={styles.suggestionText}>
                  {suggestion}
                </ThemedText>
              </View>
            ))}
            
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleContactSupport}
            >
              <IconSymbol
                name="envelope"
                size={16}
                color={linkColor}
                style={styles.supportIcon}
              />
              <ThemedText style={[styles.supportText, { color: linkColor }]}>
                联系技术支持
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
        
        {/* 重试按钮 */}
        {error.retryable && onRetry && !lockInfo?.isLocked && (
          <TouchableOpacity
            style={[styles.retryButton, { borderColor }]}
            onPress={handleRetry}
          >
            <IconSymbol
              name="arrow.clockwise"
              size={16}
              color={currentColor}
              style={styles.retryIcon}
            />
            <ThemedText style={[styles.retryText, { color: currentColor }]}>
              重试
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  toast: {
    borderRadius: 12,
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButton: {
    marginRight: 8,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 2,
  },
  helpContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    opacity: 0.8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  supportIcon: {
    marginRight: 6,
  },
  supportText: {
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    margin: 16,
    marginTop: 0,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryIcon: {
    marginRight: 6,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
