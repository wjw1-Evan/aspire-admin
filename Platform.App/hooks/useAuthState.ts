/**
 * 简化的移动端认证状态管理 Hook
 * 修复：统一状态管理，简化 API 调用
 */

import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';

export function useAuthState() {
  const authContext = useAuth();

  // 简化的权限检查
  const hasPermission = useCallback((permissionCode: string): boolean => {
    return authContext.hasPermission(permissionCode);
  }, [authContext.hasPermission]);

  // 简化的角色检查
  const hasRole = useCallback((roleName: string): boolean => {
    return authContext.hasRole(roleName);
  }, [authContext.hasRole]);

  // 简化的资源权限检查
  const can = useCallback((resource: string, action: string): boolean => {
    return authContext.can(resource, action);
  }, [authContext.can]);

  // 检查是否为管理员
  const isAdmin = useCallback((): boolean => {
    return hasRole('admin') || hasRole('管理员');
  }, [hasRole]);

  // 权限检查方法
  const permissionMethods = useMemo(() => ({
    hasPermission,
    hasRole,
    can,
    isAdmin,
  }), [hasPermission, hasRole, can, isAdmin]);

  return {
    // 状态
    user: authContext.user,
    isAuthenticated: authContext.isAuthenticated,
    loading: authContext.loading,
    error: authContext.error,
    
    // 权限检查
    ...permissionMethods,
    
    // 认证方法
    login: authContext.login,
    logout: authContext.logout,
    register: authContext.register,
    refreshAuth: authContext.refreshAuth,
    updateProfile: authContext.updateProfile,
    changePassword: authContext.changePassword,
    clearError: authContext.clearError,
  };
}