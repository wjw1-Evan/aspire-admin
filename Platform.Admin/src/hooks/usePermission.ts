import { useModel } from '@umijs/max';

/**
 * 权限检查 Hook
 */
export function usePermission() {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};

  /**
   * 检查是否有指定权限
   */
  const hasPermission = (permissionCode: string): boolean => {
    return currentUser?.permissions?.includes(permissionCode) ?? false;
  };

  /**
   * 检查是否有指定角色
   */
  const hasRole = (roleName: string): boolean => {
    return currentUser?.roles?.includes(roleName) ?? false;
  };

  /**
   * 检查是否有资源的指定操作权限
   */
  const can = (resource: string, action: string): boolean => {
    return hasPermission(`${resource}:${action}`);
  };

  /**
   * 检查是否有任意一个权限
   */
  const hasAnyPermission = (...permissionCodes: string[]): boolean => {
    return permissionCodes.some((code) => hasPermission(code));
  };

  /**
   * 检查是否拥有所有指定权限
   */
  const hasAllPermissions = (...permissionCodes: string[]): boolean => {
    return permissionCodes.every((code) => hasPermission(code));
  };

  /**
   * 检查是否为管理员
   */
  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('管理员');
  };

  return {
    hasPermission,
    hasRole,
    can,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
  };
}

