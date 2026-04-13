import { request } from '@umijs/max';
import type { ApiResponse } from '@/types';

export interface CurrentUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  createdAt?: string;
}

export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  code?: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
}

export async function currentUser(): Promise<ApiResponse<CurrentUser>> {
  return request('/apiservice/api/auth/current-user', { method: 'GET' });
}

export async function queryCurrentUser(): Promise<ApiResponse<CurrentUser>> {
  return request('/apiservice/api/auth/current-user', { method: 'GET' });
}

export async function outLogin(): Promise<ApiResponse<unknown>> {
  return request('/apiservice/api/auth/logout', { method: 'POST' });
}

export async function login(body: { username: string; password?: string; type?: string; captchaId?: string; captchaAnswer?: string }): Promise<ApiResponse<LoginResult>> {
  return request('/apiservice/api/auth/login', { method: 'POST', data: body });
}

export async function register(body: { username: string; password: string; email?: string; captchaId?: string; captchaAnswer?: string }): Promise<ApiResponse<unknown>> {
  return request('/apiservice/api/auth/register', { method: 'POST', data: body });
}

export async function checkUsernameExists(username: string): Promise<ApiResponse<{ exists: boolean }>> {
  return request('/apiservice/api/auth/check-username', { method: 'GET', params: { username } });
}

export async function sendResetCode(body: { email: string }): Promise<ApiResponse<unknown>> {
  return request('/apiservice/api/auth/send-reset-code', { method: 'POST', data: body });
}

export async function resetPassword(body: { email: string; code: string; newPassword: string; confirmPassword?: string }): Promise<ApiResponse<unknown>> {
  return request('/apiservice/api/auth/reset-password', { method: 'POST', data: body });
}

export async function changePassword(body: { currentPassword: string; newPassword: string }): Promise<ApiResponse<unknown>> {
  return request('/apiservice/api/auth/change-password', { method: 'POST', data: body });
}

export async function getPublicKey(): Promise<ApiResponse<{ key: string }>> {
  return request('/apiservice/api/auth/public-key', { method: 'GET' });
}

export async function getCurrentUserProfile(): Promise<ApiResponse<CurrentUser>> {
  return request('/apiservice/api/users/me', { method: 'GET' });
}

export async function updateUserProfile(data: Partial<CurrentUser>): Promise<ApiResponse<CurrentUser>> {
  return request('/apiservice/api/users/me', { method: 'PUT', data });
}

export async function getUserStatistics(): Promise<ApiResponse<UserStatistics>> {
  return request('/apiservice/api/users/statistics', { method: 'GET' });
}

export interface CaptchaResult {
  captchaId: string;
  captchaImage: string;
  imageData?: string;
}

export async function getImageCaptcha(type?: 'login' | 'register'): Promise<ApiResponse<CaptchaResult>> {
  return request('/apiservice/api/auth/captcha/image', { method: 'GET', params: { type } });
}

export async function verifyImageCaptcha(captchaId: string, captchaCode: string, type?: 'login' | 'register'): Promise<ApiResponse<{ valid: boolean }>> {
  return request('/apiservice/api/auth/captcha/verify-image', { method: 'POST', data: { captchaId, answer: captchaCode, type } });
}

export async function isCaptchaRequired(type?: 'login' | 'register'): Promise<ApiResponse<{ required: boolean }>> {
  return request('/apiservice/api/auth/captcha/required', { method: 'GET', params: { type } });
}

export async function refreshToken(body: { refreshToken: string }): Promise<ApiResponse<LoginResult>> {
  return request('/apiservice/api/auth/refresh-token', { method: 'POST', data: body });
}
