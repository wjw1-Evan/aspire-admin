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
  UpdateProfileParams,
  RefreshTokenRequest,
  RefreshTokenResult,
  LoginData
} from '@/types/unified-api';

export class AuthService {
  // 用户登录 - 使用统一 API 响应格式
  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const response = await apiService.post<ApiResponse<LoginData>>('/login/account', credentials);

      if (response.success && response.data?.token && response.data?.refreshToken) {
        // 保存 token 和刷新token到本地存储
        const expiresAt = response.data.expiresAt ? new Date(response.data.expiresAt).getTime() : undefined;
        await apiService.setTokens(response.data.token, response.data.refreshToken, expiresAt);
        
        // 转换为旧格式以保持兼容性
        return {
          status: 'ok',
          type: response.data.type,
          currentAuthority: response.data.currentAuthority,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          expiresAt: response.data.expiresAt ? new Date(response.data.expiresAt).toISOString() : undefined,
        };
      }
      
      // 根据统一响应格式处理错误
      this.handleUnifiedLoginError(response);
    } catch (error: any) {
      console.error('Login error:', error);
      this.handleLoginException(error);
    }
  }

  // 处理统一格式的登录响应错误
  private handleUnifiedLoginError(response: ApiResponse<LoginData>): never {
    if (!response.success && response.errorCode) {
      throw new Error(this.getDetailedErrorMessage(response.errorCode, response.errorMessage));
    }
    
    if (!response.success && response.errorMessage) {
      throw new Error(response.errorMessage);
    }
    
    throw new Error('用户名或密码错误，请检查后重试');
  }


  // 处理登录异常
  private handleLoginException(error: any): never {
    const status = error?.response?.status;
    const code = error?.code;
    
    if (status === 401) {
      throw new Error('用户名或密码错误，请检查后重试');
    }
    if (status === 403) {
      throw new Error('账户已被禁用，请联系管理员');
    }
    if (status === 429) {
      throw new Error('登录尝试次数过多，请稍后再试');
    }
    if (status === 500) {
      throw new Error('服务器错误，请稍后重试');
    }
    if (code === 'NETWORK_ERROR') {
      throw new Error('网络连接失败，请检查网络设置');
    }
    if (code === 'TIMEOUT') {
      throw new Error('请求超时，请检查网络连接');
    }
    if (error?.message) {
      throw error; // 保持原始错误消息
    }
    throw new Error('登录失败，请稍后重试');
  }

  // 获取详细错误消息
  private getDetailedErrorMessage(errorCode: string, errorMessage?: string): string {
    // 如果有具体的错误消息，优先使用
    if (errorMessage) {
      return errorMessage;
    }

    // 根据错误代码返回用户友好的消息
    switch (errorCode) {
      case 'INVALID_USERNAME':
        return '用户名不能为空';
      case 'INVALID_PASSWORD':
        return '密码不能为空';
      case 'INVALID_USERNAME_LENGTH':
        return '用户名长度必须在3-20个字符之间';
      case 'WEAK_PASSWORD':
        return '密码长度至少6个字符';
      case 'INVALID_EMAIL':
        return '邮箱格式不正确';
      case 'USER_EXISTS':
        return '用户名已存在';
      case 'EMAIL_EXISTS':
        return '邮箱已被使用';
      case 'USER_NOT_FOUND':
        return '用户不存在或已被禁用';
      case 'INVALID_CURRENT_PASSWORD':
        return '当前密码不正确';
      case 'INVALID_NEW_PASSWORD':
        return '新密码不能为空';
      case 'INVALID_CONFIRM_PASSWORD':
        return '确认密码不能为空';
      case 'PASSWORD_MISMATCH':
        return '新密码和确认密码不一致';
      case 'SAME_PASSWORD':
        return '新密码不能与当前密码相同';
      case 'UNAUTHORIZED':
        return '用户未认证';
      case 'UPDATE_FAILED':
        return '更新失败';
      case 'REGISTER_ERROR':
        return '注册失败';
      case 'CHANGE_PASSWORD_ERROR':
        return '修改密码失败';
      case 'REFRESH_TOKEN_ERROR':
        return '刷新token失败';
      default:
        return '操作失败，请稍后重试';
    }
  }

  // 用户注册 - 使用统一 API 响应格式
  async register(userData: RegisterRequest): Promise<ApiResponse<AppUser>> {
    try {
      const response = await apiService.post<ApiResponse<AppUser>>('/register', userData);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      // 处理错误响应
      throw new Error(response.errorMessage || '注册失败');
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

  // 获取当前用户信息 - 使用统一 API 响应格式
  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    try {
      const response = await apiService.get<ApiResponse<CurrentUser>>('/currentUser');
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      // 处理错误响应
      throw new Error(response.errorMessage || '获取用户信息失败');
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // 更新用户资料
  async updateProfile(profileData: UpdateProfileParams): Promise<ApiResponse<CurrentUser>> {
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

  // 修改密码 - 使用统一 API 响应格式
  async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiService.post<ApiResponse<boolean>>('/change-password', request);
      
      if (response.success && response.data !== undefined) {
        return {
          success: true,
          data: response.data
        };
      }
      
      // 处理错误响应
      throw new Error(response.errorMessage || '修改密码失败');
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