/**
 * 权限
 */
export interface Permission {
  id?: string;
  resourceName: string;
  resourceTitle: string;
  action: string;
  actionTitle: string;
  code: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 权限分组
 */
export interface PermissionGroup {
  resourceName: string;
  resourceTitle: string;
  permissions: Permission[];
}

/**
 * 用户权限响应
 */
export interface UserPermissionsResponse {
  rolePermissions: Permission[];
  customPermissions: Permission[];
  allPermissionCodes: string[];
}

/**
 * 创建权限请求
 */
export interface CreatePermissionRequest {
  resourceName: string;
  resourceTitle: string;
  action: string;
  actionTitle: string;
  description?: string;
}

/**
 * 更新权限请求
 */
export interface UpdatePermissionRequest {
  resourceName?: string;
  resourceTitle?: string;
  action?: string;
  actionTitle?: string;
  description?: string;
}

/**
 * 分配权限请求
 */
export interface AssignPermissionsRequest {
  permissionIds: string[];
}

