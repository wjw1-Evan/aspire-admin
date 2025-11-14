import { request } from '@umijs/max';
import type { UserActivityLog, GetUserActivityLogsParams } from './types';

/**
 * 获取所有用户活动日志
 */
export async function getUserActivityLogs(
  params?: GetUserActivityLogsParams,
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<UserActivityLog[]> & { total: number; page: number; pageSize: number; totalPages: number }>('/api/users/activity-logs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/**
 * 获取当前用户的活动日志（分页）
 */
export async function getCurrentUserActivityLogs(
  params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    httpMethod?: string;
    statusCode?: number;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<{
    data: UserActivityLog[];
    total: number;
    page: number;
    pageSize: number;
  }>>('/api/user/my-activity-logs-paged', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

