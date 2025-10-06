// 认证状态管理 Context

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { AuthState, CurrentUser, LoginRequest, RegisterRequest } from '@/types/auth';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';

// 认证 Action 类型
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: CurrentUser; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: CurrentUser | null };

// 初始状态
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'LOGIN_FAILURE':
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload?.isLogin === true,
      };
    default:
      return state;
  }
}

// Context 类型
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (profileData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => Promise<void>;
}

// 创建 Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 组件
interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 登录
  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const result = await authService.login(credentials);
      
      if (result.token) {
        // 获取用户信息
        const userResponse = await authService.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: userResponse.data,
              token: result.token,
            },
          });
        } else {
          throw new Error('获取用户信息失败');
        }
      } else {
        throw new Error('登录失败');
      }
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error instanceof Error ? error.message : '登录失败',
      });
      throw error;
    }
  };

  // 注册
  const register = async (userData: RegisterRequest) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const result = await authService.register(userData);
      
      if (!result.success) {
        throw new Error(result.errorMessage || '注册失败');
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    try {
      // 调用认证服务登出
      await authService.logout();
      
      // 清除认证状态
      dispatch({ type: 'LOGOUT' });
      
      // 强制刷新应用状态
      await refreshApplicationState();
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      
      // 即使登出请求失败，也要清除本地状态
      // 这确保了用户界面状态的一致性
      dispatch({ type: 'LOGOUT' });
      
      // 强制刷新应用状态
      await refreshApplicationState();
      
      // 重新抛出错误，让调用者处理
      throw error;
    }
  };

  // 刷新应用状态
  const refreshApplicationState = async () => {
    try {
      // 重新检查认证状态
      await checkAuth();
      
      // 可选：重新加载应用
      // 在React Native中，可以通过重新初始化应用来实现
    } catch (error) {
      console.error('AuthContext: Failed to refresh application state:', error);
      // 不抛出错误，因为这不是关键操作
    }
  };

  // 更新用户资料
  const updateProfile = async (profileData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => {
    try {
      const response = await authService.updateProfile(profileData);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_USER', payload: response.data });
      } else {
        throw new Error(response.errorMessage || '更新失败');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  // 检查认证状态
  const checkAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // 首先验证token有效性
      const isTokenValid = await apiService.validateToken();
      
      if (isTokenValid) {
        // token有效，获取用户信息
        try {
          const userResponse = await authService.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            const token = await apiService.getToken();
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { 
                user: userResponse.data, 
                token: token || ''
              } 
            });
          } else {
            // 用户信息获取失败，清除 token
            await apiService.removeToken();
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          // 获取用户信息失败，清除 token
          console.error('AuthContext: Failed to get user info:', error);
          await apiService.removeToken();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        // token无效或不存在，设置为未登录状态
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('AuthContext: Check auth error:', error);
      dispatch({ type: 'LOGOUT' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 初始化时检查认证状态
  useEffect(() => {
    // 设置API服务的登出回调
    apiService.setLogoutCallback(logout);
    
    checkAuth();
    
    // 监听API服务的认证状态变化
    const handleAuthStateChange = () => {
      checkAuth();
    };
    
    apiService.addAuthStateChangeListener(handleAuthStateChange);
    
    // 清理监听器
    return () => {
      apiService.removeAuthStateChangeListener(handleAuthStateChange);
    };
  }, [logout]);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
  }), [state, login, register, logout, checkAuth, updateProfile]);

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
