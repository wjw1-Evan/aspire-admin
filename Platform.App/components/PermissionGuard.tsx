/**
 * 简化的移动端权限控制组件
 * 修复：统一权限检查，简化组件使用
 */

import React from 'react';
import { useAuthState } from '@/hooks/useAuthState';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  role?: string;
  resource?: string;
  action?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

/**
 * 权限守卫组件
 * 简化权限检查逻辑，提供统一的权限控制
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  role,
  resource,
  action,
  fallback = null,
  requireAll = false,
}) => {
  const { hasPermission, hasRole, can } = useAuthState();

  // 检查权限
  const checkPermission = (): boolean => {
    const checks: boolean[] = [];

    // 检查具体权限
    if (permission) {
      checks.push(hasPermission(permission));
    }

    // 检查角色
    if (role) {
      checks.push(hasRole(role));
    }

    // 检查资源权限
    if (resource && action) {
      checks.push(can(resource, action));
    }

    // 如果没有指定任何检查条件，默认通过
    if (checks.length === 0) {
      return true;
    }

    // 根据 requireAll 决定是否需要全部通过
    return requireAll ? checks.every(check => check) : checks.some(check => check);
  };

  const hasAccess = checkPermission();

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * 权限检查 Hook
 * 提供更灵活的权限检查方法
 */
export const usePermissionGuard = () => {
  const { hasPermission, hasRole, can } = useAuthState();

  const checkAccess = (options: {
    permission?: string;
    role?: string;
    resource?: string;
    action?: string;
    requireAll?: boolean;
  }): boolean => {
    const { permission, role, resource, action, requireAll = false } = options;
    const checks: boolean[] = [];

    if (permission) {
      checks.push(hasPermission(permission));
    }

    if (role) {
      checks.push(hasRole(role));
    }

    if (resource && action) {
      checks.push(can(resource, action));
    }

    if (checks.length === 0) {
      return true;
    }

    return requireAll ? checks.every(check => check) : checks.some(check => check);
  };

  return {
    checkAccess,
    hasPermission,
    hasRole,
    can,
  };
};

export default PermissionGuard;