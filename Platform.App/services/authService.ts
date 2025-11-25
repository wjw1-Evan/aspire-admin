import { apiClient, setToken, clearToken, getToken } from './api';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    User,
    CurrentUserResponse,
    RefreshTokenRequest,
    UpdatePasswordRequest,
    UpdateProfileRequest,
} from '../types/auth';
import { ApiResponse } from '../types/api';

/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
export const authService = {
    /**
     * Login with username and password
     */
    async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
        const response = await apiClient.post<any, ApiResponse<LoginResponse>>(
            '/api/auth/login',
            request
        );

        // Store tokens if login successful
        if (response.success && response.data) {
            // Use setToken to update both cache and storage
            await setToken(response.data.token);  // Backend returns 'token' not 'accessToken'
            await storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
        }

        return response;
    },

    /**
     * Register a new user
     */
    async register(request: RegisterRequest): Promise<ApiResponse<User>> {
        const response = await apiClient.post<any, ApiResponse<User>>(
            '/api/auth/register',
            request
        );

        return response;
    },

    /**
     * Get image captcha for login
     */
    async getImageCaptcha(type: string = 'login'): Promise<ApiResponse<{
        captchaId: string;
        imageData: string;
        expiresIn: number;
    }>> {
        return await apiClient.get<any, ApiResponse<{
            captchaId: string;
            imageData: string;
            expiresIn: number;
        }>>(`/api/auth/captcha/image?type=${type}`);
    },

    /**
     * Logout the current user
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage and cache regardless of API response
            await clearToken();
            await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
            await storage.remove(STORAGE_KEYS.USER_INFO);
            await storage.remove(STORAGE_KEYS.CURRENT_COMPANY_ID);
        }
    },

    /**
     * Get current user information
     */
    async getCurrentUser(): Promise<ApiResponse<User>> {
        const response = await apiClient.get<any, ApiResponse<User>>(
            '/api/auth/current-user'
        );

        // Cache user info
        // Backend returns User object directly in data field
        if (response.success && response.data) {
            await storage.set(STORAGE_KEYS.USER_INFO, response.data);
            if (response.data.currentCompanyId) {
                await storage.set(
                    STORAGE_KEYS.CURRENT_COMPANY_ID,
                    response.data.currentCompanyId
                );
            }
        }

        return response;
    },

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(): Promise<ApiResponse<LoginResponse>> {
        const refreshToken = await storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await apiClient.post<any, ApiResponse<LoginResponse>>(
            '/api/auth/refresh-token',
            { refreshToken } as RefreshTokenRequest
        );

        // Update stored tokens
        if (response.success && response.data) {
            await setToken(response.data.token);  // Backend returns 'token' not 'accessToken'
            await storage.set(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
        }

        return response;
    },

    /**
     * Update user password
     */
    async updatePassword(request: UpdatePasswordRequest): Promise<ApiResponse<void>> {
        return await apiClient.post<any, ApiResponse<void>>(
            '/api/user/change-password',
            request
        );
    },

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await getToken();
        return !!token;
    },

    /**
     * Get stored access token
     */
    async getAccessToken(): Promise<string | null> {
        return await getToken();
    },

    /**
     * Get cached user info from storage
     */
    async getCachedUser(): Promise<User | null> {
        return await storage.get<User>(STORAGE_KEYS.USER_INFO);
    },
};
