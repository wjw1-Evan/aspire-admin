import { request } from '@umijs/max';
import type { UserActivityLog, GetUserActivityLogsParams } from './types';

/**
 * 获取所有用户活动日志
 */
export async function getUserActivityLogs(
  params?: GetUserActivityLogsParams,
  options?: Record<string, any>,
) {
  return request<
    API.ApiResponse<{
      data: UserActivityLog[];
      total: number;
      page: number;
      pageSize: number;
      totalPages?: number;
    }>
  >('/api/users/activity-logs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/**
 * 获取指定活动日志详情（管理员端）
 */
export async function getActivityLogById(
  logId: string,
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<UserActivityLog>>(`/api/users/activity-logs/${logId}`, {
    method: 'GET',
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
  }>>('/api/user/me/activity-logs-paged', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/**
 * 获取当前用户的活动日志详情（根据日志ID）
 * ✅ 返回完整的日志数据，包括 ResponseBody 等所有字段
 */
export async function getCurrentUserActivityLogById(
  logId: string,
  options?: Record<string, any>,
) {
  return request<API.ApiResponse<UserActivityLog>>(`/api/user/me/activity-logs/${logId}`, {
    method: 'GET',
    ...(options || {}),
  });
}

