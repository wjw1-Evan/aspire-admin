import { AxiosInstance } from 'axios';
import { tokenUtils } from './token';
import { RefreshTokenRequest, RefreshTokenResult } from '../types/auth';
import { ApiResponse } from '../types/api';

interface TokenRefreshResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

class TokenRefreshManager {
  private static httpClient: AxiosInstance | null = null;
  private static refreshPromise: Promise<TokenRefreshResult | null> | null = null;

  static setApiClient(client: AxiosInstance) {
    this.httpClient = client;
  }

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
      const response = await this.httpClient!.post<RefreshTokenRequest, ApiResponse<RefreshTokenResult>>(
        '/api/auth/refresh-token',
        { refreshToken } as RefreshTokenRequest
      );

      if (!response.success || !response.data) {
        return { success: false };
      }

      const refreshResult = response.data;

      if (refreshResult.status === 'ok' && refreshResult.token && refreshResult.refreshToken) {
        const expiresAt = refreshResult.expiresAt
          ? new Date(refreshResult.expiresAt).getTime()
          : undefined;

        await tokenUtils.setTokens(refreshResult.token, refreshResult.refreshToken, expiresAt);

        return {
          success: true,
          token: refreshResult.token,
          refreshToken: refreshResult.refreshToken,
          expiresAt,
        };
      }

      return { success: false };
    } catch {
      return { success: false };
    }
  }

  static async retryRequest(originalRequest: any, newToken: string): Promise<any> {
    originalRequest._retry = true;
    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newToken}`,
    };
    return this.httpClient!(originalRequest);
  }

  static isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }
}

export default TokenRefreshManager;
