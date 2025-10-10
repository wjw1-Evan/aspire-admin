/**
 * 认证错误处理 Hook
 * 提供错误处理和用户友好的错误消息
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { AuthErrorType } from '@/types/unified-api';

export function useAuthError() {
  const { error, clearError } = useAuth();

  // 获取错误类型
  const getErrorType = useCallback(() => {
    return error?.type || null;
  }, [error]);

  // 获取错误消息
  const getErrorMessage = useCallback(() => {
    return error?.message || null;
  }, [error]);

  // 是否是可重试的错误
  const isRetryable = useCallback(() => {
    return error?.retryable || false;
  }, [error]);

  // 获取用户友好的错误消息
  const getUserFriendlyMessage = useCallback(() => {
    if (!error) return null;

    switch (error.type) {
      case AuthErrorType.NETWORK_ERROR:
        return '网络连接异常，请检查网络设置后重试';
      case AuthErrorType.TOKEN_EXPIRED:
        return '登录已过期，请重新登录';
      case AuthErrorType.TOKEN_INVALID:
        return '登录状态异常，请重新登录';
      case AuthErrorType.LOGIN_FAILED:
        return '登录失败，请检查用户名和密码';
      case AuthErrorType.UNAUTHORIZED:
        return '认证失败，请重新登录';
      case AuthErrorType.PERMISSION_DENIED:
        return '权限不足，无法执行此操作';
      default:
        return error.message || '操作失败，请稍后重试';
    }
  }, [error]);

  return {
    error,
    getErrorType,
    getErrorMessage,
    isRetryable,
    getUserFriendlyMessage,
    clearError,
  };
}

