import { request as requestClient } from '@umijs/max';
import { refreshToken as refreshTokenApi } from '@/services/ant-design-pro/api';
import { tokenUtils } from './token';

interface TokenRefreshResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/** 刷新 API 响应 data 结构（后端 JsonNamingPolicy.CamelCase） */
interface RefreshApiData {
  status?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

class TokenRefreshManager {
  private static refreshPromise: Promise<TokenRefreshResult | null> | null = null;
  private static currentRefreshingToken: string | null = null;

  static async refresh(refreshToken: string): Promise<TokenRefreshResult | null> {
    if (TokenRefreshManager.refreshPromise) {
      return TokenRefreshManager.refreshPromise;
    }

    TokenRefreshManager.currentRefreshingToken = refreshToken;
    TokenRefreshManager.refreshPromise = TokenRefreshManager.doRefresh(refreshToken);

    try {
      return await TokenRefreshManager.refreshPromise;
    } finally {
      TokenRefreshManager.refreshPromise = null;
      TokenRefreshManager.currentRefreshingToken = null;
    }
  }

  private static async doRefresh(refreshToken: string): Promise<TokenRefreshResult | null> {
    try {
      const refreshResponse = await refreshTokenApi({ refreshToken });

      if (!refreshResponse.success || !refreshResponse.data) {
        return { success: false };
      }

      const data = refreshResponse.data as RefreshApiData;

      if (data.status === 'ok' && data.token && data.refreshToken) {
        const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : undefined;

        tokenUtils.setTokens(data.token, data.refreshToken, expiresAt);

        return {
          success: true,
          token: data.token,
          refreshToken: data.refreshToken,
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
    const { url, ...restConfig } = originalRequest;
    return requestClient(url, restConfig);
  }

  static isRefreshing(): boolean {
    return TokenRefreshManager.refreshPromise !== null;
  }
}

export default TokenRefreshManager;
