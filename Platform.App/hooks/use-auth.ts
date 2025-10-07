// 重新设计的认证相关 Hooks

import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { PermissionCheck } from '@/types/auth';

// 基础认证 Hook
export function useAuth() {
  return useAuthContext();
}

// Token 验证和自动刷新 Hook - 简化以匹配Admin端
export function useTokenValidation() {
  const { isAuthenticated, validateToken } = useAuth();
  const validationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const lastValidationTime = useRef<number>(0);

  // 开始定期验证
  const startTokenValidation = useCallback(() => {
    if (validationInterval.current) {
      clearInterval(validationInterval.current);
    }

    // 每 10 分钟验证一次 token（减少频率）
    validationInterval.current = setInterval(async () => {
      if (isAuthenticated) {
        // 避免频繁验证，如果最近已经验证过就跳过
        const now = Date.now();
        if (now - lastValidationTime.current < 5 * 60 * 1000) { // 5分钟内不重复验证
          return;
        }

        try {
          const isValid = await validateToken();
          lastValidationTime.current = now;
          
          if (!isValid) {
            // Token 无效，执行登出
            console.log('Token validation failed, user will be logged out');
          }
        } catch (error) {
          console.error('Token validation error:', error);
        }
      }
    }, 10 * 60 * 1000); // 改为10分钟
  }, [isAuthenticated, validateToken]);

  // 停止验证
  const stopTokenValidation = useCallback(() => {
    if (validationInterval.current) {
      clearInterval(validationInterval.current);
      validationInterval.current = null;
    }
  }, []);

  // 处理应用状态变化
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // 应用从后台回到前台时验证 token（但要避免频繁验证）
      if (isAuthenticated) {
        const now = Date.now();
        if (now - lastValidationTime.current > 2 * 60 * 1000) { // 2分钟内不重复验证
          validateToken().then(() => {
            lastValidationTime.current = now;
          }).catch(error => {
            console.error('App state change token validation error:', error);
          });
        }
      }
    }
    
    appState.current = nextAppState;
  }, [isAuthenticated, validateToken]);

  useEffect(() => {
    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 如果用户已认证，开始定期验证
    if (isAuthenticated) {
      startTokenValidation();
    } else {
      stopTokenValidation();
    }

    return () => {
      subscription?.remove();
      stopTokenValidation();
    };
  }, [isAuthenticated, startTokenValidation, stopTokenValidation, handleAppStateChange]);

  return {
    startTokenValidation,
    stopTokenValidation,
  };
}

// 权限检查 Hook - 基于Admin端的access字段
export function usePermissions() {
  const { user, hasPermission, hasRole } = useAuth();

  // 检查权限
  const checkPermission = useCallback((check: PermissionCheck): boolean => {
    return hasPermission(check);
  }, [hasPermission]);

  // 检查角色
  const checkRole = useCallback((role: string): boolean => {
    return hasRole(role);
  }, [hasRole]);

  // 检查多个权限（需要全部满足）
  const checkAllPermissions = useCallback((permissions: PermissionCheck[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  // 检查多个权限（满足任意一个即可）
  const checkAnyPermission = useCallback((permissions: PermissionCheck[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // 检查多个角色（需要全部满足）
  const checkAllRoles = useCallback((roles: string[]): boolean => {
    return roles.every(role => hasRole(role));
  }, [hasRole]);

  // 检查多个角色（满足任意一个即可）
  const checkAnyRole = useCallback((roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  return {
    user,
    access: user?.access || '',
    checkPermission,
    checkRole,
    checkAllPermissions,
    checkAnyPermission,
    checkAllRoles,
    checkAnyRole,
  };
}

// 认证状态 Hook
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

// 自动登出 Hook（用于处理长时间不活动的情况）
export function useAutoLogout(timeout: number = 30 * 60 * 1000) { // 默认 30 分钟
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 重置活动时间
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.log('Auto logout due to inactivity');
        logout();
      }, timeout);
    }
  }, [isAuthenticated, logout, timeout]);

  // 监听用户活动
  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // 监听应用状态变化
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        resetActivity();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 初始设置
    resetActivity();

    return () => {
      subscription?.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, resetActivity]);

  return {
    resetActivity,
  };
}

// 网络状态监听 Hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(true); // 默认假设在线

  useEffect(() => {
    // 使用 apiService 进行网络检测
    const checkNetworkStatus = async () => {
      try {
        const { apiService } = await import('@/services/api');
        const isOnline = await apiService.isOnline();
        setIsOnline(isOnline);
      } catch {
        setIsOnline(false);
      }
    };

    // 初始检查
    checkNetworkStatus();

    // 定期检查网络状态（每30秒）
    const interval = setInterval(checkNetworkStatus, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}

// 认证错误处理 Hook
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
      case 'NETWORK_ERROR':
        return '网络连接异常，请检查网络设置后重试';
      case 'TOKEN_EXPIRED':
        return '登录已过期，请重新登录';
      case 'TOKEN_INVALID':
        return '登录状态异常，请重新登录';
      case 'LOGIN_FAILED':
        return '登录失败，请检查用户名和密码';
      case 'UNAUTHORIZED':
        return '认证失败，请重新登录';
      case 'PERMISSION_DENIED':
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
