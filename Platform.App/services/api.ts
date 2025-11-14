/**
 * API 服务
 * 提供统一的网络请求接口和 token 管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/constants/apiConfig';
import {
  DEFAULT_REQUEST_CONFIG,
  STORAGE_KEYS,
  RequestConfig,
  calculateRetryDelay,
  shouldRetryError,
} from './apiConfig';
import { handleError, ApiError, createAuthError } from './errorHandler';
import { AuthErrorType } from '@/types/unified-api';

class ApiService {
  private authStateChangeListeners: (() => void)[] = [];
  private isHandlingAuthFailure = false;

  /**
   * 获取 API 基础 URL
   */
  private getBaseURL(): string {
    return getApiBaseUrl();
  }

  /**
   * 添加认证状态变化监听器
   */
  addAuthStateChangeListener(listener: () => void): void {
    this.authStateChangeListeners.push(listener);
  }

  /**
   * 移除认证状态变化监听器
   */
  removeAuthStateChangeListener(listener: () => void): void {
    this.authStateChangeListeners = this.authStateChangeListeners.filter(l => l !== listener);
  }

  /**
   * 触发认证状态变化事件
   */
  private triggerAuthStateChange(): void {
    this.authStateChangeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in auth state change listener:', error);
      }
    });
  }

  /**
   * 处理认证失败（防止重复调用）
   */
  private handleAuthFailure(): void {
    // 如果正在处理，直接返回，避免重复处理
    if (this.isHandlingAuthFailure) {
      return;
    }

    this.isHandlingAuthFailure = true;

    // 异步执行，不阻塞调用者
    void (async () => {
      try {
        console.log('API: Authentication failed, clearing tokens');
        await this.clearAllTokens();
      } catch (error) {
        console.error('Failed to handle auth failure:', error);
      } finally {
        // 延迟重置标志，防止短时间内重复触发
        setTimeout(() => {
          this.isHandlingAuthFailure = false;
        }, 500);
      }
    })();
  }

  /**
   * 基础请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout = DEFAULT_REQUEST_CONFIG.timeout
  ): Promise<T> {
    const url = `${this.getBaseURL()}${endpoint}`;
    
    const headers = new Headers(options.headers as HeadersInit | undefined);

    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // 添加认证头
    const token = await this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 处理认证错误
      if (response.status === 401 || response.status === 403) {
        // handleAuthFailure 内部已经防止重复调用，并且是异步非阻塞的
        this.handleAuthFailure();
        throw createAuthError(
          response.status === 401 ? AuthErrorType.TOKEN_EXPIRED : AuthErrorType.PERMISSION_DENIED,
          response.status === 401 ? '登录已过期，请重新登录' : '权限不足',
          false
        );
      }
      
      // 处理其他错误
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error = new Error(errorData.message) as ApiError;
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        if (errorData.errorCode) {
          (error as any).errorCode = errorData.errorCode;
        }
        throw error;
      }

      return await this.parseSuccessResponse<T>(response);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      // 处理超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('请求超时，请检查网络连接') as ApiError;
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      
      // 处理网络错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error('网络连接失败，请检查网络设置') as ApiError;
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      }
      
      throw error;
    }
  }

  /**
   * 解析错误响应
   */
  private async parseErrorResponse(response: Response): Promise<{
    message: string;
    errorCode?: string;
  }> {
    try {
      const errorData = await response.json();
      return {
        message: errorData.errorMessage || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        errorCode: errorData.errorCode || errorData.type,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const contentLength = response.headers.get('content-length');
    const isEmptyContentLength = contentLength !== null && Number(contentLength) === 0;
    const contentType = response.headers.get('content-type') ?? '';

    if (isEmptyContentLength) {
      return undefined as T;
    }

    const rawText = await response.text();
    if (!rawText) {
      return undefined as T;
    }

    if (contentType.includes('application/json') || contentType === '') {
      try {
        return JSON.parse(rawText) as T;
      } catch (error) {
        const parseError = new Error('无效的 JSON 响应') as ApiError;
        parseError.code = 'INVALID_JSON_RESPONSE';
        (parseError as ApiError).response = {
          status: response.status,
          statusText: response.statusText,
          data: { message: rawText },
        };
        throw parseError;
      }
    }

    return rawText as unknown as T;
  }

  /**
   * 带重试的请求方法
   */
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const { timeout, retries } = { ...DEFAULT_REQUEST_CONFIG, ...config };
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.request<T>(endpoint, options, timeout);
      } catch (error) {
        lastError = error;
        
        // 如果是认证错误，不重试
        const authError = handleError(error);
        if (authError.type === AuthErrorType.TOKEN_EXPIRED || 
            authError.type === AuthErrorType.PERMISSION_DENIED) {
          throw authError;
        }
        
        // 如果不是最后一次尝试且可以重试，等待后重试
        if (attempt < retries && shouldRetryError(error)) {
          await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt)));
        } else if (attempt >= retries) {
          break;
        }
      }
    }
    
    throw handleError(lastError);
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, { method: 'GET' }, config);
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }

  /**
   * POST 表单请求（multipart/form-data）
   */
  async postForm<T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: formData,
    }, config);
  }

  /**
   * PUT 请求
   */
  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }

  /**
   * DELETE 请求
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, { method: 'DELETE' }, config);
  }

  // ==================== Token 管理 ====================

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch (error) {
      console.error('Failed to set token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Failed to set refresh token:', error);
    }
  }

  async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Failed to remove refresh token:', error);
    }
  }

  async getTokenExpiresAt(): Promise<number | null> {
    try {
      const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);
      return expiresAt ? parseInt(expiresAt, 10) : null;
    } catch (error) {
      console.error('Failed to get token expires at:', error);
      return null;
    }
  }

  async setTokenExpiresAt(expiresAt: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt.toString());
    } catch (error) {
      console.error('Failed to set token expires at:', error);
    }
  }

  async removeTokenExpiresAt(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES);
    } catch (error) {
      console.error('Failed to remove token expires at:', error);
    }
  }

  async setTokens(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
    try {
      const items: [string, string][] = [
        [STORAGE_KEYS.TOKEN, token],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ];
      if (expiresAt) {
        items.push([STORAGE_KEYS.TOKEN_EXPIRES, expiresAt.toString()]);
      }
      await AsyncStorage.multiSet(items);
    } catch (error) {
      console.error('Failed to set tokens:', error);
    }
  }

  async clearAllTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRES,
      ]);
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to clear all tokens:', error);
    }
  }

  /**
   * 验证 token 有效性
   */
  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      const response = await fetch(`${this.getBaseURL()}/currentUser`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        // handleAuthFailure 内部已经防止重复调用，并且是异步非阻塞的
        this.handleAuthFailure();
        return false;
      }

      if (!response.ok) {
        return false;
      }

      try {
        const data = await response.json();
        if (data && typeof data === 'object') {
          if (data.success === false || (data.data && data.data.isLogin === false)) {
            return false;
          }
          return true;
        }
      } catch {
        return false;
      }

      return true;
    } catch (error) {
      console.error('API: Token validation error:', error);
      return false;
    }
  }

  /**
   * 检查网络连接状态
   */
  async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${this.getBaseURL()}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        clearTimeout(timeoutId);
        return false;
      }
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
