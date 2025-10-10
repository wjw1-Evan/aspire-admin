/**
 * 认证状态 Hook
 * 提供认证状态相关的工具函数
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';

export function useAuthState() {
  const auth = useAuth();

  // 是否正在加载
  const isLoading = auth.loading;

  // 是否已认证
  const isAuthenticated = auth.isAuthenticated;

  // 是否有错误
  const hasError = !!auth.error;

  // 获取错误信息
  const getErrorMessage = useCallback((): string | null => {
    return auth.error?.message || null;
  }, [auth.error]);

  // 错误是否可重试
  const isRetryable = useCallback((): boolean => {
    return auth.error?.retryable || false;
  }, [auth.error]);

  // 清除错误
  const clearError = useCallback(() => {
    auth.clearError();
  }, [auth]);

  return {
    ...auth,
    isLoading,
    isAuthenticated,
    hasError,
    getErrorMessage,
    isRetryable,
    clearError,
  };
}

