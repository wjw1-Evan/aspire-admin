import { request } from '@umijs/max';
import type {
  Permission,
  PermissionGroup,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  UserPermissionsResponse,
  AssignPermissionsRequest,
} from './types';

/**
 * 获取所有权限
 */
export async function getAllPermissions() {
  return request<API.ApiResponse<Permission[]>>('/api/permission', {
    method: 'GET',
  });
}

/**
 * 按资源分组获取权限
 */
export async function getPermissionsGrouped() {
  return request<API.ApiResponse<PermissionGroup[]>>('/api/permission/grouped', {
    method: 'GET',
  });
}

/**
 * 根据ID获取权限
 */
export async function getPermissionById(id: string) {
  return request<API.ApiResponse<Permission>>(`/api/permission/${id}`, {
    method: 'GET',
  });
}

/**
 * 按资源获取权限
 */
export async function getPermissionsByResource(resource: string) {
  return request<API.ApiResponse<Permission[]>>(`/api/permission/by-resource/${resource}`, {
    method: 'GET',
  });
}

/**
 * 创建权限
 */
export async function createPermission(data: CreatePermissionRequest) {
  return request<API.ApiResponse<Permission>>('/api/permission', {
    method: 'POST',
    data,
  });
}

/**
 * 更新权限
 */
export async function updatePermission(id: string, data: UpdatePermissionRequest) {
  return request<API.ApiResponse<boolean>>(`/api/permission/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除权限
 */
export async function deletePermission(id: string) {
  return request<API.ApiResponse<boolean>>(`/api/permission/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 初始化系统默认权限
 */
export async function initializePermissions() {
  return request<API.ApiResponse<any>>('/api/permission/initialize', {
    method: 'POST',
  });
}

/**
 * 获取角色权限
 */
export async function getRolePermissions(roleId: string) {
  return request<API.ApiResponse<Permission[]>>(`/api/role/${roleId}/permissions`, {
    method: 'GET',
  });
}

/**
 * 分配权限到角色
 */
export async function assignPermissionsToRole(
  roleId: string,
  data: AssignPermissionsRequest,
) {
  return request<API.ApiResponse<boolean>>(`/api/role/${roleId}/permissions`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取用户权限
 */
export async function getUserPermissions(userId: string) {
  return request<API.ApiResponse<UserPermissionsResponse>>(`/api/user/${userId}/permissions`, {
    method: 'GET',
  });
}

/**
 * 分配自定义权限给用户
 */
export async function assignCustomPermissions(
  userId: string,
  data: AssignPermissionsRequest,
) {
  return request<API.ApiResponse<boolean>>(`/api/user/${userId}/custom-permissions`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取我的权限
 */
export async function getMyPermissions() {
  return request<API.ApiResponse<UserPermissionsResponse>>('/api/user/my-permissions', {
    method: 'GET',
  });
}

