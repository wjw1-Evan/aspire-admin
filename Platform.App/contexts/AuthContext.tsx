/**
 * 认证上下文
 * 提供全局认证状态和操作方法
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { authReducer, initialAuthState } from './authReducer';
import {
  loginAction,
  registerAction,
  logoutAction,
  refreshAuthAction,
  checkAuthAction,
  updateProfileAction,
  changePasswordAction,
  createErrorHandler,
} from './authActions';
import { apiService } from '@/services/api';
import { TOKEN_EXPIRY_BUFFER } from '@/services/apiConfig';
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  UpdateProfileParams,
  ApiResponse,
  PermissionCheck,
} from '@/types/unified-api';

// Context 类型
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
  updateProfile: (profileData: UpdateProfileParams) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<ApiResponse<boolean>>;
  
  // 权限检查
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
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  
  // 错误处理器
  const handleAuthError = useMemo(() => createErrorHandler(dispatch), []);

  // 登录
  const login = useCallback(async (credentials: LoginRequest) => {
    await loginAction(credentials, dispatch);
  }, []);

  // 注册
  const register = useCallback(async (userData: RegisterRequest) => {
    await registerAction(userData, dispatch);
  }, []);

  // 登出
  const logout = useCallback(async () => {
    await logoutAction(dispatch);
  }, []);

  // Token 验证
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.token) {
        return false;
      }
      return await apiService.validateToken();
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, [state.token]);

  // 刷新认证状态
  const refreshAuth = useCallback(async () => {
    await refreshAuthAction(dispatch);
  }, []);

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    await checkAuthAction(dispatch);
  }, []);

  // 更新用户资料
  const updateProfile = useCallback(async (profileData: UpdateProfileParams) => {
    try {
      await updateProfileAction(profileData, dispatch);
    } catch (error) {
      const authError = handleAuthError(error);
      throw authError;
    }
  }, [handleAuthError]);

  // 修改密码
  const changePassword = useCallback(async (request: ChangePasswordRequest): Promise<ApiResponse<boolean>> => {
    return await changePasswordAction(request);
  }, []);

  // 权限检查
  const hasPermission = useCallback((check: PermissionCheck): boolean => {
    if (!state.user || !state.isAuthenticated) {
      return false;
    }
    
    const { access, role } = check;
    
    if (role && state.user.access === role) {
      return true;
    }
    
    if (access && state.user.access === access) {
      return true;
    }
    
    return false;
  }, [state.user, state.isAuthenticated]);

  // 角色检查
  const hasRole = useCallback((role: string): boolean => {
    return state.user?.access === role;
  }, [state.user]);

  // 应用状态变化处理
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && state.isAuthenticated) {
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
      return false;
    }
    return Date.now() >= (state.tokenExpiresAt - TOKEN_EXPIRY_BUFFER);
  }, [state.tokenExpiresAt]);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // 监听应用状态变化
  useEffect(() => {
    const handleAppStateChangeInternal = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && state.isAuthenticated) {
        refreshAuth();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChangeInternal);
    
    return () => {
      subscription?.remove();
    };
  }, [state.isAuthenticated, refreshAuth]);

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
