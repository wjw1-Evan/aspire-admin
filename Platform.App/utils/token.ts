import { storage } from './storage';
import { STORAGE_KEYS } from './constants';

const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

let _refreshTokenCache: string | null = null;

export const tokenUtils = {
  setToken: async (token: string): Promise<void> => {
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  getToken: async (): Promise<string | null> => {
    return await storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  },

  removeToken: async (): Promise<void> => {
    await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
  },

  hasToken: async (): Promise<boolean> => {
    const token = await storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  },

  setRefreshToken: async (refreshToken: string): Promise<void> => {
    _refreshTokenCache = refreshToken;
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  },

  getRefreshToken: async (): Promise<string | null> => {
    if (_refreshTokenCache) return _refreshTokenCache;
    const token = await storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
    if (token) _refreshTokenCache = token;
    return token;
  },

  removeRefreshToken: async (): Promise<void> => {
    _refreshTokenCache = null;
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
  },

  setTokenExpiresAt: async (expiresAt: number): Promise<void> => {
    await storage.set(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt);
  },

  getTokenExpiresAt: async (): Promise<number | null> => {
    return await storage.get<number>(STORAGE_KEYS.TOKEN_EXPIRES);
  },

  removeTokenExpiresAt: async (): Promise<void> => {
    await storage.remove(STORAGE_KEYS.TOKEN_EXPIRES);
  },

  setTokens: async (token: string, refreshToken: string, expiresAt?: number): Promise<void> => {
    _refreshTokenCache = refreshToken;
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (expiresAt) {
      await storage.set(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt);
    }
  },

  clearAllTokens: async (): Promise<void> => {
    _refreshTokenCache = null;
    await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    await storage.remove(STORAGE_KEYS.TOKEN_EXPIRES);
  },

  isTokenExpired: async (): Promise<boolean> => {
    let expiresAt = await tokenUtils.getTokenExpiresAt();

    if (!expiresAt) {
      const token = await tokenUtils.getToken();
      if (!token) return false;
      expiresAt = await tokenUtils.getExpiryFromJwt(token);
      if (!expiresAt) return false;
    }

    return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER;
  },

  getExpiryFromJwt: async (token: string): Promise<number | null> => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const expMs = payload.exp * 1000;
        await storage.set(STORAGE_KEYS.TOKEN_EXPIRES, expMs);
        return expMs;
      }
    } catch {}
    return null;
  },
};
