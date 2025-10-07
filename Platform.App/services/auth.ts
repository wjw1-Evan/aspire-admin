// 重新设计的认证服务 - 与Admin端保持统一

import { apiService } from './api';
import { 
  LoginRequest, 
  LoginResult, 
  RegisterRequest, 
  CurrentUser, 
  ApiResponse,
  ChangePasswordRequest,
  AppUser,
  RefreshTokenRequest,
  RefreshTokenResult
} from '@/types/auth';

export class AuthService {
  // 用户登录 - 匹配Admin端接口
  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const response = await apiService.post<LoginResult>('/login/account', credentials);
      
      if (response.status === 'ok' && response.token && response.refreshToken) {
        // 保存 token 和刷新token到本地存储
        const expiresAt = response.expiresAt ? new Date(response.expiresAt).getTime() : undefined;
        await apiService.setTokens(response.token, response.refreshToken, expiresAt);
        return response;
      } else {
        throw new Error('登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // 用户注册 - 匹配Admin端接口
  async register(userData: RegisterRequest): Promise<ApiResponse<AppUser>> {
    try {
      const response = await apiService.post<ApiResponse<AppUser>>('/register', userData);
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // 用户登出 - 匹配Admin端接口
  async logout(): Promise<void> {
    try {
      // 调用后端登出接口
      await apiService.post('/login/outLogin');
    } catch (error) {
      console.error('Logout API error:', error);
      // 即使后端登出失败，也要清除本地状态
    } finally {
      // 清除本地存储的所有认证信息
      await this.clearAllLocalStorage();
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.get<ApiResponse<CurrentUser>>('/currentUser');
      return response;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // 更新用户资料
  async updateProfile(profileData: Partial<CurrentUser>): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.put<ApiResponse<CurrentUser>>('/user/profile', profileData);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // 检查是否已登录
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.getCurrentUser();
      return response.success && response.data?.isLogin === true;
    } catch (error) {
      console.error('Check authentication failed:', error);
      return false;
    }
  }

  // 修改密码 - 匹配Admin端接口
  async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiService.post<ApiResponse<boolean>>('/change-password', request);
      return response;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }


  // 获取验证码 - 匹配Admin端接口
  async getCaptcha(): Promise<string> {
    try {
      const response = await apiService.get<string>('/login/captcha');
      return response;
    } catch (error) {
      console.error('Get captcha error:', error);
      throw error;
    }
  }

  // 刷新token - 匹配Admin端接口
  async refreshToken(refreshToken: string): Promise<ApiResponse<RefreshTokenResult>> {
    try {
      const request: RefreshTokenRequest = { refreshToken };
      const response = await apiService.post<RefreshTokenResult>('/refresh-token', request);
      
      if (response.status === 'ok' && response.token && response.refreshToken) {
        // 保存新的token和刷新token
        const expiresAt = response.expiresAt ? new Date(response.expiresAt).getTime() : undefined;
        await apiService.setTokens(response.token, response.refreshToken, expiresAt);
        
        return {
          success: true,
          data: response
        };
      } else {
        return {
          success: false,
          errorMessage: response.errorMessage || '刷新token失败'
        };
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        errorMessage: '刷新token失败'
      };
    }
  }

  // 清除所有本地存储的认证信息
  private async clearAllLocalStorage(): Promise<void> {
    try {
      await apiService.clearAllTokens();
      // 可以在这里清除其他相关的本地存储数据
      // 例如：用户偏好设置、缓存数据等
    } catch (error) {
      console.error('Failed to clear local storage:', error);
      // 不抛出错误，因为这不是关键操作
    }
  }

}

export const authService = new AuthService();