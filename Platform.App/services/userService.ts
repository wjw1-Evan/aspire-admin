import { apiClient } from './api';
import { User, UpdateProfileRequest } from '../types/auth';
import { ApiResponse } from '../types/api';

/**
 * User Service
 * Handles user profile and user-related operations
 */
export const userService = {
    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<ApiResponse<User>> {
        return await apiClient.get<any, ApiResponse<User>>(`/api/users/${userId}`);
    },

    /**
     * Update current user's profile
     */
    async updateProfile(request: UpdateProfileRequest): Promise<ApiResponse<User>> {
        return await apiClient.put<any, ApiResponse<User>>(
            '/api/users/me',
            {
                Name: request.realName,
                Email: request.email,
                PhoneNumber: request.phone,
                Avatar: request.avatar,
            },
        );
    },

    /**
     * Upload user avatar
     */
    async uploadAvatar(file: FormData): Promise<ApiResponse<{ url: string }>> {
        return await apiClient.post<any, ApiResponse<{ url: string }>>(
            '/api/users/upload-avatar',
            file,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
    },
};
