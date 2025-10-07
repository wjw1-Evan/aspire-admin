// 重新设计的认证守卫组件 - 与Admin端保持统一

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/use-auth';
import { PermissionCheck } from '@/types/auth';

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

// 权限守卫组件
export function AuthGuard({
  children,
  requireAuth = true,
  permission,
  roles,
  requireAllRoles = false,
  fallback,
  loadingComponent,
  errorComponent,
}: AuthGuardProps) {
  const { isAuthenticated, loading, error } = useAuth();
  const { checkPermission, checkAllRoles, checkAnyRole } = usePermissions();

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

  // 检查是否需要认证
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.messageText}>请先登录</Text>
      </View>
    );
  }

  // 检查权限
  if (permission && !checkPermission(permission)) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.messageText}>权限不足</Text>
      </View>
    );
  }

  // 检查角色
  if (roles && roles.length > 0) {
    const hasRequiredRoles = requireAllRoles 
      ? checkAllRoles(roles)
      : checkAnyRole(roles);

    if (!hasRequiredRoles) {
      return fallback || (
        <View style={styles.container}>
          <Text style={styles.messageText}>角色权限不足</Text>
        </View>
      );
    }
  }

  return <>{children}</>;
}

// 高阶组件版本的认证守卫
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

// 权限检查 Hook
export function useAuthGuard(
  permission?: PermissionCheck,
  roles?: string[],
  requireAllRoles = false
) {
  const { isAuthenticated, loading, error } = useAuth();
  const { checkPermission, checkAllRoles, checkAnyRole } = usePermissions();

  const canAccess = React.useMemo(() => {
    if (loading || error) {
      return false;
    }

    if (!isAuthenticated) {
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
    isAuthenticated,
    loading,
    error,
    permission,
    roles,
    requireAllRoles,
    checkPermission,
    checkAllRoles,
    checkAnyRole,
  ]);

  return {
    canAccess,
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
