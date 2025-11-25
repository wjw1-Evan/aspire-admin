import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, APP_CONFIG, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { ApiResponse, ErrorResponse } from '../types/api';

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

    // Request interceptor - add auth token
    instance.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
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
                    // Clear stored tokens and cache
                    await clearToken();
                    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
                    await storage.remove(STORAGE_KEYS.USER_INFO);

                    // Optionally trigger navigation to login
                    // You can implement a navigation callback here
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
