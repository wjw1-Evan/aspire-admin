/**
 * Token 管理器
 * 统一管理所有 token 相关的存储、获取、清除操作
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './apiConfig';

/**
 * Token 信息接口
 */
export interface TokenInfo {
  token: string;
  refreshToken: string;
  expiresAt?: number;
}

/**
 * Token 管理器类
 */
class TokenManager {
  private authStateChangeListeners: (() => void)[] = [];
  private isClearingTokens = false;

  /**
   * 添加认证状态变化监听器
   */
  addAuthStateChangeListener(listener: () => void): void {
    this.authStateChangeListeners.push(listener);
  }

  /**
   * 移除认证状态变化监听器
   */
  removeAuthStateChangeListener(listener: () => void): void {
    this.authStateChangeListeners = this.authStateChangeListeners.filter(l => l !== listener);
  }

  /**
   * 触发认证状态变化事件
   */
  private triggerAuthStateChange(): void {
    this.authStateChangeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in auth state change listener:', error);
      }
    });
  }

  /**
   * 获取存储项
   */
  private async getStorageItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * 设置存储项
   */
  private async setStorageItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
    }
  }

  /**
   * 移除存储项
   */
  private async removeStorageItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  /**
   * 获取访问 token
   */
  async getToken(): Promise<string | null> {
    return this.getStorageItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * 设置访问 token
   */
  async setToken(token: string): Promise<void> {
    return this.setStorageItem(STORAGE_KEYS.TOKEN, token);
  }

  /**
   * 移除访问 token
   */
  async removeToken(): Promise<void> {
    await this.removeStorageItem(STORAGE_KEYS.TOKEN);
    this.triggerAuthStateChange();
  }

  /**
   * 获取刷新 token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * 设置刷新 token
   */
  async setRefreshToken(refreshToken: string): Promise<void> {
    return this.setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /**
   * 移除刷新 token
   */
  async removeRefreshToken(): Promise<void> {
    return this.removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * 获取 token 过期时间
   */
  async getTokenExpiresAt(): Promise<number | null> {
    const expiresAt = await this.getStorageItem(STORAGE_KEYS.TOKEN_EXPIRES);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  }

  /**
   * 设置 token 过期时间
   */
  async setTokenExpiresAt(expiresAt: number): Promise<void> {
    return this.setStorageItem(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt.toString());
  }

  /**
   * 移除 token 过期时间
   */
  async removeTokenExpiresAt(): Promise<void> {
    return this.removeStorageItem(STORAGE_KEYS.TOKEN_EXPIRES);
  }

  /**
   * 设置所有 token（原子操作）
   */
  async setTokens(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
    try {
      const items: [string, string][] = [
        [STORAGE_KEYS.TOKEN, token],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ];
      if (expiresAt) {
        items.push([STORAGE_KEYS.TOKEN_EXPIRES, expiresAt.toString()]);
      }
      await AsyncStorage.multiSet(items);
      // 注意：setTokens 不触发状态变化，因为登录流程会自己 dispatch AUTH_SUCCESS
      // 只在清除 token 时触发状态变化，通知外部 token 被清除
    } catch (error) {
      console.error('Failed to set tokens:', error);
    }
  }

  /**
   * 获取所有 token 信息
   */
  async getAllTokens(): Promise<TokenInfo | null> {
    try {
      const [token, refreshToken, expiresAtStr] = await Promise.all([
        this.getToken(),
        this.getRefreshToken(),
        this.getStorageItem(STORAGE_KEYS.TOKEN_EXPIRES),
      ]);

      if (!token || !refreshToken) {
        return null;
      }

      return {
        token,
        refreshToken,
        expiresAt: expiresAtStr ? parseInt(expiresAtStr, 10) : undefined,
      };
    } catch (error) {
      console.error('Failed to get all tokens:', error);
      return null;
    }
  }

  /**
   * 清除所有 token（防止并发调用）
   */
  async clearAllTokens(): Promise<void> {
    if (this.isClearingTokens) return;

    this.isClearingTokens = true;
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRES,
      ]);
      this.triggerAuthStateChange();
    } catch (error) {
      console.error('Failed to clear all tokens:', error);
    } finally {
      setTimeout(() => {
        this.isClearingTokens = false;
      }, 100);
    }
  }

  /**
   * 检查是否有 token
   */
  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.length > 0;
  }

  /**
   * 检查 token 是否过期
   */
  async isTokenExpired(bufferMs: number = 5 * 60 * 1000): Promise<boolean> {
    const expiresAt = await this.getTokenExpiresAt();
    if (!expiresAt) {
      return false; // 如果没有过期时间，认为未过期
    }
    return Date.now() >= (expiresAt - bufferMs);
  }
}

// 导出单例
export const tokenManager = new TokenManager();

