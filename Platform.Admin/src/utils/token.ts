const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRES_KEY = 'token_expires_at';

export const tokenUtils = {
  // 保存 token
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  // 获取 token
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // 删除 token
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // 检查是否有 token
  hasToken: (): boolean => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // 刷新token管理
  setRefreshToken: (refreshToken: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  removeRefreshToken: () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Token过期时间管理
  setTokenExpiresAt: (expiresAt: number) => {
    localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
  },

  getTokenExpiresAt: (): number | null => {
    const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  },

  removeTokenExpiresAt: () => {
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  },

  // 设置所有token信息
  setTokens: (token: string, refreshToken: string, expiresAt?: number) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
    }
  },

  // 清除所有token
  clearAllTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  },

  // 检查token是否过期
  isTokenExpired: (): boolean => {
    const expiresAt = tokenUtils.getTokenExpiresAt();
    if (!expiresAt) {
      return false; // 如果没有过期时间，假设不过期
    }
    
    // 提前 5 分钟认为 token 过期，以便有时间刷新
    const bufferTime = 5 * 60 * 1000; // 5 分钟
    return Date.now() >= (expiresAt - bufferTime);
  }
};
