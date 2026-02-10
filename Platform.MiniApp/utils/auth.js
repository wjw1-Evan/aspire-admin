const { post } = require('./request');

const login = async (username, password) => {
    try {
        const res = await post('/api/auth/login', {
            username,
            password,
            autoLogin: true
        });

        if (res.success && res.data.token) {
            wx.setStorageSync('token', res.data.token);
            wx.setStorageSync('userInfo', res.data);
            return res.data;
        }
        throw new Error(res.message || '登录失败');
    } catch (err) {
        throw err;
    }
};

const logout = () => {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.reLaunch({
        url: '/pages/login/login',
    });
};

const isAuthenticated = () => {
    return !!wx.getStorageSync('token');
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
    withAuth
};
