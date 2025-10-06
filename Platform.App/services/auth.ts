// 认证服务

import { apiService } from './api';
import { StorageCleaner } from '@/utils/storage-cleaner';
import { 
  LoginRequest, 
  LoginResult, 
  RegisterRequest, 
  CurrentUser, 
  ApiResponse 
} from '@/types/auth';

export class AuthService {
  // 用户登录
  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const response = await apiService.post<LoginResult>('/login/account', credentials);
      
      // 如果登录成功，保存 token
      if (response.token) {
        await apiService.setToken(response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // 用户注册
  async register(userData: RegisterRequest): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.post<ApiResponse<any>>('/register', userData);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.get<ApiResponse<CurrentUser>>('/currentUser');
      return response;
    } catch (error) {
      console.error('Get current user failed:', error);
      throw error;
    }
  }

  // 用户登出
  async logout(): Promise<void> {
    try {
      // 尝试调用服务器登出接口
      await apiService.post('/login/outLogin');
    } catch (error) {
      console.error('AuthService: Server logout failed:', error);
      // 服务器登出失败不影响本地清理
    } finally {
      // 无论服务器登出是否成功，都要清除本地数据
      await this.clearLocalData();
    }
  }

  // 清除本地数据
  private async clearLocalData(): Promise<void> {
    try {
      // 清除 token
      await apiService.removeToken();
      
      // 清除其他本地存储数据
      await this.clearAllLocalStorage();
    } catch (error) {
      console.error('AuthService: Failed to clear local data:', error);
      throw error;
    }
  }

  // 清除所有本地存储数据
  private async clearAllLocalStorage(): Promise<void> {
    try {
      // 使用专门的存储清理工具
      await StorageCleaner.clearUserData();
      
      // 可选：清除所有数据（更彻底，但会清除所有应用数据）
      // await StorageCleaner.clearAllData();
    } catch (error) {
      console.error('AuthService: Failed to clear all local storage:', error);
      // 不抛出错误，因为这不是关键操作
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

  // 获取验证码
  async getCaptcha(): Promise<any> {
    try {
      const response = await apiService.get('/login/captcha');
      return response;
    } catch (error) {
      console.error('Get captcha failed:', error);
      throw error;
    }
  }

  // 更新用户资料
  async updateProfile(profileData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.put<ApiResponse<CurrentUser>>('/users/profile', profileData);
      return response;
    } catch (error) {
      console.error('Update profile failed:', error);
      throw error;
    }
  }

  // 修改密码
  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.put<ApiResponse<any>>('/users/profile/password', passwordData);
      return response;
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
