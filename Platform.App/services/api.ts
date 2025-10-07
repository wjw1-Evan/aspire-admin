// 重新设计的 API 服务配置和基础请求方法

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, AuthErrorType } from '@/types/auth';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:15000/apiservice/api' 
  : 'https://your-production-api.com/apiservice/api';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRES_KEY = 'token_expires_at';

// 请求配置
interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiService {
  private readonly baseURL: string;
  private authStateChangeListeners: (() => void)[] = [];
  private logoutCallback: (() => Promise<void>) | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // 设置登出回调函数
  setLogoutCallback(callback: () => Promise<void>) {
    this.logoutCallback = callback;
  }

  // 添加认证状态变化监听器
  addAuthStateChangeListener(listener: () => void) {
    this.authStateChangeListeners.push(listener);
  }

  // 移除认证状态变化监听器
  removeAuthStateChangeListener(listener: () => void) {
    this.authStateChangeListeners = this.authStateChangeListeners.filter(l => l !== listener);
  }

  // 触发认证状态变化事件
  private triggerAuthStateChange() {
    this.authStateChangeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in auth state change listener:', error);
      }
    });
  }

  // 处理认证失败
  private async handleAuthFailure(error?: any): Promise<AuthError> {
    console.log('API: Authentication failed, logging out user');
    
    // 清除本地token
    await this.clearAllTokens();
    
    // 如果有登出回调，调用它来更新认证状态
    if (this.logoutCallback) {
      try {
        await this.logoutCallback();
      } catch (callbackError) {
        console.error('API: Error calling logout callback:', callbackError);
      }
    }
    
    // 触发认证状态变化事件
    this.triggerAuthStateChange();
    
    // 返回适当的错误信息
    if (error?.response?.status === 401) {
      return {
        type: AuthErrorType.TOKEN_EXPIRED,
        message: '登录已过期，请重新登录',
        retryable: false,
      };
    }
    
    if (error?.response?.status === 403) {
      return {
        type: AuthErrorType.PERMISSION_DENIED,
        message: '权限不足',
        retryable: false,
      };
    }
    
    return {
      type: AuthErrorType.UNAUTHORIZED,
      message: '认证失败，请重新登录',
      retryable: false,
    };
  }

  // 带重试的请求方法
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const { timeout = 10000, retries = 3, retryDelay = 1000 } = config;
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.request<T>(endpoint, options, timeout);
        return result;
      } catch (error) {
        lastError = error;
        
        // 如果是认证错误，不重试
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          throw await this.handleAuthFailure(error);
        }
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError;
  }

  // 基础请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = 10000
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 添加认证头
    const token = await this.getToken();
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 检查是否是认证相关的错误
      if (response.status === 401 || response.status === 403) {
        throw await this.handleAuthFailure({ response });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.errorMessage || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = response;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error('请求超时，请检查网络连接');
        (timeoutError as any).code = 'TIMEOUT';
        throw timeoutError;
      }
      
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET 请求
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, { method: 'GET' }, config);
  }

  // POST 请求
  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }

  // PUT 请求
  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  }

  // DELETE 请求
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.requestWithRetry<T>(endpoint, { method: 'DELETE' }, config);
  }

  // Token 管理
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  async clearAllTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_KEY]);
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to clear all tokens:', error);
    }
  }

  // 刷新token管理
  async getRefreshToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      return refreshToken;
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Failed to set refresh token:', error);
    }
  }

  async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove refresh token:', error);
    }
  }

  // Token过期时间管理
  async getTokenExpiresAt(): Promise<number | null> {
    try {
      const expiresAt = await AsyncStorage.getItem(TOKEN_EXPIRES_KEY);
      return expiresAt ? parseInt(expiresAt, 10) : null;
    } catch (error) {
      console.error('Failed to get token expires at:', error);
      return null;
    }
  }

  async setTokenExpiresAt(expiresAt: number): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
    } catch (error) {
      console.error('Failed to set token expires at:', error);
    }
  }

  async removeTokenExpiresAt(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_EXPIRES_KEY);
    } catch (error) {
      console.error('Failed to remove token expires at:', error);
    }
  }

  // 设置所有token信息
  async setTokens(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [REFRESH_TOKEN_KEY, refreshToken],
        ...(expiresAt ? [[TOKEN_EXPIRES_KEY, expiresAt.toString()]] : [])
      ]);
    } catch (error) {
      console.error('Failed to set tokens:', error);
    }
  }

  // 验证token有效性
  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // 尝试调用一个需要认证的接口来验证token
      const response = await fetch(`${this.baseURL}/currentUser`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        await this.handleAuthFailure({ response });
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error('API: Token validation error:', error);
      return false;
    }
  }

  // 检查网络连接状态
  async isOnline(): Promise<boolean> {
    try {
      // 尝试访问一个简单的端点来检查网络连接
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const apiService = new ApiService();