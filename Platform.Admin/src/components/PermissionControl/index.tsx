import type React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionControlProps {
  readonly permission: string; // 例如 "user:create"
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

/**
 * 权限控制组件
 * 用法：
 * <PermissionControl permission="user:create">
 *   <Button>创建用户</Button>
 * </PermissionControl>
 */
export default function PermissionControl({
  permission,
  children,
  fallback = null,
}: PermissionControlProps) {
  const { hasPermission } = usePermission();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

