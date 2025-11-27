import { storage } from './storage';
import { STORAGE_KEYS, APP_CONFIG } from './constants';

// Token 过期缓冲时间（毫秒）
// 提前这个时间认为 token 过期，以便有时间刷新
// 统一配置：与管理后台保持一致
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 分钟

export const tokenUtils = {
  // 保存 token
  setToken: async (token: string): Promise<void> => {
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  // 获取 token
  getToken: async (): Promise<string | null> => {
    return await storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  },

  // 删除 token
  removeToken: async (): Promise<void> => {
    await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
  },

  // 检查是否有 token
  hasToken: async (): Promise<boolean> => {
    const token = await storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  },

  // 刷新token管理
  setRefreshToken: async (refreshToken: string): Promise<void> => {
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  },

  getRefreshToken: async (): Promise<string | null> => {
    return await storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
  },

  removeRefreshToken: async (): Promise<void> => {
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
  },

  // Token过期时间管理
  setTokenExpiresAt: async (expiresAt: number): Promise<void> => {
    await storage.set(STORAGE_KEYS.USER_INFO, { tokenExpiresAt: expiresAt });
  },

  getTokenExpiresAt: async (): Promise<number | null> => {
    const userInfo = await storage.get<any>(STORAGE_KEYS.USER_INFO);
    return userInfo?.tokenExpiresAt || null;
  },

  removeTokenExpiresAt: async (): Promise<void> => {
    const userInfo = await storage.get<any>(STORAGE_KEYS.USER_INFO);
    if (userInfo) {
      delete userInfo.tokenExpiresAt;
      await storage.set(STORAGE_KEYS.USER_INFO, userInfo);
    }
  },

  // 设置所有token信息
  setTokens: async (token: string, refreshToken: string, expiresAt?: number): Promise<void> => {
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (expiresAt) {
      const userInfo = await storage.get<any>(STORAGE_KEYS.USER_INFO) || {};
      userInfo.tokenExpiresAt = expiresAt;
      await storage.set(STORAGE_KEYS.USER_INFO, userInfo);
    }
  },

  // 清除所有token
  clearAllTokens: async (): Promise<void> => {
    await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    const userInfo = await storage.get<any>(STORAGE_KEYS.USER_INFO);
    if (userInfo) {
      delete userInfo.tokenExpiresAt;
      await storage.set(STORAGE_KEYS.USER_INFO, userInfo);
    }
  },

  // 检查token是否过期
  isTokenExpired: async (): Promise<boolean> => {
    const expiresAt = await tokenUtils.getTokenExpiresAt();
    if (!expiresAt) {
      return false; // 如果没有过期时间，假设不过期
    }

    // 使用统一的缓冲时间
    return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER;
  },
};

