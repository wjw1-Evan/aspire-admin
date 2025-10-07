// 重新设计的认证状态管理 Context - 与Admin端保持统一

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AuthState, CurrentUser, LoginRequest, RegisterRequest, AuthError, AuthErrorType, PermissionCheck, ChangePasswordRequest } from '@/types/auth';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';

// 认证 Action 类型 - 简化以匹配Admin端
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: CurrentUser; token: string; refreshToken?: string; tokenExpiresAt?: number } }
  | { type: 'AUTH_FAILURE'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_SET_LOADING'; payload: boolean }
  | { type: 'AUTH_UPDATE_USER'; payload: CurrentUser }
  | { type: 'AUTH_REFRESH_TOKEN'; payload: { token: string; refreshToken: string; expiresAt?: number } };

// 初始状态 - 简化以匹配Admin端
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiresAt: null,
  loading: true,
  error: null,
  lastChecked: null,
};

// 优化的 Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS': {
      const { user, token, refreshToken, tokenExpiresAt } = action.payload;
      
      return {
        ...state,
        isAuthenticated: true,
        user,
        token,
        refreshToken: refreshToken || state.refreshToken,
        tokenExpiresAt: tokenExpiresAt || state.tokenExpiresAt,
        loading: false,
        error: null,
        lastChecked: Date.now(),
      };
    }
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
        lastChecked: Date.now(),
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        lastChecked: Date.now(),
      };
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'AUTH_SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
        lastChecked: Date.now(),
      };
    case 'AUTH_REFRESH_TOKEN': {
      const { token, refreshToken, expiresAt } = action.payload;
      return {
        ...state,
        token,
        refreshToken,
        tokenExpiresAt: expiresAt || state.tokenExpiresAt,
        lastChecked: Date.now(),
      };
    }
    default:
      return state;
  }
}

// 增强的 Context 类型 - 简化以匹配Admin端
interface AuthContextType extends AuthState {
  // 基础认证操作
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  
  // 状态管理
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // 用户管理
  updateProfile: (profileData: Partial<CurrentUser>) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  
  // 权限检查 - 基于Admin端的access字段
  hasPermission: (check: PermissionCheck) => boolean;
  hasRole: (role: string) => boolean;
  
  // Token 管理
  validateToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
  
  // 应用状态管理
  handleAppStateChange: (nextAppState: AppStateStatus) => void;
}

// 创建 Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 组件
interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 错误处理工具函数
  const handleAuthError = useCallback((error: any): AuthError => {
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
    
    if (error?.code === 'NETWORK_ERROR') {
      return {
        type: AuthErrorType.NETWORK_ERROR,
        message: '网络连接异常，请检查网络设置',
        retryable: true,
      };
    }
    
    return {
      type: AuthErrorType.UNKNOWN_ERROR,
      message: error?.message || '操作失败，请稍后重试',
      retryable: true,
    };
  }, []);

  // 登录 - 匹配Admin端流程
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const result = await authService.login(credentials);
      
      if (result.status === 'ok' && result.token && result.refreshToken) {
        // 获取用户信息
        const userResponse = await authService.getCurrentUser();
        
        if (userResponse.success && userResponse.data && userResponse.data.isLogin !== false) {
          const tokenExpiresAt = result.expiresAt ? new Date(result.expiresAt).getTime() : undefined;
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
      const authError = handleAuthError(error);
      dispatch({ type: 'AUTH_FAILURE', payload: authError });
      throw authError;
    }
  }, [handleAuthError]);

  // 注册
  const register = useCallback(async (userData: RegisterRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const result = await authService.register(userData);
      
      if (!result.success) {
        throw new Error(result.errorMessage || '注册失败');
      }
      
      dispatch({ type: 'AUTH_SET_LOADING', payload: false });
    } catch (error) {
      const authError = handleAuthError(error);
      dispatch({ type: 'AUTH_FAILURE', payload: authError });
      throw authError;
    }
  }, [handleAuthError]);

  // 登出
  const logout = useCallback(async () => {
    try {
      // 调用认证服务登出
      await authService.logout();
    } catch (error) {
      console.error('AuthContext: Logout service call failed:', error);
    } finally {
      // 无论服务调用是否成功，都要清除本地状态
      dispatch({ type: 'AUTH_LOGOUT' });
      
      // 清除本地存储
      await apiService.clearAllTokens();
    }
  }, []);

  // Token 验证 - 简化以匹配Admin端
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.token) {
        return false;
      }
      
      // 调用 API 验证 token
      return await apiService.validateToken();
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, [state.token]);

  // 刷新认证状态 - 简化以匹配Admin端
  const refreshAuth = useCallback(async () => {
    try {
      // 检查 token 是否存在且未过期
      if (state.token && !isTokenExpired()) {
        // 尝试获取最新用户信息
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data && userResponse.data.isLogin !== false) {
          dispatch({ type: 'AUTH_UPDATE_USER', payload: userResponse.data });
          return;
        }
      }
      
      // 如果 token 无效或过期，尝试刷新 token
      if (state.refreshToken) {
        const refreshResult = await authService.refreshToken(state.refreshToken);
        if (refreshResult.success && refreshResult.data) {
          const { token, refreshToken, expiresAt } = refreshResult.data;
          const tokenExpiresAt = expiresAt ? new Date(expiresAt).getTime() : undefined;
          dispatch({
            type: 'AUTH_REFRESH_TOKEN',
            payload: { token, refreshToken, expiresAt: tokenExpiresAt },
          });
          
          // 获取用户信息
          const userResponse = await authService.getCurrentUser();
          if (userResponse.success && userResponse.data && userResponse.data.isLogin !== false) {
            dispatch({ type: 'AUTH_UPDATE_USER', payload: userResponse.data });
          }
          return;
        }
      }
      
      // 如果刷新失败，执行登出
      await logout();
    } catch (error) {
      console.error('AuthContext: Refresh auth failed:', error);
      await logout();
    }
  }, [state.token, state.refreshToken, state.tokenExpiresAt, logout]);

  // 检查认证状态 - 简化以匹配Admin端
  const checkAuth = useCallback(async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // 首先检查本地 token
      const token = await apiService.getToken();
      if (!token) {
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }
      
      // 直接获取用户信息来验证token（避免重复调用）
      const userResponse = await authService.getCurrentUser();
      if (userResponse.success && userResponse.data && userResponse.data.isLogin !== false) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: userResponse.data,
            token,
          },
        });
      } else {
        await logout();
      }
    } catch (error) {
      console.error('AuthContext: Check auth error:', error);
      await logout();
    }
  }, [logout]);

  // 更新用户资料
  const updateProfile = useCallback(async (profileData: Partial<CurrentUser>) => {
    try {
      const response = await authService.updateProfile(profileData);
      
      if (response.success && response.data) {
        dispatch({ type: 'AUTH_UPDATE_USER', payload: response.data });
      } else {
        throw new Error(response.errorMessage || '更新失败');
      }
    } catch (error) {
      const authError = handleAuthError(error);
      throw authError;
    }
  }, [handleAuthError]);

  // 修改密码 - 匹配Admin端
  const changePassword = useCallback(async (request: ChangePasswordRequest) => {
    try {
      const response = await authService.changePassword(request);
      
      if (!response.success) {
        throw new Error(response.errorMessage || '修改密码失败');
      }
    } catch (error) {
      const authError = handleAuthError(error);
      throw authError;
    }
  }, [handleAuthError]);

  // 权限检查 - 基于Admin端的access字段
  const hasPermission = useCallback((check: PermissionCheck): boolean => {
    if (!state.user || !state.isAuthenticated) {
      return false;
    }
    
    const { access, role } = check;
    
    // 检查角色
    if (role && state.user.access === role) {
      return true;
    }
    
    // 检查权限（基于access字段）
    if (access && state.user.access === access) {
      return true;
    }
    
    return false;
  }, [state.user, state.isAuthenticated]);

  // 角色检查 - 基于Admin端的access字段
  const hasRole = useCallback((role: string): boolean => {
    return state.user?.access === role;
  }, [state.user]);

  // 应用状态变化处理
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && state.isAuthenticated) {
      // 应用从后台回到前台时刷新认证状态
      refreshAuth();
    }
  }, [state.isAuthenticated, refreshAuth]);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // 设置加载状态
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'AUTH_SET_LOADING', payload: loading });
  }, []);

  // 检查 token 是否过期
  const isTokenExpired = useCallback((): boolean => {
    if (!state.tokenExpiresAt) {
      return false; // 如果没有过期时间，假设不过期
    }
    
    // 提前 5 分钟认为 token 过期，以便有时间刷新
    const bufferTime = 5 * 60 * 1000; // 5 分钟
    return Date.now() >= (state.tokenExpiresAt - bufferTime);
  }, [state.tokenExpiresAt]);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
    
    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [checkAuth, handleAppStateChange]);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
    setLoading,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole,
    validateToken,
    isTokenExpired,
    handleAppStateChange,
  }), [
    state,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
    setLoading,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole,
    validateToken,
    isTokenExpired,
    handleAppStateChange,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}