/**
 * 简化的 API 客户端
 * 修复：统一 API 调用，简化错误处理
 */

import { request } from '@umijs/max';
import { message } from 'antd';
import type { ApiResponse } from '@/types/unified-api';

// API 配置
const API_CONFIG = {
  timeout: 10000,
  retryCount: 3,
  retryDelay: 1000,
};

// 错误处理
const handleError = (error: unknown, showMessage = true) => {
  console.error('API Error:', error);

  if (showMessage) {
    const errorMessage = 
      (error as any)?.response?.data?.errorMessage ||
      (error as any)?.message ||
      '请求失败，请稍后重试';
    message.error(errorMessage);
  }

  return Promise.reject(error);
};

// 重试机制
const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = API_CONFIG.retryCount,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error?.response?.status >= 500) {
      await new Promise((resolve) =>
        setTimeout(resolve, API_CONFIG.retryDelay),
      );
      return retryRequest(fn, retries - 1);
    }
    throw error;
  }
};

// 基础 API 客户端
export class ApiClient {
  private timeout: number;

  constructor(_baseURL = '', timeout = API_CONFIG.timeout) {
    this.timeout = timeout;
  }

  // GET 请求
  async get<T = any>(
    url: string,
    params?: any,
    options?: any,
  ): Promise<ApiResponse<T>> {
    return retryRequest(async () => {
      try {
        const response = await request<ApiResponse<T>>(url, {
          method: 'GET',
          params,
          timeout: this.timeout,
          ...options,
        });
        return response;
      } catch (error) {
        return handleError(error);
      }
    });
  }

  // POST 请求
  async post<T = any>(
    url: string,
    data?: any,
    options?: any,
  ): Promise<ApiResponse<T>> {
    return retryRequest(async () => {
      try {
        const response = await request<ApiResponse<T>>(url, {
          method: 'POST',
          data,
          timeout: this.timeout,
          ...options,
        });
        return response;
      } catch (error) {
        return handleError(error);
      }
    });
  }

  // PUT 请求
  async put<T = any>(
    url: string,
    data?: any,
    options?: any,
  ): Promise<ApiResponse<T>> {
    return retryRequest(async () => {
      try {
        const response = await request<ApiResponse<T>>(url, {
          method: 'PUT',
          data,
          timeout: this.timeout,
          ...options,
        });
        return response;
      } catch (error) {
        return handleError(error);
      }
    });
  }

  // DELETE 请求
  async delete<T = any>(url: string, options?: any): Promise<ApiResponse<T>> {
    return retryRequest(async () => {
      try {
        const response = await request<ApiResponse<T>>(url, {
          method: 'DELETE',
          timeout: this.timeout,
          ...options,
        });
        return response;
      } catch (error) {
        return handleError(error);
      }
    });
  }
}

// 创建默认 API 客户端
export const apiClient = new ApiClient();

// 简化的 API 方法
export const api = {
  // 用户相关
  user: {
    getCurrent: () => apiClient.get<CurrentUser>('/api/currentUser'),
    updateProfile: (data: any) =>
      apiClient.put<CurrentUser>('/api/user/profile', data),
    changePassword: (data: any) =>
      apiClient.put<boolean>('/api/user/profile/password', data),
    getList: (data: any) => apiClient.post('/api/user/list', data),
    create: (data: any) => apiClient.post('/api/user/management', data),
    update: (id: string, data: any) => apiClient.put(`/api/user/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/user/${id}`),
    bulkAction: (data: any) => apiClient.post('/api/user/bulk-action', data),
  },

  // 认证相关
  auth: {
    login: (data: any) => apiClient.post('/api/login/account', data),
    logout: () => apiClient.post('/api/login/outLogin'),
    register: (data: any) => apiClient.post('/api/register', data),
    refreshToken: (data: any) => apiClient.post('/api/refresh-token', data),
  },

  // 权限相关
  permission: {
    getMyPermissions: () => apiClient.get('/api/user/my-permissions'),
    getUserPermissions: (id: string) =>
      apiClient.get(`/api/user/${id}/permissions`),
    assignPermissions: (id: string, data: any) =>
      apiClient.post(`/api/user/${id}/custom-permissions`, data),
  },

  // 菜单相关
  menu: {
    getUserMenus: () => apiClient.get('/api/menu/user-menus'),
    getList: () => apiClient.get('/api/menu'),
    create: (data: any) => apiClient.post('/api/menu', data),
    update: (id: string, data: any) => apiClient.put(`/api/menu/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/menu/${id}`),
  },
};

// 类型定义
import type { CurrentUser } from '@/types/unified-api';
