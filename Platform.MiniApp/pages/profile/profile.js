const { request } = require('../../utils/request');
const { logout, withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        userInfo: null
    },

    onShow() {
        this.fetchUserInfo();
    },

    async fetchUserInfo() {
        try {
            const res = await request({
                url: '/api/user/me',
                method: 'GET'
            });
            if (res.success) {
                this.setData({ userInfo: res.data });
                wx.setStorageSync('userInfo', res.data);
            }
        } catch (err) {
            console.error('Fetch user info failed', err);
        }
    },

    handleLogout() {
        wx.showModal({
            title: '提示',
            content: '确定要退出登录吗？',
            confirmColor: '#1890ff',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await request({
                            url: '/api/auth/logout',
                            method: 'POST'
                        });
                    } catch (e) {
                        // 即使接口失败也清理本地并退出
                    }
                    logout();
                }
            }
        });
    },

    navigateToEdit() {
        wx.navigateTo({ url: '/pages/profile/edit' });
    },

    navigateToPassword() {
        wx.navigateTo({ url: '/pages/profile/password' });
    },

    aboutUs() {
        wx.showModal({
            title: '关于系统',
            content: 'Aspire Admin v1.0.0\n企业级微服务管理平台移动端',
            showCancel: false,
            confirmColor: '#1890ff'
        });
    }
}));
