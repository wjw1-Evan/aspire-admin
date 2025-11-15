/**
 * 认证服务
 * 提供用户认证相关的API接口
 */

import { apiService } from './api';
import { tokenManager } from './tokenManager';
import { getErrorMessage } from './errorHandler';
import {
  LoginRequest,
  RegisterRequest,
  CurrentUser,
  ApiResponse,
  ChangePasswordRequest,
  AppUser,
  UpdateProfileParams,
  RefreshTokenRequest,
  RefreshTokenResult,
  LoginData,
} from '@/types/unified-api';

// 创建登录错误对象
const createLoginError = (errorCode: string, errorMessage: string, data?: any): any => {
  const error = new Error(errorMessage) as any;
  error.errorCode = errorCode;
  error.code = errorCode;
  error.message = errorMessage;
  error.response = {
    status: 200,
    statusText: 'OK',
    data: {
      success: false,
      errorCode,
      errorMessage,
      data,
    },
  };
  return error;
};

export class AuthService {
  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginData>> {
    const response = await apiService.post<ApiResponse<LoginData>>('/login/account', credentials, {
      timeout: 8000,
      retries: 0,
    });

    // 检查响应是否成功
    if (!response.success) {
      const errorCode = response.errorCode || 'LOGIN_FAILED';
      const errorMessage = response.errorMessage || getErrorMessage(errorCode, '登录失败');
      throw createLoginError(errorCode, errorMessage, response.data);
    }

    // 验证必要的数据
    const loginData = response.data;
    if (!loginData?.token || !loginData.refreshToken) {
      throw createLoginError('LOGIN_FAILED', '登录失败：缺少必要的认证信息', loginData);
    }

    // 保存 token 和刷新 token 到本地存储
    const expiresAt = loginData.expiresAt ? new Date(loginData.expiresAt).getTime() : undefined;
    await tokenManager.setTokens(loginData.token, loginData.refreshToken, expiresAt);

    return {
      ...response,
      success: true,
      data: loginData,
    };
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<AppUser>> {
    try {
      const response = await apiService.post<ApiResponse<AppUser>>('/register', userData, {
        timeout: 8000,
        retries: 0,
      });
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }
      
      throw new Error(response.errorMessage || '注册失败');
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await apiService.post('/login/outLogin', undefined, {
        timeout: 5000,
        retries: 0,
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await tokenManager.clearAllTokens();
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.get<ApiResponse<CurrentUser>>('/currentUser', {
        timeout: 10000, // 增加到10秒，避免超时
        retries: 1, // 允许重试一次
      });
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }
      
      throw new Error(response.errorMessage || '获取用户信息失败');
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * 更新用户资料
   */
  async updateProfile(profileData: UpdateProfileParams): Promise<ApiResponse<CurrentUser>> {
    try {
      // 后端使用 camelCase 命名策略，所以字段名需要使用 camelCase
      // 将前端的 phone 字段映射为后端的 phoneNumber 字段（camelCase）
      const requestData: Record<string, any> = {
        name: profileData.name,
        email: profileData.email,
        age: profileData.age,
        avatar: profileData.avatar,
      };
      
      // 注意：后端配置了 JsonNamingPolicy.CamelCase，所以 PhoneNumber 会被序列化为 phoneNumber
      // 但模型绑定是大小写不敏感的，所以可以直接使用 phoneNumber
      // 只有在有值时才发送 phoneNumber 字段
      // 如果 phone 是 undefined 或空字符串，不发送该字段（保持原值不变）
      // 如果 phone 有值，发送实际值
      if (profileData.phone !== undefined && profileData.phone.trim() !== '') {
        requestData.phoneNumber = profileData.phone.trim();
      }
      
      return await apiService.put<ApiResponse<CurrentUser>>('/user/profile', requestData, {
        timeout: 8000,
        retries: 0,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * 检查是否已登录
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.getCurrentUser();
      return response.success && response.data?.isLogin === true;
    } catch (error) {
      console.error('Check authentication failed:', error);
      return false;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiService.post<ApiResponse<boolean>>('/change-password', request, {
        timeout: 8000,
        retries: 0,
      });
      
      if (response.success && response.data !== undefined) {
        return {
          success: true,
          data: response.data,
        };
      }
      
      throw new Error(response.errorMessage || '修改密码失败');
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * 获取验证码
   */
  async getCaptcha(): Promise<string> {
    try {
      return await apiService.get<string>('/login/captcha', {
        timeout: 8000,
        retries: 0,
      });
    } catch (error) {
      console.error('Get captcha error:', error);
      throw error;
    }
  }

  /**
   * 刷新 token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<RefreshTokenResult>> {
    try {
      const request: RefreshTokenRequest = { refreshToken };
      const response = await apiService.post<ApiResponse<RefreshTokenResult>>('/refresh-token', request, {
        timeout: 6000,
        retries: 0,
      });
      
      if (response.success && response.data?.status === 'ok' && response.data.token && response.data.refreshToken) {
        // 保存新的token和刷新token
        const expiresAt = response.data.expiresAt 
          ? new Date(response.data.expiresAt).getTime() 
          : undefined;
        await tokenManager.setTokens(response.data.token, response.data.refreshToken, expiresAt);
        
        return {
          success: true,
          data: response.data,
        };
      }
      
      return {
        success: false,
        errorMessage: response.data?.errorMessage || response.errorMessage || '刷新token失败',
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        errorMessage: '刷新token失败',
      };
    }
  }
}

export const authService = new AuthService();
