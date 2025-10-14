/**
 * 角色
 */
export interface Role {
  id?: string;
  name: string;
  description?: string;
  menuIds: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // 统计字段
  userCount?: number;
  menuCount?: number;
  permissionCount?: number;
}

/**
 * 创建角色请求
 */
export interface CreateRoleRequest {
  name: string;
  description?: string;
  menuIds: string[];
  isActive: boolean;
}

/**
 * 更新角色请求
 */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  menuIds?: string[];
  isActive?: boolean;
}

/**
 * 分配菜单到角色请求
 */
export interface AssignMenusToRoleRequest {
  menuIds: string[];
}

/**
 * 角色列表响应
 */
export interface RoleListResponse {
  roles: Role[];
  total: number;
}

