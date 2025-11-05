/**
 * 简化的认证状态管理 Hook
 * 修复：统一状态管理，简化 API 调用
 */

import { useModel } from '@umijs/max';
import { useCallback, useMemo } from 'react';
import type { CurrentUser } from '@/types/unified-api';

export function useAuthState() {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { currentUser, fetchUserInfo } = initialState || {};

  // 简化的权限检查
  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      const permissions = (currentUser as any)?.permissions;
      return (permissions ?? []).includes(permissionCode);
    },
    [currentUser],
  );

  // 简化的角色检查
  const hasRole = useCallback(
    (roleName: string): boolean => {
      return currentUser?.roles?.includes(roleName) ?? false;
    },
    [currentUser?.roles],
  );

  // 简化的资源权限检查
  const can = useCallback(
    (resource: string, action: string): boolean => {
      return hasPermission(`${resource}:${action}`);
    },
    [hasPermission],
  );

  // 检查是否为管理员
  const isAdmin = useCallback((): boolean => {
    return hasRole('admin') || hasRole('管理员');
  }, [hasRole]);

  // 更新用户信息
  const updateUser = useCallback(
    (user: Partial<CurrentUser>) => {
      if (currentUser) {
        setInitialState({
          ...initialState,
          currentUser: { ...currentUser, ...user },
        });
      }
    },
    [currentUser, initialState, setInitialState],
  );

  // 清除用户信息
  const clearUser = useCallback(() => {
    setInitialState({
      ...initialState,
      currentUser: undefined,
    });
  }, [initialState, setInitialState]);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    if (fetchUserInfo) {
      try {
        const user = await fetchUserInfo();
        setInitialState({
          ...initialState,
          currentUser: user,
        });
      } catch (error) {
        console.error('Failed to refresh user info:', error);
        clearUser();
      }
    }
  }, [fetchUserInfo, initialState, setInitialState, clearUser]);


  // 权限检查方法
  const permissionMethods = useMemo(
    () => ({
      hasPermission,
      hasRole,
      can,
      isAdmin,
    }),
    [hasPermission, hasRole, can, isAdmin],
  );

  // 用户管理方法
  const userMethods = useMemo(
    () => ({
      updateUser,
      clearUser,
      refreshUser,
    }),
    [updateUser, clearUser, refreshUser],
  );

  return {
    // 状态
    currentUser,
    isAuthenticated: !!currentUser?.isLogin,
    loading: initialState?.loading ?? false,

    // 权限检查
    ...permissionMethods,

    // 用户管理
    ...userMethods,
  };
}
