const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        userInfo: null,
        currentDate: ''
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

    onLoad() {
        this.updateDate();
    },

    updateDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
        this.setData({
            currentDate: `${year}年${month}月${day}日 ${week}`
        });
    }
}));
