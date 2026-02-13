const { request, post } = require('./request.js');
const tokenUtils = require('./token.js');
const PasswordEncryption = require('./rsa.js');

/**
 * 用户登录
 * @param {Object} params 登录参数
 * @param {string} params.username 用户名
 * @param {string} params.password 明文密码
 * @param {string} [params.captchaId] 验证码ID
 * @param {string} [params.captchaAnswer] 验证码答案
 */
const login = async (params) => {
    try {
        const { username, password, captchaId, captchaAnswer } = params;
        // 🔒 安全增强：加密密码
        const encryptedPassword = await PasswordEncryption.encrypt(password);

        const res = await post('/api/auth/login', {
            username,
            password: encryptedPassword,
            captchaId,
            captchaAnswer,
            autoLogin: true,
            type: 'account'
        }, { skipAuth: true, skipErrorToast: true });

        if (res.success && res.data) {
            const { token, refreshToken, expiresAt } = res.data;
            tokenUtils.setTokens(token, refreshToken, expiresAt ? new Date(expiresAt).getTime() : null);
            wx.setStorageSync('userInfo', res.data);
            return res.data;
        }
        throw res; // 抛出原始响应以便页面处理错误码
    } catch (err) {
        console.error('Login error:', err);
        throw err;
    }
};

const logout = () => {
    tokenUtils.clearAllTokens();
    wx.removeStorageSync('userInfo');
    wx.reLaunch({
        url: '/pages/login/login',
    });
};

const isAuthenticated = () => {
    return tokenUtils.hasToken();
};

const checkSession = async () => {
    try {
        const res = await request({
            url: '/api/auth/current-user',
            method: 'GET',
            skipErrorToast: true
        });
        if (res.success && res.data) {
            wx.setStorageSync('userInfo', res.data);
            return res.data;
        }
        throw new Error('Session invalid');
    } catch (err) {
        tokenUtils.clearAllTokens();
        throw err;
    }
};

const withAuth = (pageConfig) => {
    const originalOnShow = pageConfig.onShow;
    pageConfig.onShow = function (options) {
        if (!isAuthenticated()) {
            wx.reLaunch({
                url: '/pages/login/login',
            });
            return;
        }
        if (originalOnShow) {
            originalOnShow.call(this, options);
        }
    };
    return pageConfig;
};

module.exports = {
    login,
    logout,
    isAuthenticated,
    checkSession,
    withAuth
};
