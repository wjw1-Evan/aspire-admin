/**
 * 权限检查工具函数
 * 提供基于 access 字段的权限检查
 */

import { CurrentUser, PermissionCheck } from '@/types/unified-api';

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

/**
 * 检查用户是否有特定角色
 */
export function hasRole(user: CurrentUser | null, role: string): boolean {
  return user?.roles?.includes(role) ?? false;
}

/**
 * 检查用户是否有多个权限中的任意一个
 */
export function hasAnyPermission(user: CurrentUser | null, permissions: string[]): boolean {
  return user?.permissions 
    ? permissions.some(permission => user.permissions?.includes(permission)) 
    : false;
}

/**
 * 检查用户是否有多个权限中的全部
 */
export function hasAllPermissions(user: CurrentUser | null, permissions: string[]): boolean {
  return user?.permissions 
    ? permissions.every(permission => user.permissions?.includes(permission)) 
    : false;
}

/**
 * 检查用户是否有多个角色中的任意一个
 */
export function hasAnyRole(user: CurrentUser | null, roles: string[]): boolean {
  return user?.roles 
    ? roles.some(role => user.roles?.includes(role)) 
    : false;
}

/**
 * 检查用户是否有多个角色中的全部
 */
export function hasAllRoles(user: CurrentUser | null, roles: string[]): boolean {
  return user?.roles 
    ? roles.every(role => user.roles?.includes(role)) 
    : false;
}

/**
 * 检查资源权限（格式：resource:action）
 */
export function hasResourcePermission(user: CurrentUser | null, resource: string, action: string): boolean {
  const resourcePermission = `${resource}:${action}`;
  return user?.permissions?.includes(resourcePermission) ?? false;
}

/**
 * 解析权限检查对象
 */
export function checkPermission(user: CurrentUser | null, check: PermissionCheck): boolean {
  if (!user) {
    return false;
  }

  const { access, role } = check;

  // 检查角色
  if (role && hasRole(user, role)) {
    return true;
  }

  // 检查权限（基于 access 字段）
  if (access && user.access === access) {
    return true;
  }

  return false;
}

