import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, APP_CONFIG, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { ApiResponse, ErrorResponse } from '../types/api';
import { tokenUtils } from '../utils/token';
import TokenRefreshManager from '../utils/tokenRefreshManager';

/**
 * In-memory token cache to prevent AsyncStorage timing issues
 * This ensures token is immediately available for subsequent requests after login
 */
let tokenCache: string | null = null;

/**
 * Set token in both cache and storage
 */
export const setToken = async (token: string): Promise<void> => {
    tokenCache = token;
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
};

/**
 * Get token from cache first, fallback to storage
 */
export const getToken = async (): Promise<string | null> => {
    if (tokenCache) {
        return tokenCache;
    }
    const token = await storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
        tokenCache = token;
    }
    return token;
};

/**
 * Clear token from both cache and storage
 */
export const clearToken = async (): Promise<void> => {
    tokenCache = null;
    await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * Create and configure axios instance
 */
const createApiInstance = (): AxiosInstance => {
    const instance = axios.create({
        baseURL: API_BASE_URL,
        timeout: APP_CONFIG.REQUEST_TIMEOUT,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor - add auth token and proactive refresh
    instance.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
            // 检查 token 是否即将过期，如果是则主动刷新
            const isExpired = await tokenUtils.isTokenExpired();
            if (isExpired) {
                const refreshToken = await tokenUtils.getRefreshToken();
                if (refreshToken) {
                    const refreshResult = await TokenRefreshManager.refresh(refreshToken);
                    if (refreshResult?.success && refreshResult.token) {
                        // 使用新的 token
                        config.headers.Authorization = `Bearer ${refreshResult.token}`;
                        return config;
                    }
                }
            }

            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    instance.interceptors.response.use(
        (response) => {
            // Return the data directly if it's a successful response
            return response.data;
        },
        async (error: AxiosError<ErrorResponse>) => {
            if (error.response) {
                const { status, data } = error.response;

                // Handle 401 Unauthorized - token expired or invalid
                if (status === 401) {
                    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
                    
                    // 避免刷新 token 递归和重试循环
                    const isRefreshTokenRequest = originalRequest?.url?.includes('/refresh-token');
                    const isRetryRequest = originalRequest?._retry;

                    // 如果是刷新 token 请求本身失败，或已经是重试请求，不再尝试刷新
                    if (isRefreshTokenRequest || isRetryRequest) {
                        // 刷新失败，清除 token 并跳转登录
                        await clearToken();
                        await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
                        await storage.remove(STORAGE_KEYS.USER_INFO);

                        // Optionally trigger navigation to login
                        // You can implement a navigation callback here
                    } else {
                        // 尝试刷新 token
                        const refreshToken = await tokenUtils.getRefreshToken();
                        if (refreshToken) {
                            // 使用 TokenRefreshManager 刷新 token（防止并发刷新）
                            const refreshResult = await TokenRefreshManager.refresh(refreshToken);

                            if (refreshResult?.success && refreshResult.token && originalRequest) {
                                // token 刷新成功，重试原始请求
                                try {
                                    return await TokenRefreshManager.retryRequest(originalRequest, refreshResult.token);
                                } catch (retryError) {
                                    // 重试失败，继续执行错误处理
                                }
                            }
                        }

                        // token 刷新失败，清除 token 并跳转登录
                        await clearToken();
                        await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
                        await storage.remove(STORAGE_KEYS.USER_INFO);
                    }
                }

                // Return formatted error
                return Promise.reject({
                    success: false,
                    errorCode: data?.errorCode || 'UNKNOWN_ERROR',
                    errorMessage: data?.errorMessage || error.message || 'An error occurred',
                    showType: data?.showType || 2,
                    traceId: data?.traceId,
                } as ErrorResponse);
            }

            // Network error or no response
            return Promise.reject({
                success: false,
                errorCode: 'NETWORK_ERROR',
                errorMessage: 'Network error. Please check your connection.',
                showType: 2,
            } as ErrorResponse);
        }
    );

    return instance;
};

// Export the configured instance
export const apiClient = createApiInstance();

/**
 * Helper function to handle API responses
 */
export const handleApiResponse = <T>(response: any): ApiResponse<T> => {
    return response as ApiResponse<T>;
};
