/**
 * 统一错误处理器
 * 提供统一的错误处理和错误消息映射
 */

import { AuthError, AuthErrorType } from '@/types/unified-api';

// API 错误接口
export interface ApiError extends Error {
  response?: {
    status: number;
    statusText: string;
    data?: any;
  };
  code?: string;
}

// 错误代码到消息的映射
const ERROR_MESSAGES: Record<string, string> = {
  // 认证错误
  INVALID_USERNAME: '用户名不能为空',
  INVALID_PASSWORD: '密码不能为空',
  INVALID_USERNAME_LENGTH: '用户名长度必须在3-20个字符之间',
  WEAK_PASSWORD: '密码长度至少6个字符',
  INVALID_EMAIL: '邮箱格式不正确',
  USER_EXISTS: '用户名已存在',
  EMAIL_EXISTS: '邮箱已被使用',
  USER_NOT_FOUND: '用户不存在或已被禁用',
  INVALID_CURRENT_PASSWORD: '当前密码不正确',
  INVALID_NEW_PASSWORD: '新密码不能为空',
  INVALID_CONFIRM_PASSWORD: '确认密码不能为空',
  PASSWORD_MISMATCH: '新密码和确认密码不一致',
  SAME_PASSWORD: '新密码不能与当前密码相同',
  UNAUTHORIZED: '用户未认证',
  
  // 系统错误
  UPDATE_FAILED: '更新失败',
  REGISTER_ERROR: '注册失败',
  CHANGE_PASSWORD_ERROR: '修改密码失败',
  REFRESH_TOKEN_ERROR: '刷新token失败',
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  TIMEOUT: '请求超时，请检查网络连接',
};

// HTTP状态码到错误类型的映射
const HTTP_STATUS_TO_ERROR_TYPE: Record<number, AuthErrorType> = {
  401: AuthErrorType.TOKEN_EXPIRED,
  403: AuthErrorType.PERMISSION_DENIED,
  404: AuthErrorType.UNKNOWN_ERROR,
  429: AuthErrorType.LOGIN_FAILED,
  500: AuthErrorType.UNKNOWN_ERROR,
  503: AuthErrorType.UNKNOWN_ERROR,
};

/**
 * 获取错误消息
 */
export function getErrorMessage(errorCode?: string, defaultMessage?: string): string {
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }
  return defaultMessage || '操作失败，请稍后重试';
}

/**
 * 根据错误代码判断是否可重试
 */
export function isRetryableError(errorCode?: string): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'UPDATE_FAILED',
    'REGISTER_ERROR',
    'CHANGE_PASSWORD_ERROR',
    'REFRESH_TOKEN_ERROR',
  ];
  return errorCode ? retryableCodes.includes(errorCode) : false;
}

/**
 * 根据错误代码获取错误类型
 */
export function getErrorType(errorCode?: string): AuthErrorType {
  const errorTypeMap: Record<string, AuthErrorType> = {
    INVALID_USERNAME: AuthErrorType.LOGIN_FAILED,
    INVALID_PASSWORD: AuthErrorType.LOGIN_FAILED,
    USER_NOT_FOUND: AuthErrorType.LOGIN_FAILED,
    INVALID_CURRENT_PASSWORD: AuthErrorType.LOGIN_FAILED,
    LOGIN_FAILED: AuthErrorType.LOGIN_FAILED,
    CAPTCHA_REQUIRED: AuthErrorType.LOGIN_FAILED, // 需要验证码，属于登录失败
    CAPTCHA_INVALID: AuthErrorType.LOGIN_FAILED, // 验证码错误，属于登录失败
    UNAUTHORIZED: AuthErrorType.TOKEN_EXPIRED,
    PERMISSION_DENIED: AuthErrorType.PERMISSION_DENIED,
    NETWORK_ERROR: AuthErrorType.NETWORK_ERROR,
    TIMEOUT: AuthErrorType.NETWORK_ERROR,
  };
  
  return errorCode && errorTypeMap[errorCode] 
    ? errorTypeMap[errorCode] 
    : AuthErrorType.UNKNOWN_ERROR;
}

/**
 * 处理 HTTP 错误响应
 */
export function handleHttpError(status: number, errorData?: any): AuthError {
  const errorType = HTTP_STATUS_TO_ERROR_TYPE[status] || AuthErrorType.UNKNOWN_ERROR;
  
  // 优先使用后端返回的错误消息
  let message = errorData?.errorMessage || errorData?.message || errorData?.error;
  
  // 如果没有后端消息，使用默认消息
  if (!message) {
    switch (status) {
      case 401:
        message = '用户名或密码错误，请检查后重试';
        break;
      case 403:
        message = '账户已被禁用，请联系管理员';
        break;
      case 429:
        message = '登录尝试次数过多，请稍后再试';
        break;
      case 500:
        message = '服务器错误，请稍后重试';
        break;
      default:
        message = `HTTP ${status}: 请求失败`;
    }
  }
  
  // 保存错误代码（从 errorData 中提取 errorCode）
  const errorCode = errorData?.errorCode || errorData?.type;
  
  return {
    type: errorType,
    message,
    code: errorCode, // 保存错误代码，用于前端判断是否需要显示验证码
    retryable: status >= 500 || status === 408 || status === 429,
  };
}

/**
 * 处理网络错误
 */
export function handleNetworkError(error: any): AuthError {
  // 检查是否是超时错误
  if (error?.name === 'AbortError' || error?.code === 'TIMEOUT') {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: '请求超时，请检查网络连接',
      retryable: true,
    };
  }
  
  // 检查是否是网络连接错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: '网络连接失败，请检查网络设置',
      retryable: true,
    };
  }
  
  // 检查是否有自定义错误代码
  if (error?.code === 'NETWORK_ERROR') {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: '网络连接异常，请检查网络设置后重试',
      retryable: true,
    };
  }
  
  return {
    type: AuthErrorType.UNKNOWN_ERROR,
    message: error?.message || '操作失败，请稍后重试',
    retryable: true,
  };
}

/**
 * 统一的错误处理函数
 */
export function handleError(error: any): AuthError {
  // 提取错误代码（尝试多个可能的字段）
  // 1. 直接从 error 对象提取
  // 2. 从 error.response.data 提取（可能是 ApiResponse 格式）
  // 3. 从 error.response.data.data 提取（嵌套结构）
  let errorCode = error?.code || error?.errorCode;
  
  // 如果还没有找到，尝试从 response.data 中提取
  if (!errorCode && error?.response?.data) {
    const errorData = error.response.data;
    
    // 如果 errorData 是 ApiResponse 格式（有 success 字段）
    if (typeof errorData === 'object' && 'errorCode' in errorData) {
      errorCode = errorData.errorCode;
    }
    // 如果 errorData 是嵌套结构（error.response.data.data.errorCode）
    else if (typeof errorData === 'object' && errorData.data && typeof errorData.data === 'object' && 'errorCode' in errorData.data) {
      errorCode = errorData.data.errorCode;
    }
  }
  
  // 如果已经是 AuthError，直接返回（但保留原始 errorCode）
  if (error?.type && error?.message) {
    const authError = error as AuthError;
    // 如果原始错误有 errorCode 但 AuthError 没有，则添加
    if (errorCode && !authError.code) {
      return {
        ...authError,
        code: errorCode,
      };
    }
    return authError;
  }
  
  // 处理 HTTP 错误（包括 status 200 但 success 为 false 的情况）
  if (error?.response?.status !== undefined) {
    const status = error.response.status;
    const errorData = error.response.data;
    
    // 如果 status 是 200 但 success 为 false，优先使用 errorCode 而不是 HTTP 状态码
    if (status === 200 && errorData) {
      // 再次尝试从 errorData 中提取 errorCode（如果之前没有找到）
      if (!errorCode && typeof errorData === 'object') {
        if ('errorCode' in errorData) {
          errorCode = errorData.errorCode;
        } else if (errorData.data && typeof errorData.data === 'object' && 'errorCode' in errorData.data) {
          errorCode = errorData.data.errorCode;
        }
      }
      
      if (errorCode) {
        const errorType = getErrorType(errorCode);
        const errorMessage = error.message || 
                           (typeof errorData === 'object' && 'errorMessage' in errorData ? errorData.errorMessage : undefined) ||
                           getErrorMessage(errorCode);
        return {
          type: errorType,
          message: errorMessage,
          code: errorCode,
          retryable: isRetryableError(errorCode),
        };
      }
    }
    
    return handleHttpError(status, errorData);
  }
  
  // 处理从 api.ts 传递的错误（有 errorCode 但没有 response）
  if (errorCode) {
    const errorType = getErrorType(errorCode);
    return {
      type: errorType,
      message: error.message || getErrorMessage(errorCode),
      code: errorCode,
      retryable: isRetryableError(errorCode),
    };
  }
  
  // 处理网络错误
  return handleNetworkError(error);
}

/**
 * 创建认证错误
 */
export function createAuthError(
  type: AuthErrorType,
  message: string,
  retryable = false
): AuthError {
  return { type, message, retryable };
}

