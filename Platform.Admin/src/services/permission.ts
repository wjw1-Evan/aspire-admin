import { api } from '@/utils/apiClient';

/**
 * 获取当前用户的权限信息
 */
export async function getMyPermissions() {
  return api.permission.getMyPermissions();
}

/**
 * 获取指定用户的权限信息
 * @param userId 用户ID
 */
export async function getUserPermissions(userId: string) {
  return api.permission.getUserPermissions(userId);
}

/**
 * 为用户分配自定义权限
 * @param userId 用户ID
 * @param permissions 权限数据
 */
export async function assignUserPermissions(userId: string, permissions: any) {
  return api.permission.assignPermissions(userId, permissions);
}
