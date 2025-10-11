/**
 * 用户活动日志
 */
export interface UserActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

/**
 * 获取用户活动日志参数
 */
export interface GetUserActivityLogsParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

