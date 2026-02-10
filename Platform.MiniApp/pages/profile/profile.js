const { logout } = require('../../utils/auth');

Page({
    data: {
        userInfo: null
    },

    onShow() {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
            this.setData({ userInfo });
        }
    },

    handleLogout() {
        wx.showModal({
            title: '提示',
            content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    logout();
                }
            }
        });
    },

    navigateToSelf() {
        wx.showToast({ title: '功能开发?中', icon: 'none' });
    },

    changePassword() {
        wx.showToast({ title: '功能开发中', icon: 'none' });
    },

    aboutUs() {
        wx.showToast({ title: 'Aspire Admin v1.0.0', icon: 'none' });
    }
});
