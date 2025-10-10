/**
 * 路由守卫组件
 * 控制路由级别的访问权限
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAuthGuard } from '@/components/AuthGuard';
import { PermissionCheck } from '@/types/unified-api';
import { isProtectedRoute } from '@/utils/guardUtils';

interface RouteGuardProps {
  readonly children: ReactNode;
  protectedRoutes?: string[];
  publicRoutes?: string[];
  redirectTo?: string;
  unauthorizedRedirect?: string;
}

/**
 * 简单路由守卫组件
 */
export function RouteGuard({
  children,
  protectedRoutes = [],
  publicRoutes = ['/auth'],
  redirectTo = '/auth',
  unauthorizedRedirect = '/(tabs)',
}: Readonly<RouteGuardProps>) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  const { canAccess } = useAuthGuard();

  // 获取当前路由路径
  const currentPath = `/${segments.join('/')}`;

  // 判断当前路由是否受保护
  const isProtected = useMemo(() => {
    return isProtectedRoute(currentPath, protectedRoutes, publicRoutes);
  }, [currentPath, protectedRoutes, publicRoutes]);

  useEffect(() => {
    if (loading) return;

    // 如果用户未认证且访问受保护路由，重定向到登录页
    if (isProtected && !isAuthenticated) {
      console.log('用户未认证，重定向到登录页');
      router.replace(redirectTo as any);
      return;
    }

    // 如果用户已认证且访问公共路由（如登录页），重定向到主页
    if (isAuthenticated && publicRoutes.some(route => currentPath.startsWith(route))) {
      router.replace('/(tabs)');
      return;
    }

    // 检查权限
    if (isProtected && isAuthenticated && !canAccess) {
      console.log('权限不足，重定向');
      router.replace(unauthorizedRedirect as any);
    }
  }, [
    isAuthenticated,
    loading,
    currentPath,
    isProtected,
    canAccess,
    redirectTo,
    unauthorizedRedirect,
    router,
    publicRoutes,
  ]);

  return <>{children}</>;
}

/**
 * 高级路由守卫组件
 */
interface RoutePermission {
  path: string;
  permission?: PermissionCheck;
  roles?: string[];
  requireAllRoles?: boolean;
}

interface AdvancedRouteGuardProps {
  readonly children: ReactNode;
  routePermissions?: RoutePermission[];
  defaultRedirect?: string;
  unauthorizedRedirect?: string;
}

export function AdvancedRouteGuard({
  children,
  routePermissions = [],
  defaultRedirect = '/auth',
  unauthorizedRedirect = '/(tabs)',
}: Readonly<AdvancedRouteGuardProps>) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const currentPath = `/${segments.join('/')}`;

  // 查找当前路由的权限配置
  const routePermission = useMemo(() => {
    return routePermissions.find(route => currentPath.startsWith(route.path));
  }, [currentPath, routePermissions]);

  // 检查权限
  const { canAccess } = useAuthGuard(
    routePermission?.permission,
    routePermission?.roles,
    routePermission?.requireAllRoles
  );

  useEffect(() => {
    if (loading) return;

    // 如果没有找到权限配置，使用默认逻辑
    if (!routePermission) {
      if (!isAuthenticated) {
        router.replace(defaultRedirect as any);
      }
      return;
    }

    // 检查认证状态
    if (!isAuthenticated) {
      router.replace(defaultRedirect as any);
      return;
    }

    // 检查权限
    if (!canAccess) {
      router.replace(unauthorizedRedirect as any);
    }
  }, [
    isAuthenticated,
    loading,
    currentPath,
    canAccess,
    routePermission,
    defaultRedirect,
    unauthorizedRedirect,
    router,
  ]);

  return <>{children}</>;
}

/**
 * 条件路由组件
 */
interface ConditionalRouteProps {
  readonly condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ConditionalRoute({
  condition,
  children,
  fallback,
  redirectTo,
}: Readonly<ConditionalRouteProps>) {
  const router = useRouter();

  useEffect(() => {
    if (!condition && redirectTo) {
      router.replace(redirectTo as any);
    }
  }, [condition, redirectTo, router]);

  if (!condition) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * 路由权限检查 Hook
 */
export function useRoutePermission(route: string) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const currentPath = `/${segments.join('/')}`;
  const isCurrentRoute = currentPath === route;

  const navigateToRoute = (targetRoute: string) => {
    router.push(targetRoute as any);
  };

  return {
    isCurrentRoute,
    navigateToRoute,
    currentPath,
    isAuthenticated,
  };
}
