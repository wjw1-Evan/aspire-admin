/**
 * 认证上下文
 * 提供全局认证状态和操作方法
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { authReducer, initialAuthState } from './authReducer';
import {
  loginAction,
  registerAction,
  logoutAction,
  checkAuthAction,
  updateProfileAction,
  changePasswordAction,
} from './authActions';
import { tokenManager } from '@/services/tokenManager';
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  UpdateProfileParams,
  ChangePasswordRequest,
} from '@/types/unified-api';

// Context 类型
interface AuthContextType extends AuthState {
  // 基础认证操作
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  
  // 状态管理
  clearError: () => void;
  
  // 用户管理
  updateProfile: (profileData: UpdateProfileParams) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  
  // 权限检查（简化实现）
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (roleName: string) => boolean;
  can: (resource: string, action: string) => boolean;
}

// 创建 Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 组件
interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

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

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // 更新用户资料
  const updateProfile = useCallback(async (profileData: UpdateProfileParams) => {
    await updateProfileAction(profileData, dispatch);
  }, []);

  // 修改密码
  const changePassword = useCallback(async (request: ChangePasswordRequest) => {
    await changePasswordAction(request, dispatch);
  }, []);

  // 权限检查（简化实现）
  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (!state.user || !state.isAuthenticated || !state.user.permissions) {
      return false;
    }
    return state.user.permissions.includes(permissionCode);
  }, [state.user, state.isAuthenticated]);

  // 角色检查（简化实现）
  const hasRole = useCallback((roleName: string): boolean => {
    return state.user?.roles?.includes(roleName) ?? false;
  }, [state.user]);

  // 资源权限检查（简化实现）
  const can = useCallback((resource: string, action: string): boolean => {
    return hasPermission(`${resource}:${action}`);
  }, [hasPermission]);

  // 初始化时检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await tokenManager.getToken();
        if (!token) {
          dispatch({ type: 'AUTH_LOGOUT' });
          dispatch({ type: 'AUTH_SET_LOADING', payload: false });
          return;
        }
        // 有 token，执行完整的认证检查
        await checkAuthAction(dispatch);
      } catch (error) {
        if (__DEV__) {
          console.warn('AuthContext: Check auth failed:', error);
        }
        dispatch({ type: 'AUTH_LOGOUT' });
        dispatch({ type: 'AUTH_SET_LOADING', payload: false });
      }
    };

    void checkAuth();
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      clearError,
      updateProfile,
      changePassword,
      hasPermission,
      hasRole,
      can,
    }),
    [state, login, register, logout, clearError, updateProfile, changePassword, hasPermission, hasRole, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
