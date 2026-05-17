import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, APP_CONFIG, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { ApiResponse, ErrorResponse } from '../types/api';
import { tokenUtils } from '../utils/token';
import TokenRefreshManager from '../utils/tokenRefreshManager';

let tokenCache: string | null = null;
let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

export const setToken = async (token: string): Promise<void> => {
  tokenCache = token;
  await storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
};

export const getToken = async (): Promise<string | null> => {
  if (tokenCache) return tokenCache;
  const token = await storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) tokenCache = token;
  return token;
};

export const clearToken = async (): Promise<void> => {
  tokenCache = null;
  await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
};

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: APP_CONFIG.REQUEST_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const isExpired = await tokenUtils.isTokenExpired();
      if (isExpired) {
        const refreshResult = await TokenRefreshManager.refresh();
        if (refreshResult?.success && refreshResult.token) {
          tokenCache = refreshResult.token;
          config.headers.Authorization = `Bearer ${refreshResult.token}`;
          return config;
        }
        tokenCache = null;
        await tokenUtils.clearAllTokens();
        logoutCallback?.();
        return Promise.reject({
          success: false,
          errorCode: 'TOKEN_REFRESH_FAILED',
          message: '登录已过期，请重新登录',
        } as ErrorResponse);
      }

      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response.data,
    async (error: AxiosError<ErrorResponse>) => {
      if (!error.response) {
        return Promise.reject({
          success: false,
          errorCode: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
        } as ErrorResponse);
      }

      const { status, data } = error.response;

      if (status === 401) {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const isRefreshTokenRequest = originalRequest?.url?.includes('/refresh-token');
        const isRetryRequest = originalRequest?._retry;

        if (isRefreshTokenRequest || isRetryRequest) {
          tokenCache = null;
          await tokenUtils.clearAllTokens();
          logoutCallback?.();
          return Promise.reject({
            success: false,
            errorCode: 'TOKEN_EXPIRED',
            message: 'Session expired. Please login again.',
          } as ErrorResponse);
        }

        const refreshResult = await TokenRefreshManager.refresh();
        if (refreshResult?.success && refreshResult.token && originalRequest) {
          tokenCache = refreshResult.token;
          try {
            return await TokenRefreshManager.retryRequest(originalRequest, refreshResult.token);
          } catch {}
        }

        tokenCache = null;
        await tokenUtils.clearAllTokens();
        logoutCallback?.();
      }

      return Promise.reject({
        success: false,
        errorCode: data?.errorCode || 'UNKNOWN_ERROR',
        message: data?.message || error.message || 'An error occurred',
        traceId: data?.traceId,
      } as ErrorResponse);
    }
  );

  return instance;
};

export const apiClient = createApiInstance();

// 独立的 Axios 实例用于刷新 token，不携带任何拦截器
// 避免刷新请求进入请求拦截器后因等待 refreshPromise 而形成死锁
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});
TokenRefreshManager.setApiClient(refreshClient);

// retryRequest 需要走完整拦截器链（包括 response.data 转换）
TokenRefreshManager.setRetryClient(apiClient);
