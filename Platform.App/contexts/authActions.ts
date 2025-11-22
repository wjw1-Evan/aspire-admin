/**
 * 认证 Actions
 * 处理认证相关的业务逻辑
 */

import { Dispatch } from 'react';
import { AuthAction } from './authReducer';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';
import { tokenManager } from '@/services/tokenManager';
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
  // 添加超时保护，避免长时间阻塞
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('登录超时，请检查网络连接后重试'));
    }, 30000); // 30秒超时
  });

  const loginPromise = (async () => {
    dispatch({ type: 'AUTH_START' });
    
    // 登录并获取 token（authService.login 内部已经保存了 token 并验证了数据）
    const loginResponse = await authService.login(credentials);
    const loginData = loginResponse.data!; // authService.login 已确保 data 存在

    // 获取用户信息（使用已保存的 token）
    const userResponse = await authService.getCurrentUser();
    
    if (!isAuthResponseValid(userResponse) || !userResponse.data) {
      throw new Error('获取用户信息失败');
    }

    const tokenExpiresAt = loginData.expiresAt 
      ? new Date(loginData.expiresAt).getTime() 
      : undefined;
    
    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        user: userResponse.data,
        token: loginData.token,
        refreshToken: loginData.refreshToken,
        tokenExpiresAt,
      },
    });
  })()
    .catch((error) => {
      const authError = handleError(error);
      dispatch({ type: 'AUTH_FAILURE', payload: authError });
      // 登录失败时清理可能已保存的 token
      void tokenManager.clearAllTokens();
      throw authError;
    })
    .finally(() => {
      // 清理超时定时器，避免在 Promise 完成后仍然执行超时回调
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });

  // 等待第一个完成的 Promise（超时或登录完成）
  await Promise.race([loginPromise, timeoutPromise]);
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
    // authService.logout() 内部已经会清理 token，这里不需要再次清理
    await authService.logout();
  } catch (error) {
    console.error('AuthContext: Logout service call failed:', error);
    // 如果 logout API 调用失败，仍然需要清理本地 token
    void tokenManager.clearAllTokens();
  } finally {
    dispatch({ type: 'AUTH_LOGOUT' });
    // authService.logout() 的 finally 块已经清理了 token，这里不需要再次清理
    // 但如果 logout API 调用失败，上面的 catch 块已经清理了
  }
}

/**
 * 刷新认证状态
 */
export async function refreshAuthAction(dispatch: Dispatch<AuthAction>): Promise<void> {
  try {
    // 从本地存储获取最新的 token 信息
    const currentToken = await tokenManager.getToken();
    const currentRefreshToken = await tokenManager.getRefreshToken();
    const currentExpiresAt = await tokenManager.getTokenExpiresAt();
    
    // 检查 token 是否存在且未过期
    const isExpired = currentExpiresAt 
      ? Date.now() >= (currentExpiresAt - TOKEN_EXPIRY_BUFFER) 
      : false;
    
    if (currentToken && !isExpired) {
      // 尝试获取最新用户信息
      try {
        const userResponse = await authService.getCurrentUser();
        const currentUser = userResponse.data;
        if (isAuthResponseValid(userResponse) && currentUser) {
          dispatch({ type: 'AUTH_UPDATE_USER', payload: currentUser });
          return;
        }
      } catch (error) {
        // 如果 getCurrentUser 返回 401，handleAuthFailure 已经处理了 token 清理
        // 这里只需要继续执行后续的刷新逻辑或登出
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
        try {
          const userResponse = await authService.getCurrentUser();
          const currentUser = userResponse.data;
          if (isAuthResponseValid(userResponse) && currentUser) {
            dispatch({ type: 'AUTH_UPDATE_USER', payload: currentUser });
          }
        } catch (error) {
          // 如果 getCurrentUser 返回 401，handleAuthFailure 已经处理了 token 清理
          // 这里记录错误但不影响整体流程
        }
        return;
      }
    }
    
    // 如果刷新失败，执行登出
    dispatch({ type: 'AUTH_LOGOUT' });
    // 非阻塞方式清除 token，避免阻塞（handleAuthFailure 可能已经清理过了）
    void tokenManager.clearAllTokens();
  } catch (error) {
    console.error('AuthContext: Refresh auth failed:', error);
    dispatch({ type: 'AUTH_LOGOUT' });
    // 非阻塞方式清除 token，避免阻塞（handleAuthFailure 可能已经清理过了）
    void tokenManager.clearAllTokens();
  }
}

/**
 * 检查认证状态
 */
export async function checkAuthAction(dispatch: Dispatch<AuthAction>): Promise<void> {
  // 添加超时保护，避免长时间阻塞
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      // 只在开发环境显示警告，避免生产环境噪音
      if (__DEV__) {
        console.warn('AuthContext: Check auth timeout, setting loading to false');
      }
      dispatch({ type: 'AUTH_SET_LOADING', payload: false });
      resolve();
    }, 15000); // 增加到15秒，与初始化超时保持一致
  });

  const checkAuthPromise = (async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // 快速检查 token 是否存在，如果不存在则立即返回
      const token = await tokenManager.getToken();
      if (!token) {
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }
      
      // 只有在有 token 的情况下才调用 API
      const refreshToken = await tokenManager.getRefreshToken();
      const tokenExpiresAt = await tokenManager.getTokenExpiresAt();
      
      try {
        const userResponse = await authService.getCurrentUser();
        const currentUser = userResponse.data;
        if (isAuthResponseValid(userResponse) && currentUser) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: currentUser,
              token,
              refreshToken: refreshToken || undefined,
              tokenExpiresAt: tokenExpiresAt || undefined,
            },
          });
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        // 如果 getCurrentUser 返回 401，handleAuthFailure 已经处理了 token 清理
        // 这里只需要 dispatch AUTH_LOGOUT
        // 网络错误或超时是正常情况，只在开发环境记录
        if (__DEV__) {
          console.warn('AuthContext: Get current user failed during check auth:', error);
        }
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      // 只在开发环境记录错误
      if (__DEV__) {
        console.error('AuthContext: Check auth error:', error);
      }
      dispatch({ type: 'AUTH_LOGOUT' });
    } finally {
      // 清理超时定时器，避免在 Promise 完成后仍然执行超时回调
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  })();

  try {
    // 等待第一个完成的 Promise（超时或检查完成）
    await Promise.race([checkAuthPromise, timeoutPromise]);
  } finally {
    // 确保在函数返回前清理超时定时器（防止竞态条件）
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 更新用户资料
 */
export async function updateProfileAction(
  profileData: UpdateProfileParams,
  dispatch: Dispatch<AuthAction>
): Promise<void> {
  try {
    const response = await authService.updateProfile(profileData);
    
    if (response.success && response.data) {
      dispatch({ type: 'AUTH_UPDATE_USER', payload: response.data });
    } else {
      throw new Error(response.errorMessage || '更新失败');
    }
  } catch (error) {
    const authError = handleError(error);
    dispatch({ type: 'AUTH_FAILURE', payload: authError });
    throw authError;
  }
}

/**
 * 修改密码
 */
export async function changePasswordAction(
  request: ChangePasswordRequest,
  dispatch: Dispatch<AuthAction>
): Promise<void> {
  try {
    const response = await authService.changePassword(request);

    if (!response.success) {
      throw new Error(response.errorMessage || '修改密码失败');
    }
  } catch (error) {
    const authError = handleError(error);
    dispatch({ type: 'AUTH_FAILURE', payload: authError });
    throw authError;
  }
}

/**
 * 创建错误处理器
 * 用于处理错误并返回 AuthError（不自动分发，由调用者决定是否分发）
 */
export function createErrorHandler(dispatch: Dispatch<AuthAction>) {
  return (error: any): AuthError => {
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

