App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查登录状态
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({
        url: '/pages/login/login',
      })
    }
  },
  globalData: {
    userInfo: null,
    baseUrl: 'http://localhost:15000/apiservice' // 指向 Aspire 网关及 apiservice 路由
  }
})
