import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 用户信息接口
 */
export interface AppUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 用户列表响应
 */
export interface UserListResponse {
  list: AppUser[];
  total: number;
}

/**
 * 获取所有用户
 */
export async function getAllUsers(options?: Record<string, any>) {
  return request<ApiResponse<UserListResponse>>('/api/users/all', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 根据ID获取用户
 */
export async function getUserById(id: string, options?: Record<string, any>) {
  return request<ApiResponse<AppUser>>(`/api/users/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取用户列表（分页）
 */
export async function getUserList(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
  },
  options?: Record<string, any>,
) {
  return request<ApiResponse<UserListResponse>>('/api/users/list', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}

