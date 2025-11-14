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
  private isClearingTokens = false;

  private getBaseURL = (): string => getApiBaseUrl();

  addAuthStateChangeListener(listener: () => void): void {
    this.authStateChangeListeners.push(listener);
  }

  removeAuthStateChangeListener(listener: () => void): void {
    this.authStateChangeListeners = this.authStateChangeListeners.filter(l => l !== listener);
  }

  private triggerAuthStateChange(): void {
    this.authStateChangeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in auth state change listener:', error);
      }
    });
  }

  private handleAuthFailure(): void {
    if (this.isHandlingAuthFailure) return;

    this.isHandlingAuthFailure = true;
    void (async () => {
      try {
        await this.clearAllTokens();
      } catch (error) {
        console.error('Failed to handle auth failure:', error);
      } finally {
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
      return { message: `HTTP ${response.status}: ${response.statusText}` };
    }
  }

  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      return undefined as T;
    }

    const rawText = await response.text();
    if (!rawText) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json') || contentType === '') {
      try {
        return JSON.parse(rawText) as T;
      } catch {
        const parseError = new Error('无效的 JSON 响应') as ApiError;
        parseError.code = 'INVALID_JSON_RESPONSE';
        parseError.response = {
          status: response.status,
          statusText: response.statusText,
          data: { message: rawText },
        };
        throw parseError;
      }
    }

    return rawText as unknown as T;
  }

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
        const authError = handleError(error);
        
        // 认证错误不重试
        if (authError.type === AuthErrorType.TOKEN_EXPIRED || 
            authError.type === AuthErrorType.PERMISSION_DENIED) {
          throw authError;
        }
        
        // 可重试的错误，等待后重试
        if (attempt < retries && shouldRetryError(error)) {
          await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt)));
        } else {
          break;
        }
      }
    }
    
    throw handleError(lastError);
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, { method: 'GET' }, config);
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }

  async postForm<T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: formData,
    }, config);
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, { method: 'DELETE' }, config);
  }

  // ==================== Token 管理 ====================

  private async getStorageItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  private async setStorageItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
    }
  }

  private async removeStorageItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  async getToken(): Promise<string | null> {
    return this.getStorageItem(STORAGE_KEYS.TOKEN);
  }

  async setToken(token: string): Promise<void> {
    return this.setStorageItem(STORAGE_KEYS.TOKEN, token);
  }

  async removeToken(): Promise<void> {
    await this.removeStorageItem(STORAGE_KEYS.TOKEN);
    this.triggerAuthStateChange();
  }

  async getRefreshToken(): Promise<string | null> {
    return this.getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    return this.setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  async removeRefreshToken(): Promise<void> {
    return this.removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async getTokenExpiresAt(): Promise<number | null> {
    const expiresAt = await this.getStorageItem(STORAGE_KEYS.TOKEN_EXPIRES);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  }

  async setTokenExpiresAt(expiresAt: number): Promise<void> {
    return this.setStorageItem(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt.toString());
  }

  async removeTokenExpiresAt(): Promise<void> {
    return this.removeStorageItem(STORAGE_KEYS.TOKEN_EXPIRES);
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
    if (this.isClearingTokens) return;

    this.isClearingTokens = true;
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRES,
      ]);
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to clear all tokens:', error);
    } finally {
      setTimeout(() => {
        this.isClearingTokens = false;
      }, 100);
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      const response = await fetch(`${this.getBaseURL()}/currentUser`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        this.handleAuthFailure();
        return false;
      }

      if (!response.ok) return false;

      try {
        const data = await response.json();
        return data && typeof data === 'object' && 
               data.success !== false && 
               !(data.data?.isLogin === false);
      } catch {
        return false;
      }
    } catch (error) {
      console.error('API: Token validation error:', error);
      return false;
    }
  }

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
