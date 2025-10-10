/**
 * 守卫工具函数
 * 提供通用的守卫逻辑
 */

import { CurrentUser, PermissionCheck } from '@/types/unified-api';
import { checkPermission } from './permissionUtils';

/**
 * 检查是否有权限访问
 */
export function canAccess(
  user: CurrentUser | null,
  isAuthenticated: boolean,
  permission?: PermissionCheck,
  roles?: string[],
  requireAllRoles = false
): boolean {
  // 检查认证状态
  if (!isAuthenticated || !user) {
    return false;
  }

  // 检查权限
  if (permission && !checkPermission(user, permission)) {
    return false;
  }

  // 检查角色
  if (roles && roles.length > 0) {
    const hasRequiredRoles = requireAllRoles
      ? roles.every(role => user.access === role)
      : roles.some(role => user.access === role);
    
    if (!hasRequiredRoles) {
      return false;
    }
  }

  return true;
}

/**
 * 检查路由是否受保护
 */
export function isProtectedRoute(
  currentPath: string,
  protectedRoutes: string[],
  publicRoutes: string[]
): boolean {
  if (protectedRoutes.length > 0) {
    return protectedRoutes.some(route => currentPath.startsWith(route));
  }
  
  return !publicRoutes.some(route => currentPath.startsWith(route));
}

/**
 * 获取访问拒绝原因
 */
export function getAccessDeniedReason(
  isAuthenticated: boolean,
  hasPermission: boolean,
  hasRole: boolean
): string {
  if (!isAuthenticated) {
    return '请先登录';
  }
  
  if (!hasPermission) {
    return '权限不足';
  }
  
  if (!hasRole) {
    return '角色权限不足';
  }
  
  return '访问被拒绝';
}

