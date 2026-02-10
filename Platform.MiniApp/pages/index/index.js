Page({
    data: {
        userInfo: null,
        currentDate: ''
    },

    onShow() {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
            this.setData({ userInfo });
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
});
