import { apiClient, setToken, clearToken, getToken } from './api';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { tokenUtils } from '../utils/token';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UpdatePasswordRequest,
  UpdateProfileRequest,
} from '../types/auth';
import { ApiResponse } from '../types/api';

type AuthListener = (isAuthenticated: boolean) => void;
const listeners: AuthListener[] = [];

const notifyListeners = (isAuthenticated: boolean) => {
  listeners.forEach(listener => listener(isAuthenticated));
};

export const authService = {
  addAuthListener: (listener: AuthListener) => {
    listeners.push(listener);
  },
  removeAuthListener: (listener: AuthListener) => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  },

  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<any, ApiResponse<LoginResponse>>(
      '/api/auth/login',
      request
    );

    if (response.success && response.data) {
      const { token, refreshToken, expiresAt } = response.data;
      const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : undefined;
      await setToken(token);
      await tokenUtils.setRefreshToken(refreshToken);
      if (expiresAtMs) {
        await tokenUtils.setTokenExpiresAt(expiresAtMs);
      }
    }

    return response;
  },

  notifyLoginSuccess: () => {
    notifyListeners(true);
  },

  async register(request: RegisterRequest): Promise<ApiResponse<User>> {
    return await apiClient.post<any, ApiResponse<User>>('/api/auth/register', request);
  },

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

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearToken();
      await tokenUtils.clearAllTokens();
      await storage.remove(STORAGE_KEYS.USER_INFO);
      await storage.remove(STORAGE_KEYS.CURRENT_COMPANY_ID);
      notifyListeners(false);
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<any, ApiResponse<User>>('/api/auth/current-user');

    if (response.success && response.data) {
      await storage.set(STORAGE_KEYS.USER_INFO, response.data);
      if (response.data.currentCompanyId) {
        await storage.set(STORAGE_KEYS.CURRENT_COMPANY_ID, response.data.currentCompanyId);
      }
    }

    return response;
  },

  notifyLogout: () => {
    notifyListeners(false);
  },

  async updatePassword(request: UpdatePasswordRequest): Promise<ApiResponse<void>> {
    return await apiClient.post<any, ApiResponse<void>>('/api/users/change-password', request);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },

  async getCachedUser(): Promise<User | null> {
    return await storage.get<User>(STORAGE_KEYS.USER_INFO);
  },
};
