/**
 * API 响应处理工具函数
 * 用于统一处理后端返回的 API 响应格式
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  errorMessage?: string;
  errorCode?: string;
}

/**
 * 检查 API 响应是否成功
 * @param response API 响应对象
 * @returns 是否成功
 */
export function isResponseSuccess<T>(response: ApiResponse<T>): boolean {
  return response.success === true && response.data !== undefined;
}

/**
 * 检查 API 响应中的数据是否有效
 * 用于处理包含 isLogin 字段的响应
 * @param response API 响应对象
 * @returns 数据是否有效
 */
export function isDataValid<T extends { isLogin?: boolean }>(
  response: ApiResponse<T>
): boolean {
  if (!isResponseSuccess(response)) {
    return false;
  }
  
  // 如果数据中包含 isLogin 字段，确保它不为 false
  if (response.data && 'isLogin' in response.data) {
    return response.data.isLogin !== false;
  }
  
  return true;
}

/**
 * 获取 API 响应的错误消息
 * @param response API 响应对象
 * @param defaultMessage 默认错误消息
 * @returns 错误消息
 */
export function getErrorMessage<T>(
  response: ApiResponse<T>,
  defaultMessage = '操作失败，请稍后重试'
): string {
  return response.errorMessage || defaultMessage;
}

/**
 * 提取 API 响应中的数据
 * @param response API 响应对象
 * @param defaultValue 默认值
 * @returns 数据或默认值
 */
export function extractData<T>(
  response: ApiResponse<T>,
  defaultValue: T | null = null
): T | null {
  if (isResponseSuccess(response)) {
    return response.data as T;
  }
  return defaultValue;
}

/**
 * 处理认证相关的 API 响应
 * @param response API 响应对象
 * @returns 是否认证成功
 */
export function isAuthResponseValid<T extends { isLogin?: boolean }>(
  response: ApiResponse<T>
): boolean {
  return isResponseSuccess(response) && isDataValid(response);
}

