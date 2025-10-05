const TOKEN_KEY = 'auth_token';

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
  }
};
