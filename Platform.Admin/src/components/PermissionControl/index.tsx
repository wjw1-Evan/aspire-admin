import type React from 'react';
import { PermissionGuard } from '@/components/PermissionGuard';

interface PermissionControlProps {
  readonly permission?: string; // 例如 "user:create"
  readonly role?: string; // 例如 "admin"
  readonly resource?: string; // 例如 "user"
  readonly action?: string; // 例如 "create"
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
  readonly requireAll?: boolean; // 是否需要全部权限
}

/**
 * 权限控制组件（简化版本）
 * 修复：使用统一的权限守卫组件，支持多种权限检查方式
 * 
 * 用法：
 * <PermissionControl permission="user:create">
 *   <Button>创建用户</Button>
 * </PermissionControl>
 * 
 * <PermissionControl resource="user" action="create">
 *   <Button>创建用户</Button>
 * </PermissionControl>
 * 
 * <PermissionControl role="admin">
 *   <Button>管理员功能</Button>
 * </PermissionControl>
 */
export default function PermissionControl({
  permission,
  role,
  resource,
  action,
  children,
  fallback = null,
  requireAll = false,
}: PermissionControlProps) {
  return (
    <PermissionGuard
      permission={permission}
      role={role}
      resource={resource}
      action={action}
      fallback={fallback}
      requireAll={requireAll}
    >
      {children}
    </PermissionGuard>
  );
}

