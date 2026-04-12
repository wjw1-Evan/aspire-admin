import { request } from '@umijs/max';
import type { ApiResponse, PagedResult, PageParams } from '@/types';

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

export interface UserStatisticsResponse {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newUsersThisMonth: number;
}

export interface UserActivityLog {
  id?: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface BulkUserActionRequest {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'delete';
}

export interface CreateUserManagementRequest {
  username: string;
  password: string;
  email?: string;
  role: string;
  isActive: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  age?: number;
}

export async function getAllUsers() {
  return request<ApiResponse<AppUser[]>>('/apiservice/api/users/all', {
    method: 'GET',
  });
}

export async function getUserById(id: string) {
  return request<ApiResponse<AppUser>>(`/apiservice/api/users/${id}`, {
    method: 'GET',
  });
}

export async function getUserList(params: PageParams) {
  return request<ApiResponse<PagedResult<AppUser>>>('/apiservice/api/users/list', {
    params,
  });
}

export async function getUserStatistics() {
  return request<ApiResponse<UserStatisticsResponse>>('/apiservice/api/users/statistics', {
    method: 'GET',
  });
}

export async function deleteUser(userId: string, reason?: string) {
  return request<ApiResponse<{ message: string }>>(`/apiservice/api/users/${userId}`, {
    method: 'DELETE',
    params: reason ? { reason } : undefined,
  });
}

export async function bulkAction(userIds: string[], action: string, reason?: string) {
  return request<ApiResponse<{ message: string }>>('/apiservice/api/users/bulk-action', {
    method: 'POST',
    data: {
      userIds,
      action,
      reason,
    },
  });
}

export async function activateUser(userId: string) {
  return request<ApiResponse<AppUser>>(`/apiservice/api/users/${userId}/activate`, {
    method: 'PUT',
  });
}

export async function deactivateUser(userId: string) {
  return request<ApiResponse<AppUser>>(`/apiservice/api/users/${userId}/deactivate`, {
    method: 'PUT',
  });
}

export async function createUser(data: Partial<AppUser>) {
  return request<ApiResponse<AppUser>>('/apiservice/api/users', {
    method: 'POST',
    data,
  });
}

export async function updateUser(userId: string, data: Partial<AppUser>) {
  return request<ApiResponse<AppUser>>(`/apiservice/api/users/${userId}`, {
    method: 'PUT',
    data,
  });
}
