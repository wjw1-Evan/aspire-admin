const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        userInfo: null,
        currentDate: ''
    },

    onShow() {
        this.fetchUserInfo();
        this.fetchDashboardStats();
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

    async fetchDashboardStats() {
        try {
            // Fetch task statistics
            const taskRes = await request({ url: '/api/task/statistics' });
            // Fetch project statistics
            const projRes = await request({ url: '/api/project/list', method: 'POST', data: { page: 1, pageSize: 1 } });

            this.setData({
                todoTasks: taskRes.success ? taskRes.data.totalTasks : 0,
                activeProjects: projRes.success ? projRes.data.total : 0
            });
        } catch (err) {
            console.warn('Fetch dashboard stats failed', err);
        }
    },

    navigateToProject() {
        wx.navigateTo({ url: '/pages/project/list' });
    },

    navigateToTask() {
        wx.navigateTo({ url: '/pages/task/list' });
    },

    navigateToStatistics() {
        wx.navigateTo({ url: '/pages/statistics/index' });
    },

    navigateToProfile() {
        wx.switchTab({ url: '/pages/profile/profile' });
    },

    switchTabToApps() {
        wx.switchTab({ url: '/pages/apps/apps' });
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
