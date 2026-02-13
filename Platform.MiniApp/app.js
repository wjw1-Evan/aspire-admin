const tokenUtils = require('./utils/token.js');
const { checkSession } = require('./utils/auth.js');
const { t: i18nT } = require('./utils/i18n.js');

App({
  async onLaunch() {
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    if (!tokenUtils.hasToken()) {
      this.reToLogin();
      return;
    }

    try {
      await checkSession();
    } catch (err) {
      console.error('Session verification failed on launch', err);
      this.reToLogin();
    }

    this.updateTabBarI18n();
  },

  updateTabBarI18n() {
    wx.setTabBarItem({
      index: 0,
      text: i18nT('tab.home')
    });
    wx.setTabBarItem({
      index: 1,
      text: i18nT('tab.apps')
    });
    wx.setTabBarItem({
      index: 2,
      text: i18nT('tab.profile')
    });
  },

  reToLogin() {
    wx.reLaunch({
      url: '/pages/login/login',
    });
  },
  globalData: {
    userInfo: null,
    baseUrl: 'http://localhost:15000/apiservice'
  }
});
