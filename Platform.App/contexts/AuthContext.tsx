/**
 * 认证上下文
 * 提供全局认证状态和操作方法
 */

import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
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
import { tokenManager } from '@/services/tokenManager';
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
  reportError: (error: any) => void; // 报告错误到全局错误处理
  
  // 用户管理
  updateProfile: (profileData: UpdateProfileParams) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  
  // 权限检查
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (roleName: string) => boolean;
  can: (resource: string, action: string) => boolean;
  
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
  // 注意：updateProfileAction 内部已经处理错误并分发到全局状态，这里不需要再次处理
  const updateProfile = useCallback(async (profileData: UpdateProfileParams) => {
    await updateProfileAction(profileData, dispatch);
  }, []);

  // 修改密码
  const changePassword = useCallback(async (request: ChangePasswordRequest): Promise<void> => {
    await changePasswordAction(request, dispatch);
  }, []);

  // 权限检查
  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (!state.user || !state.isAuthenticated || !state.user.permissions) {
      return false;
    }
    
    return state.user.permissions.includes(permissionCode);
  }, [state.user, state.isAuthenticated]);

  // 角色检查
  const hasRole = useCallback((roleName: string): boolean => {
    if (!state.user || !state.user.roles) {
      return false;
    }
    
    return state.user.roles.includes(roleName);
  }, [state.user]);

  // 检查是否有资源的指定操作权限
  const can = useCallback((resource: string, action: string): boolean => {
    return hasPermission(`${resource}:${action}`);
  }, [hasPermission]);

  // 应用状态变化处理
  // 使用 ref 存储最新的认证状态，避免频繁重新创建回调
  const isAuthenticatedRef = useRef(state.isAuthenticated);
  
  useEffect(() => {
    isAuthenticatedRef.current = state.isAuthenticated;
  }, [state.isAuthenticated]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isAuthenticatedRef.current) {
      // 非阻塞方式刷新认证，避免阻塞应用状态切换
      void refreshAuth();
    }
  }, [refreshAuth]);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // 报告错误到全局错误处理
  // 用于页面将非认证相关的 API 错误报告到全局错误处理
  const reportError = useCallback((error: any) => {
    const authError = handleAuthError(error);
    // 分发错误到全局状态，让 AuthErrorHandler 显示错误
    dispatch({ type: 'AUTH_FAILURE', payload: authError });
  }, [handleAuthError]);

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

  // 初始化时检查认证状态（非阻塞，避免阻塞页面渲染）
  useEffect(() => {
    let mounted = true;
    
    // 快速检查是否有 token，如果没有则立即完成
    const quickCheck = async () => {
      try {
        const token = await tokenManager.getToken();
        if (!token) {
          // 没有 token，立即设置为未认证状态
          dispatch({ type: 'AUTH_LOGOUT' });
          dispatch({ type: 'AUTH_SET_LOADING', payload: false });
          return;
        }
      } catch (error) {
        // token 检查失败，也立即完成
        if (__DEV__) {
          console.warn('AuthContext: Token check failed:', error);
        }
        dispatch({ type: 'AUTH_LOGOUT' });
        dispatch({ type: 'AUTH_SET_LOADING', payload: false });
        return;
      }
      
      // 有 token，执行完整的认证检查
      // checkAuthAction 内部已经有超时保护（15秒），不需要外部再设置超时
      // 这样可以避免双重超时导致的状态不一致问题
      void checkAuth();
    };
    
    void quickCheck();
    
    return () => {
      mounted = false;
    };
  }, [checkAuth]);

  // 监听 token 被外部清除（如 401 时自动清理）
  useEffect(() => {
    const listener = async () => {
      // 直接从存储检查 token，而不是依赖可能不同步的 Redux 状态
      // 问题：tokenManager.clearAllTokens() 会先清除 AsyncStorage，然后触发此事件
      // 此时 Redux 状态可能还没有更新，如果使用 state.token 或 tokenRef.current
      // 可能仍然有旧值，导致条件判断错误，阻止登出操作
      // 解决方案：直接从 tokenManager 读取实际的存储状态，确保判断准确
      const actualToken = await tokenManager.getToken();
      
      // 如果存储中确实没有 token，或者当前未认证，则执行登出
      // 注意：检查 isAuthenticatedRef 避免在登录过程中触发登出导致状态冲突
      if (!actualToken || !isAuthenticatedRef.current) {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    apiService.addAuthStateChangeListener(listener);

    return () => {
      apiService.removeAuthStateChangeListener(listener);
    };
  }, []);
  
  // 监听应用状态变化
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [handleAppStateChange]);

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
    can,
    validateToken,
    isTokenExpired,
    handleAppStateChange,
    reportError,
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
    can,
    validateToken,
    isTokenExpired,
    handleAppStateChange,
    reportError,
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
