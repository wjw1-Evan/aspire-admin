const tokenUtils = require('./utils/token.js');
const { checkSession } = require('./utils/auth.js');

App({
  async onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查登录状态：如果未登录，直接跳转
    if (!tokenUtils.hasToken()) {
      this.reToLogin();
      return;
    }

    // 🔒 安全增强：去服务器验证 Token 是否真正有效
    try {
      await checkSession();
    } catch (err) {
      console.error('Session verification failed on launch', err);
      this.reToLogin();
    }
  },

  reToLogin() {
    wx.reLaunch({
      url: '/pages/login/login',
    });
  },
  globalData: {
    userInfo: null,
    baseUrl: 'http://localhost:15000/apiservice' // 转向 YARP Gateway
  }
});
