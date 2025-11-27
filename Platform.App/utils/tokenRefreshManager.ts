/**
 * Token 刷新管理器
 * 防止并发请求时多次刷新 token
 */

import { apiClient } from '../services/api';
import { tokenUtils } from './token';
import { RefreshTokenRequest } from '../types/auth';
import { ApiResponse, LoginResponse } from '../types/api';

/**
 * Token 刷新结果
 */
interface TokenRefreshResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Token 刷新管理器
 * 单例模式，确保同一时间只有一个刷新请求在进行
 */
class TokenRefreshManager {
  private static refreshPromise: Promise<TokenRefreshResult | null> | null = null;

  /**
   * 刷新 token
   * 如果已经有刷新请求在进行，等待其完成并返回相同的结果
   */
  static async refresh(refreshToken: string): Promise<TokenRefreshResult | null> {
    // 如果已经有刷新请求在进行，等待其完成
    if (this.refreshPromise) {
      if (__DEV__) {
        console.log('Token refresh already in progress, waiting for completion...');
      }
      return this.refreshPromise;
    }

    // 创建新的刷新请求
    this.refreshPromise = this.doRefresh(refreshToken);

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      // 清除刷新 Promise，允许下次刷新
      this.refreshPromise = null;
    }
  }

  /**
   * 执行实际的 token 刷新逻辑
   */
  private static async doRefresh(refreshToken: string): Promise<TokenRefreshResult | null> {
    try {
      const response = await apiClient.post<RefreshTokenRequest, ApiResponse<LoginResponse>>(
        '/api/auth/refresh-token',
        { refreshToken } as RefreshTokenRequest
      );

      if (!response.success || !response.data) {
        return {
          success: false,
        };
      }

      const refreshResult = response.data;
      const hasValidTokens =
        refreshResult.status === 'ok' &&
        refreshResult.token &&
        refreshResult.refreshToken;

      if (hasValidTokens) {
        const expiresAt = refreshResult.expiresAt
          ? new Date(refreshResult.expiresAt).getTime()
          : undefined;

        // 保存新的 token
        await tokenUtils.setTokens(
          refreshResult.token!,
          refreshResult.refreshToken!,
          expiresAt,
        );

        return {
          success: true,
          token: refreshResult.token,
          refreshToken: refreshResult.refreshToken,
          expiresAt,
        };
      }

      return {
        success: false,
      };
    } catch (error) {
      if (__DEV__) {
        console.error('Token refresh failed:', error);
      }
      return {
        success: false,
      };
    }
  }

  /**
   * 使用新的 token 重试原始请求
   */
  static async retryRequest(originalRequest: any, newToken: string): Promise<any> {
    originalRequest._retry = true;
    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newToken}`,
    };
    return apiClient(originalRequest);
  }

  /**
   * 检查是否正在刷新 token
   */
  static isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }
}

export default TokenRefreshManager;

