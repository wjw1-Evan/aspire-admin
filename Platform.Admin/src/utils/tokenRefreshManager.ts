/**
 * Token 刷新管理器
 * 防止并发请求时多次刷新 token
 */

import { request as requestClient } from '@umijs/max';
import { tokenUtils } from './token';

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
      if (process.env.NODE_ENV === 'development') {
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
      const { refreshToken: refreshTokenAPI } = await import(
        '@/services/ant-design-pro/api'
      );

      const refreshResponse = await refreshTokenAPI({ refreshToken });

      if (!refreshResponse.success || !refreshResponse.data) {
        return {
          success: false,
        };
      }

      const refreshResult = refreshResponse.data;
      const hasValidTokens =
        refreshResult.status === 'ok' &&
        refreshResult.token &&
        refreshResult.refreshToken;

      if (hasValidTokens) {
        const expiresAt = refreshResult.expiresAt
          ? new Date(refreshResult.expiresAt).getTime()
          : undefined;

        // 保存新的 token (已经在 hasValidTokens 中验证过非空)
        tokenUtils.setTokens(
<<<<<<< HEAD
          refreshResult.token!,
          refreshResult.refreshToken!,
=======
          refreshResult.token as string,
          refreshResult.refreshToken as string,
>>>>>>> 0b9b9ef (feat: refactor table column definitions and improve action handling in task and project management components)
          expiresAt,
        );

        return {
          success: true,
          token: refreshResult.token!,
          refreshToken: refreshResult.refreshToken!,
          expiresAt,
        };
      }

      return {
        success: false,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
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
  static retryRequest(originalRequest: any, newToken: string): Promise<any> {
    originalRequest._retry = true;
    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newToken}`,
    };
    return requestClient(originalRequest);
  }

  /**
   * 检查是否正在刷新 token
   */
  static isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }
}

export default TokenRefreshManager;

