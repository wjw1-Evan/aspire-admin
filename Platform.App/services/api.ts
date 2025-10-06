// API 服务配置和基础请求方法

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:15000/apiservice' 
  : 'https://your-production-api.com/apiservice';

const TOKEN_KEY = 'auth_token';

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
  private async handleAuthFailure() {
    console.log('API: Authentication failed, logging out user');
    
    // 清除本地token
    await this.removeToken();
    
    // 如果有登出回调，调用它来更新认证状态
    if (this.logoutCallback) {
      try {
        await this.logoutCallback();
      } catch (error) {
        console.error('API: Error calling logout callback:', error);
      }
    }
    
    // 触发认证状态变化事件
    this.triggerAuthStateChange();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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

    try {
      const response = await fetch(url, config);
      
      // 检查是否是认证相关的错误
      if (response.status === 401 || response.status === 403) {
        await this.handleAuthFailure();
        throw new Error('Authentication failed. Please login again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.errorMessage || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET 请求
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 请求
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 请求
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
      // 触发认证状态变化事件
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to remove token:', error);
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
        await this.handleAuthFailure();
        return false;
      }

      if (response.ok) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('API: Token validation error:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
