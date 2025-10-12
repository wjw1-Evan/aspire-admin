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
  httpMethod?: string;        // HTTP 方法 (GET/POST/PUT/DELETE)
  path?: string;              // 请求路径
  queryString?: string;       // 查询字符串
  statusCode?: number;        // HTTP 状态码
  duration?: number;          // 请求耗时 (毫秒)
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

