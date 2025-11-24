import { request } from '@umijs/max';

/**
 * 用户权限信息
 */
interface UserPermissions {
  allPermissionCodes?: string[];
  [key: string]: any;
}

/**
 * 获取当前用户的权限信息
 */
export async function getMyPermissions(options?: Record<string, any>) {
  return request<API.ApiResponse<UserPermissions>>('/api/user/me/permissions', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取指定用户的权限信息
 * @param userId 用户ID
 */
export async function getUserPermissions(userId: string, options?: Record<string, any>) {
  return request<API.ApiResponse<UserPermissions>>(`/api/user/${userId}/permissions`, {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 为用户分配自定义权限
 * @param userId 用户ID
 * @param permissions 权限数据
 */
export async function assignUserPermissions(
  userId: string,
  permissions: any,
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<boolean>>(`/api/user/${userId}/custom-permissions`, {
    method: 'POST',
    data: permissions,
    ...(options || {}),
  });
}
