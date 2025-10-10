/**
 * 认证状态 Reducer
 * 纯函数，处理认证状态更新
 */

import { AuthState, CurrentUser, AuthError } from '@/types/unified-api';

// 初始状态
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiresAt: null,
  loading: true,
  error: null,
  lastChecked: null,
};

// Action 类型
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: CurrentUser; token: string; refreshToken?: string; tokenExpiresAt?: number } }
  | { type: 'AUTH_FAILURE'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_SET_LOADING'; payload: boolean }
  | { type: 'AUTH_UPDATE_USER'; payload: CurrentUser }
  | { type: 'AUTH_REFRESH_TOKEN'; payload: { token: string; refreshToken: string; expiresAt?: number } };

// Reducer 函数
export function authReducer(state: AuthState, action: AuthAction): AuthState {
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

