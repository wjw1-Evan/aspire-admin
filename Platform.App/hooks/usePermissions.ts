/**
 * 权限检查 Hook
 * 提供权限和角色检查功能
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { PermissionCheck } from '@/types/unified-api';

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

