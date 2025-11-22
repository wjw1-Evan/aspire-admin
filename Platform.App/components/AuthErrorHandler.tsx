// 重新设计的认证错误处理组件

import React, { ReactNode, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuthError } from '@/hooks/useAuthError';
import { AuthErrorType } from '@/types/unified-api';
import NetInfo from '@react-native-community/netinfo';
import { ErrorToast } from './ErrorToast';

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
}: Readonly<AuthErrorHandlerProps>) {
  const { error, getErrorType, getUserFriendlyMessage, isRetryable, clearError } = useAuthError();
  const pathname = usePathname();
  const shouldSkipErrorUi = pathname?.startsWith('/auth');
  const [toastVisible, setToastVisible] = useState(false);

  // 控制错误 Toast 显示
  useEffect(() => {
    if (error && !shouldSkipErrorUi && showErrorModal) {
      const errorType = getErrorType();
      
      // 某些错误类型不显示 Toast（自动处理）
      if (
        errorType === AuthErrorType.TOKEN_EXPIRED ||
        errorType === AuthErrorType.TOKEN_INVALID ||
        errorType === AuthErrorType.UNAUTHORIZED
      ) {
        // 这些错误通常会自动处理，不需要用户手动操作
        return;
      }
      
      // 显示 Toast
      setToastVisible(true);
    } else {
      setToastVisible(false);
    }
  }, [error, shouldSkipErrorUi, showErrorModal, getErrorType, getUserFriendlyMessage]);

  // 如果有自定义错误组件，使用它
  if (error && customErrorComponent) {
    return (
      <>
        {children}
        {customErrorComponent(error)}
      </>
    );
  }

  // 获取错误标题
  const getErrorTitle = (): string | undefined => {
    const errorType = getErrorType();
    switch (errorType) {
      case AuthErrorType.NETWORK_ERROR:
        return '网络错误';
      case AuthErrorType.PERMISSION_DENIED:
        return '权限不足';
      case AuthErrorType.LOGIN_FAILED:
        return '登录失败';
      default:
        return '操作失败';
    }
  };

  return (
    <>
      <ErrorToast
        visible={toastVisible}
        title={getErrorTitle()}
        message={getUserFriendlyMessage() || '操作失败，请稍后重试'}
        mode="toast"
        retryable={isRetryable()}
        autoHideDuration={isRetryable() ? 8000 : 5000}
        onDismiss={() => {
          setToastVisible(false);
          clearError();
        }}
        onRetry={
          isRetryable()
            ? () => {
                setToastVisible(false);
                clearError();
                // 这里可以触发重试逻辑
              }
            : undefined
        }
      />
      {children}
    </>
  );
}


// 网络状态指示器
export function NetworkStatusIndicator() {
  const { error, getErrorType } = useAuthError();
  const [isOnline, setIsOnline] = React.useState(getInitialOnlineState);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return undefined;
      }

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
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

function getInitialOnlineState(): boolean {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  return true;
}

const styles = StyleSheet.create({
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