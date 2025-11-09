/**
 * 认证服务
 * 提供用户认证相关的API接口
 */

import { apiService } from './api';
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

export class AuthService {
  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginData>> {
    try {
      const response = await apiService.post<ApiResponse<LoginData>>('/login/account', credentials, {
        timeout: 8000,
        retries: 0,
      });

      const loginData = response.data;

      if (!response.success || !loginData?.token || !loginData.refreshToken) {
        throw new Error(getErrorMessage(response.errorCode, response.errorMessage || '登录失败'));
      }

      // 保存 token 和刷新 token 到本地存储
      const expiresAt = loginData.expiresAt ? new Date(loginData.expiresAt).getTime() : undefined;
      await apiService.setTokens(loginData.token, loginData.refreshToken, expiresAt);

      return {
        ...response,
        success: true,
        data: {
          ...loginData,
        },
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
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
      await apiService.clearAllTokens();
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.get<ApiResponse<CurrentUser>>('/currentUser', {
        timeout: 5000,
        retries: 0,
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
      return await apiService.put<ApiResponse<CurrentUser>>('/user/profile', profileData, {
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
      const response = await apiService.post<RefreshTokenResult>('/refresh-token', request, {
        timeout: 6000,
        retries: 0,
      });
      
      if (response.status === 'ok' && response.token && response.refreshToken) {
        // 保存新的token和刷新token
        const expiresAt = response.expiresAt 
          ? new Date(response.expiresAt).getTime() 
          : undefined;
        await apiService.setTokens(response.token, response.refreshToken, expiresAt);
        
        return {
          success: true,
          data: response,
        };
      }
      
      return {
        success: false,
        errorMessage: response.errorMessage || '刷新token失败',
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
