/**
 * 错误处理工具函数
 * 用于提取和格式化错误信息
 */

/**
 * 提取错误代码
 */
export function getErrorCode(error: any): string | undefined {
  if (error?.code) {
    return error.code;
  }
  if (error?.errorCode) {
    return error.errorCode;
  }
  if (error?.response?.data?.errorCode) {
    return error.response.data.errorCode;
  }
  if (error?.response?.data?.data?.errorCode) {
    return error.response.data.data.errorCode;
  }
  return undefined;
}

/**
 * 提取错误消息
 */
export function getErrorMessage(error: any, defaultMessage = '操作失败，请重试'): string {
  if (error?.message) {
    return error.message;
  }
  if (error?.response?.data?.errorMessage) {
    return error.response.data.errorMessage;
  }
  if (error?.response?.data?.data?.errorMessage) {
    return error.response.data.data.errorMessage;
  }
  if (error?.errorMessage) {
    return error.errorMessage;
  }
  if (error?.info?.errorMessage) {
    return error.info.errorMessage;
  }
  return defaultMessage;
}

