import React from 'react';
import { useAuthState } from '@/hooks/useAuthState';

interface PermissionControlProps {
  /** 资源名称 */
  resource: string;
  /** 操作名称 */
  action: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 无权限时是否显示占位符 */
  showPlaceholder?: boolean;
}

/**
 * 权限控制组件
 * 根据用户的权限控制子元素的显示
 */
const PermissionControl: React.FC<PermissionControlProps> = ({
  resource,
  action,
  children,
  showPlaceholder = false,
}) => {
  const { can } = useAuthState();
  const hasPermission = can(resource, action);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showPlaceholder) {
    return <span style={{ opacity: 0.5 }}>{children}</span>;
  }

  return null;
};

export default PermissionControl;
