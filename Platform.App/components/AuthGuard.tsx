/**
 * 认证守卫组件
 * 控制组件的访问权限
 */

import React, { ReactNode, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCheck } from '@/types/unified-api';
import { canAccess } from '@/utils/guardUtils';

interface AuthGuardProps {
  readonly children: ReactNode;
  requireAuth?: boolean;
  permission?: PermissionCheck;
  roles?: string[];
  requireAllRoles?: boolean;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

/**
 * 权限守卫组件
 */
export function AuthGuard({
  children,
  requireAuth = true,
  permission,
  roles,
  requireAllRoles = false,
  fallback,
  loadingComponent,
  errorComponent,
}: Readonly<AuthGuardProps>) {
  const { isAuthenticated, loading, error } = useAuth();
  const { checkPermission, checkAllRoles, checkAnyRole } = usePermissions();

  // 检查访问权限
  const hasAccess = useMemo(() => {
    if (loading || error) {
      return false;
    }

    if (requireAuth && !isAuthenticated) {
      return false;
    }

    if (permission && !checkPermission(permission)) {
      return false;
    }

    if (roles && roles.length > 0) {
      const hasRequiredRoles = requireAllRoles 
        ? checkAllRoles(roles)
        : checkAnyRole(roles);
      
      if (!hasRequiredRoles) {
        return false;
      }
    }

    return true;
  }, [
    loading,
    error,
    requireAuth,
    isAuthenticated,
    permission,
    roles,
    requireAllRoles,
    checkPermission,
    checkAllRoles,
    checkAnyRole,
  ]);

  // 显示加载状态
  if (loading) {
    return loadingComponent || (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // 显示错误状态
  if (error) {
    return errorComponent || (
      <View style={styles.container}>
        <Text style={styles.errorText}>认证错误: {error.message}</Text>
      </View>
    );
  }

  // 检查权限
  if (!hasAccess) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.messageText}>
          {!isAuthenticated ? '请先登录' : '权限不足'}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * 高阶组件版本的认证守卫
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardOptions: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...guardOptions}>
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };
}

/**
 * 权限检查 Hook
 */
export function useAuthGuard(
  permission?: PermissionCheck,
  roles?: string[],
  requireAllRoles = false
) {
  const { isAuthenticated, user, loading, error } = useAuth();

  const hasAccess = useMemo(() => {
    return canAccess(user, isAuthenticated, permission, roles, requireAllRoles);
  }, [user, isAuthenticated, permission, roles, requireAllRoles]);

  return {
    canAccess: hasAccess,
    isAuthenticated,
    loading,
    error,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4d4f',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
