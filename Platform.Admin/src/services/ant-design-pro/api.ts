import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/api-response';

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
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
}

export async function currentUser(): Promise<ApiResponse<CurrentUser>> {
  return request('/api/auth/current-user', { method: 'GET' });
}

export async function queryCurrentUser(): Promise<ApiResponse<CurrentUser>> {
  return request('/api/auth/current-user', { method: 'GET' });
}

export async function outLogin(): Promise<ApiResponse<unknown>> {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function login(body: { username: string; password: string }): Promise<ApiResponse<LoginResult>> {
  return request('/api/auth/login', { method: 'POST', data: body });
}

export async function register(body: { username: string; password: string; email?: string }): Promise<ApiResponse<unknown>> {
  return request('/api/auth/register', { method: 'POST', data: body });
}

export async function checkUsernameExists(username: string): Promise<ApiResponse<{ exists: boolean }>> {
  return request('/api/auth/check-username', { method: 'GET', params: { username } });
}

export async function sendResetCode(email: string): Promise<ApiResponse<unknown>> {
  return request('/api/auth/send-reset-code', { method: 'POST', data: { email } });
}

export async function resetPassword(code: string, newPassword: string): Promise<ApiResponse<unknown>> {
  return request('/api/auth/reset-password', { method: 'POST', data: { code, newPassword } });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<unknown>> {
  return request('/api/auth/change-password', { method: 'POST', data: { oldPassword, newPassword } });
}

export async function getPublicKey(): Promise<ApiResponse<{ key: string }>> {
  return request('/api/auth/public-key', { method: 'GET' });
}

export async function getCurrentUserProfile(): Promise<ApiResponse<CurrentUser>> {
  return request('/api/users/profile', { method: 'GET' });
}

export async function updateUserProfile(data: Partial<CurrentUser>): Promise<ApiResponse<CurrentUser>> {
  return request('/api/users/profile', { method: 'PUT', data });
}

export async function getUserStatistics(): Promise<ApiResponse<UserStatistics>> {
  return request('/api/users/statistics', { method: 'GET' });
}

export interface CaptchaResult {
  captchaId: string;
  captchaImage: string;
  imageData?: string;
}

export async function getImageCaptcha(type?: 'login' | 'register'): Promise<ApiResponse<CaptchaResult>> {
  return request('/api/auth/captcha/image', { method: 'GET', params: { type } });
}

export async function verifyImageCaptcha(captchaId: string, captchaCode: string, type?: 'login' | 'register'): Promise<ApiResponse<{ valid: boolean }>> {
  return request('/api/auth/captcha/verify-image', { method: 'POST', data: { captchaId, captchaCode, type } });
}
