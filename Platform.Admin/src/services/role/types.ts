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
}

/**
 * 带统计信息的角色
 */
export interface RoleWithStats extends Role {
  userCount?: number;
  menuCount?: number;
}

/**
 * 角色统计信息
 */
export interface RoleStatistics {
  totalRoles: number;
  activeRoles: number;
  totalUsers: number;
  totalMenus: number;
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

