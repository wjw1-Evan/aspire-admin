/**
 * Authentication related types
 */

export interface LoginRequest {
    username: string;
    password: string;
    captchaId?: string;
    captchaAnswer?: string;
}

export interface LoginResponse {
    token: string;  // Backend returns 'token' not 'accessToken'
    refreshToken: string;
    expiresIn?: number;
    expiresAt?: string;
    currentAuthority?: string;
    tokenType?: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    email: string;
    phone?: string;
    realName?: string;
    companyName?: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    phone?: string;
    realName?: string;
    name?: string; // Backend returns 'name'
    avatar?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    currentCompanyId?: string;
    createdAt: string;
    updatedAt?: string;
    roles?: string[];
    menuIds?: string[];
}

export interface CurrentUserResponse {
    user: User;
    company?: {
        id: string;
        name: string;
        code: string;
    };
    permissions?: string[];
    menus?: any[];
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface UpdatePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface UpdateProfileRequest {
    realName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
}
