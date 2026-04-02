import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types/unified-api';
import type { UserActivityLog, GetUserActivityLogsParams } from './types';

export async function getUserActivityLogs(
  params?: GetUserActivityLogsParams,
  options?: Record<string, any>,
) {
  return request<ApiResponse<PagedResult<UserActivityLog>>>('/api/users/activity-logs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

export interface ActivityLogStatistics {
  total: number;
  successCount: number;
  errorCount: number;
  actionTypes: Array<{
    action: string;
    count: number;
  }>;
}

export async function getActivityLogStatistics(
  params?: GetUserActivityLogsParams,
  options?: Record<string, any>,
) {
  return request<ApiResponse<ActivityLogStatistics>>('/api/users/activity-logs/statistics', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

export interface ActivityLogWithSummary {
  queryable: UserActivityLog[];
  rowCount: number;
  currentPage: number;
  pageSize: number;
  summary: {
    totalCount: number;
    successCount: number;
    errorCount: number;
    actionTypesCount: number;
  };
}

/**
 * 获取指定活动日志详情（管理员端）
 */
export async function getActivityLogById(
  logId: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<UserActivityLog>>(`/api/users/activity-logs/${logId}`, {
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
  return request<ApiResponse<ActivityLogWithSummary>>('/api/users/me/activity-logs-paged', {
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
  return request<ApiResponse<UserActivityLog>>(`/api/users/me/activity-logs/${logId}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取当前用户的活动日志统计信息
 */
export async function getCurrentUserActivityLogStatistics(
  params?: {
    action?: string;
    httpMethod?: string;
    statusCode?: number;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: Record<string, any>,
) {
  return request<ApiResponse<ActivityLogStatistics>>('/api/users/me/activity-logs/statistics', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}
