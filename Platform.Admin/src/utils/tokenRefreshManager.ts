import { request as requestClient } from '@umijs/max';
import { tokenUtils } from './token';
import { refreshToken as refreshTokenApi } from '@/services/ant-design-pro/api';

interface TokenRefreshResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

class TokenRefreshManager {
  private static refreshPromise: Promise<TokenRefreshResult | null> | null = null;

  static async refresh(refreshToken: string): Promise<TokenRefreshResult | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh(refreshToken);

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private static async doRefresh(refreshToken: string): Promise<TokenRefreshResult | null> {
    try {
      const refreshResponse = await refreshTokenApi({ refreshToken });

      if (!refreshResponse.success || !refreshResponse.data) {
        return { success: false };
      }

      const refreshResult = refreshResponse.data as any;
      const newRefreshToken = refreshResult.RefreshToken || refreshResult.refreshToken;

      if (refreshResult.status === 'ok' && refreshResult.token && newRefreshToken) {
        const expiresAt = refreshResult.expiresAt
          ? new Date(refreshResult.expiresAt).getTime()
          : undefined;

        tokenUtils.setTokens(refreshResult.token, newRefreshToken, expiresAt);

        return {
          success: true,
          token: refreshResult.token,
          refreshToken: newRefreshToken,
          expiresAt,
        };
      }

      return { success: false };
    } catch {
      return { success: false };
    }
  }

  static retryRequest(originalRequest: any, newToken: string): Promise<any> {
    originalRequest._retry = true;
    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newToken}`,
    };
    return requestClient(originalRequest);
  }

  static isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }
}

export default TokenRefreshManager;
