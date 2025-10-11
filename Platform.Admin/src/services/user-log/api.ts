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

