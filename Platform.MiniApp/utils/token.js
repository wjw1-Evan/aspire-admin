const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRES_KEY = 'token_expires_at';

// Token 过期缓冲时间（毫秒），提前5分钟刷新
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

const tokenUtils = {
    // 保存 token
    setToken: (token) => {
        wx.setStorageSync(TOKEN_KEY, token);
    },

    // 获取 token
    getToken: () => {
        return wx.getStorageSync(TOKEN_KEY);
    },

    // 删除 token
    removeToken: () => {
        wx.removeStorageSync(TOKEN_KEY);
    },

    // 检查是否有 token
    hasToken: () => {
        return !!wx.getStorageSync(TOKEN_KEY);
    },

    // 刷新token管理
    setRefreshToken: (refreshToken) => {
        wx.setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
    },

    getRefreshToken: () => {
        return wx.getStorageSync(REFRESH_TOKEN_KEY);
    },

    removeRefreshToken: () => {
        wx.removeStorageSync(REFRESH_TOKEN_KEY);
    },

    // Token过期时间管理
    setTokenExpiresAt: (expiresAt) => {
        wx.setStorageSync(TOKEN_EXPIRES_KEY, expiresAt);
    },

    getTokenExpiresAt: () => {
        return wx.getStorageSync(TOKEN_EXPIRES_KEY);
    },

    removeTokenExpiresAt: () => {
        wx.removeStorageSync(TOKEN_EXPIRES_KEY);
    },

    // 设置所有token信息
    setTokens: (token, refreshToken, expiresAt) => {
        wx.setStorageSync(TOKEN_KEY, token);
        wx.setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
        if (expiresAt) {
            wx.setStorageSync(TOKEN_EXPIRES_KEY, expiresAt);
        }
    },

    // 清除所有token
    clearAllTokens: () => {
        wx.removeStorageSync(TOKEN_KEY);
        wx.removeStorageSync(REFRESH_TOKEN_KEY);
        wx.removeStorageSync(TOKEN_EXPIRES_KEY);
    },

    // 检查token是否过期
    isTokenExpired: () => {
        const expiresAt = tokenUtils.getTokenExpiresAt();
        if (!expiresAt) {
            return false;
        }
        return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER;
    }
};

module.exports = tokenUtils;
