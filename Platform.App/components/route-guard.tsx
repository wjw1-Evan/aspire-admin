// 重新设计的路由守卫组件

import React, { ReactNode, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/components/auth-guard';
import { PermissionCheck } from '@/types/auth';

interface RouteGuardProps {
  readonly
  children: ReactNode;
  protectedRoutes?: string[];
  publicRoutes?: string[];
  redirectTo?: string;
  permission?: PermissionCheck;
  roles?: string[];
  requireAllRoles?: boolean;
}

// 路由守卫组件
export function RouteGuard({
  children,
  protectedRoutes = [],
  publicRoutes = ['auth'],
  redirectTo = '/auth',
  permission,
  roles,
  requireAllRoles = false,
}: RouteGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  // 使用认证守卫检查权限
  const { canAccess } = useAuthGuard(permission, roles, requireAllRoles);

  // 获取当前路由路径
  const currentPath = `/${segments.join('/')}`;

  useEffect(() => {
    // 如果还在加载，不进行路由检查
    if (loading) {
      return;
    }

    // 检查是否为受保护的路由
    const isProtectedRoute = protectedRoutes.length > 0 
      ? protectedRoutes.some(route => currentPath.startsWith(route))
      : !publicRoutes.some(route => currentPath.startsWith(route));

    // 如果用户未认证且访问受保护路由，重定向到登录页
    if (isProtectedRoute && !isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    // 如果用户已认证且访问公共路由（如登录页），重定向到主页
    if (isAuthenticated && publicRoutes.some(route => currentPath.startsWith(route))) {
      router.replace('/(tabs)');
      return;
    }

    // 检查权限
    if (isProtectedRoute && isAuthenticated && !canAccess) {
      // 权限不足，重定向到无权限页面或首页
      router.replace('/(tabs)');
      return;
    }
  }, [
    isAuthenticated,
    loading,
    currentPath,
    canAccess,
    protectedRoutes,
    publicRoutes,
    redirectTo,
    router,
  ]);

  return <>{children}</>;
}

// 路由权限配置类型
interface RoutePermission {
  path: string;
  permission?: PermissionCheck;
  roles?: string[];
  requireAllRoles?: boolean;
}

// 高级路由守卫组件
interface AdvancedRouteGuardProps {
  readonly
  children: ReactNode;
  routePermissions?: RoutePermission[];
  defaultRedirect?: string;
  unauthorizedRedirect?: string;
}

export function AdvancedRouteGuard({
  children,
  routePermissions = [],
  defaultRedirect = '/auth',
  unauthorizedRedirect = '/(tabs)',
}: AdvancedRouteGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // 获取当前路由路径
  const currentPath = `/${segments.join('/')}`;

  // 查找当前路由的权限配置
  const routePermission = routePermissions.find(route => 
    currentPath.startsWith(route.path)
  );

  // 检查权限 - 移到组件顶层
  const { canAccess } = useAuthGuard(
    routePermission?.permission,
    routePermission?.roles,
    routePermission?.requireAllRoles
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    // 如果没有找到权限配置，使用默认逻辑
    if (!routePermission) {
      if (!isAuthenticated) {
        router.replace(defaultRedirect);
      }
      return;
    }

    // 检查认证状态
    if (!isAuthenticated) {
      router.replace(defaultRedirect);
      return;
    }

    // 检查权限
    if (!canAccess) {
      router.replace(unauthorizedRedirect);
      return;
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

// 路由权限检查 Hook
export function useRoutePermission(route: string) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const currentPath = `/${segments.join('/')}`;
  const isCurrentRoute = currentPath === route;

  const navigateToRoute = (targetRoute: string) => {
    router.push(targetRoute);
  };

  const canAccessRoute = React.useCallback((targetRoute: string, permission?: PermissionCheck, roles?: string[]) => {
    if (!isAuthenticated) {
      return false;
    }

    if (permission || roles) {
      // 这里不能直接调用Hook，需要从外部传入权限检查结果
      return false; // 临时返回false，实际使用时需要传入权限检查结果
    }

    return true;
  }, [isAuthenticated]);

  return {
    isCurrentRoute,
    navigateToRoute,
    canAccessRoute,
    currentPath,
  };
}

// 条件路由组件
interface ConditionalRouteProps {
  readonly
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ConditionalRoute({
  condition,
  children,
  fallback,
  redirectTo,
}: ConditionalRouteProps) {
  const router = useRouter();

  useEffect(() => {
    if (!condition && redirectTo) {
      router.replace(redirectTo);
    }
  }, [condition, redirectTo, router]);

  if (!condition) {
    return fallback || null;
  }

  return <>{children}</>;
}

// 路由监听器 Hook
export function useRouteChange() {
  const segments = useSegments();
  const [previousPath, setPreviousPath] = React.useState<string>('');

  const currentPath = `/${segments.join('/')}`;

  useEffect(() => {
    if (previousPath !== currentPath) {
      // 路由发生变化
      console.log('Route changed from', previousPath, 'to', currentPath);
      setPreviousPath(currentPath);
    }
  }, [currentPath, previousPath]);

  return {
    currentPath,
    previousPath,
    hasRouteChanged: previousPath !== currentPath,
  };
}
