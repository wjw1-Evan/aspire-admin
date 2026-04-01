/**
 * API 响应处理工具文件（统一来源，匹配后端新格式）
 */

// 统一 API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  timestamp?: string;
  traceId?: string;
}

/**
 * 分页响应格式 (PagedResult<T>)
 * 不强制在前端使用，作为潜在的分页辅助结构保留
 */
export interface PagedResult<T> {
  queryable?: T[];
  currentPage?: number;
  pageSize?: number;
  rowCount?: number;
  pageCount?: number;
}

/**
 * 检查 API 响应是否成功
 * @param response API 响应对象
 * @returns 是否成功
 */
export function isResponseSuccess<T>(response: ApiResponse<T>): boolean {
  return response?.success === true;
}

/**
 * 获取 API 响应的成功消息
 * @param response API 响应对象
 * @returns 成功消息
 */
export function getSuccessMessage<T>(response: ApiResponse<T>): string {
  return response?.message ?? '';
}

/**
 * 检查 API 响应中的数据是否有效
 * @param response API 响应对象
 */
export function isDataValid<T extends { isLogin?: boolean }>(response: ApiResponse<T>): boolean {
  if (!isResponseSuccess(response)) {
    return false;
  }
  if (response.data && 'isLogin' in (response.data as any)) {
    return (response.data as any).isLogin !== false;
  }
  return true;
}

/**
 * 获取 API 响应的错误消息
 * @param response API 响应对象
 * @param defaultMessage 默认错误消息
 */
export function getErrorMessage<T>(response: ApiResponse<T>, defaultMessage = '操作失败，请稍后重试'): string {
  return response?.message ?? defaultMessage;
}

/**
 * 提取 API 响应中的数据
 * @param response API 响应对象
 * @param defaultValue 默认值
 */
export function extractData<T>(response: ApiResponse<T>, defaultValue: T | null = null): T | null {
  if (isResponseSuccess(response)) {
    return response?.data as T;
  }
  return defaultValue;
}

/**
 * 处理认证相关的 API 响应
 */
export function isAuthResponseValid<T extends { isLogin?: boolean }>(response: ApiResponse<T>): boolean {
  return isResponseSuccess(response) && isDataValid(response);
}
