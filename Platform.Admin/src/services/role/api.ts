import { request } from '@umijs/max';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignMenusToRoleRequest,
  RoleListResponse,
} from './types';

/**
 * 获取所有角色
 */
export async function getAllRoles(options?: Record<string, any>) {
  return request<API.ApiResponse<RoleListResponse>>('/api/role', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取所有角色（带统计信息）
 */
export async function getAllRolesWithStats(options?: Record<string, any>) {
  return request<API.ApiResponse<any>>('/api/role/with-stats', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 根据ID获取角色
 */
export async function getRoleById(id: string, options?: Record<string, any>) {
  return request<API.ApiResponse<Role>>(`/api/role/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 创建角色
 */
export async function createRole(data: CreateRoleRequest, options?: Record<string, any>) {
  return request<API.ApiResponse<Role>>('/api/role', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 更新角色
 */
export async function updateRole(
  id: string,
  data: UpdateRoleRequest,
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<boolean>>(`/api/role/${id}`, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

/**
 * 删除角色
 */
export async function deleteRole(id: string, reason?: string, options?: Record<string, any>) {
  return request<API.ApiResponse<boolean>>(`/api/role/${id}`, {
    method: 'DELETE',
    params: { reason },
    ...(options || {}),
  });
}

/**
 * 为角色分配菜单权限
 */
export async function assignMenusToRole(
  id: string,
  data: AssignMenusToRoleRequest,
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<boolean>>(`/api/role/${id}/menus`, {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 获取角色的菜单权限
 */
export async function getRoleMenus(id: string, options?: Record<string, any>) {
  return request<API.ApiResponse<string[]>>(`/api/role/${id}/menus`, {
    method: 'GET',
    ...(options || {}),
  });
}

