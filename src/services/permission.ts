import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 权限响应类型定义
 */
export interface PermissionResponse {
  allPermissionCodes: string[];
  rolePermissions?: string[];
  customPermissions?: string[];
}

/**
 * 获取当前用户的所有权限
 */
export async function getMyPermissions(options?: { [key: string]: any }) {
  return request<ApiResponse<PermissionResponse>>('/api/user/my-permissions', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取指定用户的权限
 */
export async function getUserPermissions(userId: string, options?: { [key: string]: any }) {
  return request<ApiResponse<PermissionResponse>>(`/api/user/${userId}/permissions`, {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 为用户分配自定义权限
 */
export async function assignPermissions(
  userId: string,
  data: { permissionIds: string[] },
  options?: { [key: string]: any }
) {
  return request<ApiResponse<boolean>>(`/api/user/${userId}/custom-permissions`, {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
