/**
 * API 配置管理
 * 集中管理 API 相关的配置和常量
 */

// 请求配置接口
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// 默认请求配置
export const DEFAULT_REQUEST_CONFIG: Required<RequestConfig> = {
  timeout: 10000, // 10秒
  retries: 3,
  retryDelay: 1000, // 1秒
};

// Token 存储键
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRES: 'token_expires_at',
} as const;

// Token 过期缓冲时间（毫秒）
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5分钟

// 请求头配置
export const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

// 重试配置
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * 计算重试延迟（指数退避）
 */
export function calculateRetryDelay(attempt: number, config = DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * 检查状态码是否需要重试
 */
export function shouldRetryStatus(status: number): boolean {
  // 5xx 错误和 408 超时错误可以重试
  return status >= 500 || status === 408;
}

/**
 * 检查错误是否需要重试
 */
export function shouldRetryError(error: any): boolean {
  // 网络错误、超时错误可以重试
  if (error?.name === 'AbortError' || error?.code === 'TIMEOUT') {
    return true;
  }
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // 5xx 错误可以重试
  if (error?.response?.status && shouldRetryStatus(error.response.status)) {
    return true;
  }
  
  return false;
}

