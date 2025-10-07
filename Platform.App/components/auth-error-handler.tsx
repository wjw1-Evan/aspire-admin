// 重新设计的认证错误处理组件

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthError } from '@/hooks/use-auth';
import { AuthErrorType } from '@/types/auth';

interface AuthErrorHandlerProps {
  children: ReactNode;
  showErrorModal?: boolean;
  customErrorComponent?: (error: any) => ReactNode;
}

// 认证错误处理组件
export function AuthErrorHandler({ 
  children, 
  showErrorModal = true,
  customErrorComponent 
}: AuthErrorHandlerProps) {
  const { error, getErrorType, getUserFriendlyMessage, isRetryable, clearError } = useAuthError();

  // 处理错误显示
  React.useEffect(() => {
    if (error && showErrorModal) {
      const errorType = getErrorType();
      const message = getUserFriendlyMessage();
      const retryable = isRetryable();

      // 根据错误类型显示不同的处理方式
      switch (errorType) {
        case AuthErrorType.TOKEN_EXPIRED:
        case AuthErrorType.TOKEN_INVALID:
        case AuthErrorType.UNAUTHORIZED:
          // 这些错误通常会自动处理，不需要用户手动操作
          console.log('Auth error handled automatically:', message);
          break;
          
        case AuthErrorType.NETWORK_ERROR:
          Alert.alert(
            '网络错误',
            message,
            [
              {
                text: '重试',
                onPress: () => {
                  clearError();
                  // 这里可以触发重试逻辑
                },
              },
              {
                text: '取消',
                style: 'cancel',
                onPress: clearError,
              },
            ]
          );
          break;
          
        case AuthErrorType.PERMISSION_DENIED:
          Alert.alert(
            '权限不足',
            message,
            [
              {
                text: '确定',
                onPress: clearError,
              },
            ]
          );
          break;
          
        case AuthErrorType.LOGIN_FAILED:
          Alert.alert(
            '登录失败',
            message,
            [
              {
                text: '确定',
                onPress: clearError,
              },
            ]
          );
          break;
          
        default:
          if (retryable) {
            Alert.alert(
              '操作失败',
              message,
              [
                {
                  text: '重试',
                  onPress: () => {
                    clearError();
                    // 这里可以触发重试逻辑
                  },
                },
                {
                  text: '取消',
                  style: 'cancel',
                  onPress: clearError,
                },
              ]
            );
          } else {
            Alert.alert(
              '错误',
              message,
              [
                {
                  text: '确定',
                  onPress: clearError,
                },
              ]
            );
          }
          break;
      }
    }
  }, [error, showErrorModal, getErrorType, getUserFriendlyMessage, isRetryable, clearError]);

  // 如果有自定义错误组件，使用它
  if (error && customErrorComponent) {
    return (
      <>
        {children}
        {customErrorComponent(error)}
      </>
    );
  }

  return <>{children}</>;
}

// 错误提示组件
interface ErrorBannerProps {
  error: any;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onDismiss, onRetry }: ErrorBannerProps) {
  const { getUserFriendlyMessage, isRetryable } = useAuthError();

  if (!error) {
    return null;
  }

  const message = getUserFriendlyMessage();
  const retryable = isRetryable();

  return (
    <View style={styles.errorBanner}>
      <View style={styles.errorContent}>
        <Text style={styles.errorText}>{message}</Text>
        <View style={styles.errorActions}>
          {retryable && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>重试</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// 网络状态指示器
export function NetworkStatusIndicator() {
  const { error, getErrorType } = useAuthError();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isNetworkError = error && getErrorType() === AuthErrorType.NETWORK_ERROR;

  if (!isNetworkError && isOnline) {
    return null;
  }

  return (
    <View style={[styles.networkIndicator, !isOnline && styles.offlineIndicator]}>
      <Text style={styles.networkText}>
        {!isOnline ? '网络连接已断开' : '网络连接异常'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#fff2f0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
    padding: 12,
    margin: 8,
    borderRadius: 4,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    color: '#ff4d4f',
    fontSize: 14,
    marginRight: 8,
  },
  errorActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#ff4d4f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonText: {
    color: '#ff4d4f',
    fontSize: 16,
    fontWeight: 'bold',
  },
  networkIndicator: {
    backgroundColor: '#f6ffed',
    borderBottomWidth: 1,
    borderBottomColor: '#b7eb8f',
    padding: 8,
    alignItems: 'center',
  },
  offlineIndicator: {
    backgroundColor: '#fff2f0',
    borderBottomColor: '#ffccc7',
  },
  networkText: {
    color: '#52c41a',
    fontSize: 12,
  },
});