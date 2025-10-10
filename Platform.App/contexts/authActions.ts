/**
 * 认证 Actions
 * 处理认证相关的业务逻辑
 */

import { Dispatch } from 'react';
import { AuthAction } from './authReducer';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';
import { isAuthResponseValid } from '@/utils/apiResponse';
import { handleError } from '@/services/errorHandler';
import {
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  UpdateProfileParams,
  ApiResponse,
  AuthError,
  AuthErrorType,
} from '@/types/unified-api';

// Token 过期缓冲时间
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 分钟

/**
 * 登录
 */
export async function loginAction(
  credentials: LoginRequest,
  dispatch: Dispatch<AuthAction>
): Promise<void> {
  try {
    dispatch({ type: 'AUTH_START' });
    
    const result = await authService.login(credentials);
    
    if (result.status === 'ok' && result.token && result.refreshToken) {
      // 获取用户信息
      const userResponse = await authService.getCurrentUser();
      
      if (isAuthResponseValid(userResponse)) {
        const tokenExpiresAt = result.expiresAt 
          ? new Date(result.expiresAt).getTime() 
          : undefined;
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: userResponse.data,
            token: result.token,
            refreshToken: result.refreshToken,
            tokenExpiresAt,
          },
        });
      } else {
        throw new Error('获取用户信息失败');
      }
    } else {
      throw new Error('登录失败');
    }
  } catch (error) {
    console.error('AuthContext: Login error:', error);
    const authError = handleError(error);
    dispatch({ type: 'AUTH_FAILURE', payload: authError });
    throw authError;
  }
}

/**
 * 注册
 */
export async function registerAction(
  userData: RegisterRequest,
  dispatch: Dispatch<AuthAction>
): Promise<void> {
  try {
    dispatch({ type: 'AUTH_START' });
    
    const result = await authService.register(userData);
    
    if (!result.success) {
      throw new Error(result.errorMessage || '注册失败');
    }
    
    dispatch({ type: 'AUTH_SET_LOADING', payload: false });
  } catch (error) {
    const authError = handleError(error);
    dispatch({ type: 'AUTH_FAILURE', payload: authError });
    throw authError;
  }
}

/**
 * 登出
 */
export async function logoutAction(dispatch: Dispatch<AuthAction>): Promise<void> {
  try {
    await authService.logout();
  } catch (error) {
    console.error('AuthContext: Logout service call failed:', error);
  } finally {
    dispatch({ type: 'AUTH_LOGOUT' });
    await apiService.clearAllTokens();
  }
}

/**
 * 刷新认证状态
 */
export async function refreshAuthAction(dispatch: Dispatch<AuthAction>): Promise<void> {
  try {
    // 从本地存储获取最新的 token 信息
    const currentToken = await apiService.getToken();
    const currentRefreshToken = await apiService.getRefreshToken();
    const currentExpiresAt = await apiService.getTokenExpiresAt();
    
    // 检查 token 是否存在且未过期
    const isExpired = currentExpiresAt 
      ? Date.now() >= (currentExpiresAt - TOKEN_EXPIRY_BUFFER) 
      : false;
    
    if (currentToken && !isExpired) {
      // 尝试获取最新用户信息
      const userResponse = await authService.getCurrentUser();
      if (isAuthResponseValid(userResponse)) {
        dispatch({ type: 'AUTH_UPDATE_USER', payload: userResponse.data });
        return;
      }
    }
    
    // 如果 token 无效或过期，尝试刷新 token
    if (currentRefreshToken) {
      const refreshResult = await authService.refreshToken(currentRefreshToken);
      if (refreshResult.success && refreshResult.data) {
        const { token, refreshToken, expiresAt } = refreshResult.data;
        const tokenExpiresAt = expiresAt ? new Date(expiresAt).getTime() : undefined;
        dispatch({
          type: 'AUTH_REFRESH_TOKEN',
          payload: { token: token || '', refreshToken: refreshToken || '', expiresAt: tokenExpiresAt },
        });
        
        // 获取用户信息
        const userResponse = await authService.getCurrentUser();
        if (isAuthResponseValid(userResponse)) {
          dispatch({ type: 'AUTH_UPDATE_USER', payload: userResponse.data });
        }
        return;
      }
    }
    
    // 如果刷新失败，执行登出
    dispatch({ type: 'AUTH_LOGOUT' });
    await apiService.clearAllTokens();
  } catch (error) {
    console.error('AuthContext: Refresh auth failed:', error);
    dispatch({ type: 'AUTH_LOGOUT' });
    await apiService.clearAllTokens();
  }
}

/**
 * 检查认证状态
 */
export async function checkAuthAction(dispatch: Dispatch<AuthAction>): Promise<void> {
  try {
    dispatch({ type: 'AUTH_START' });
    
    const token = await apiService.getToken();
    if (!token) {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }
    
    const userResponse = await authService.getCurrentUser();
    if (isAuthResponseValid(userResponse)) {
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: userResponse.data,
          token,
        },
      });
    } else {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  } catch (error) {
    console.error('AuthContext: Check auth error:', error);
    dispatch({ type: 'AUTH_LOGOUT' });
  }
}

/**
 * 更新用户资料
 */
export async function updateProfileAction(
  profileData: UpdateProfileParams,
  dispatch: Dispatch<AuthAction>
): Promise<void> {
  const response = await authService.updateProfile(profileData);
  
  if (response.success && response.data) {
    dispatch({ type: 'AUTH_UPDATE_USER', payload: response.data });
  } else {
    throw new Error(response.errorMessage || '更新失败');
  }
}

/**
 * 修改密码
 */
export async function changePasswordAction(
  request: ChangePasswordRequest
): Promise<ApiResponse<boolean>> {
  try {
    const response = await authService.changePassword(request);

    if (!response.success) {
      return {
        success: false,
        errorMessage: response.errorMessage || '修改密码失败',
      };
    }

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    const authError = handleError(error);
    return {
      success: false,
      errorMessage: authError.message,
    };
  }
}

/**
 * 创建错误处理器
 */
export function createErrorHandler(dispatch: Dispatch<AuthAction>) {
  return (error: any): AuthError => {
    console.log('AuthContext: Handling error:', error);
    
    // 使用统一错误处理器
    const authError = handleError(error);
    
    // 特殊处理：登录相关错误
    if (error?.message?.includes('用户名') || 
        error?.message?.includes('密码') ||
        error?.message?.includes('登录失败') || 
        error?.message?.includes('认证失败')) {
      return {
        type: AuthErrorType.LOGIN_FAILED,
        message: error.message,
        retryable: false,
      };
    }
    
    return authError;
  };
}

