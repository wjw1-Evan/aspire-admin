const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n, getLocale } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        userInfo: null,
        currentDate: '',
        notifications: [],
        todoTasks: 0,
        activeProjects: 0
    },

    onShow() {
        this.fetchUserInfo();
        this.fetchDashboardStats();
        this.fetchNotifications();
        this.updateDate();
    },

    async fetchUserInfo() {
        try {
            const res = await request({
                url: '/api/users/me',
                method: 'GET'
            });
            if (res.success) {
                this.setData({ userInfo: res.data });
                wx.setStorageSync('userInfo', res.data);

                // 动态设置导航栏标题
                if (res.data.currentCompanyDisplayName) {
                    wx.setNavigationBarTitle({
                        title: res.data.currentCompanyDisplayName
                    });
                }
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

    async fetchNotifications() {
        try {
            const res = await request({
                url: '/api/unified-notification/center',
                method: 'GET',
                data: { page: 1, pageSize: 5 }
            });

            if (res.success && res.data.items) {
                const items = res.data.items.map(item => {
                    // 简化的时间处理，实际项目中可使用 dayjs 等库
                    const date = new Date(item.datetime);
                    const now = new Date();
                    const diff = Math.floor((now - date) / 1000 / 60); // minutes

                    let timeStr = '';
                    if (diff < 1) timeStr = '刚刚';
                    else if (diff < 60) timeStr = `${diff}分钟前`;
                    else if (diff < 1440) timeStr = `${Math.floor(diff / 60)}小时前`;
                    else timeStr = `${Math.floor(diff / 1440)}天前`;

                    return {
                        ...item,
                        displayTime: timeStr,
                        tagClass: this.getTagClass(item.type),
                        tagLabel: this.getTagLabel(item.type)
                    };
                });

                this.setData({ notifications: items });
            }
        } catch (err) {
            console.error('Fetch notifications failed', err);
        }
    },

    getTagClass(type) {
        switch (type) {
            case 'System': return 'tag-blue';
            case 'Task': return 'tag-orange';
            default: return 'tag-purple';
        }
    },

    getTagLabel(type) {
        switch (type) {
            case 'System': return 'common.system';
            case 'Task': return 'common.task';
            default: return 'common.tips';
        }
    },

    async onNotificationTap(e) {
        const item = e.currentTarget.dataset.item;
        if (!item.read) {
            try {
                await request({
                    url: `/api/unified-notification/${item.id}/mark-as-read`,
                    method: 'POST'
                });
                this.fetchNotifications();
            } catch (err) {
                console.error('Mark as read failed', err);
            }
        }

        // 如果是任务通知，可以跳转到任务详情
        if (item.taskId) {
            wx.navigateTo({ url: `/pages/task/detail?id=${item.taskId}` });
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

    navigateToNotifications() {
        wx.navigateTo({ url: '/pages/notification/list' });
    },

    onLoad() {
        this.updateDate();
    },

    updateDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const locale = getLocale();

        let dateStr = '';
        if (locale === 'zh-CN') {
            const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
            dateStr = `${year}年${month}月${day}日 ${week}`;
        } else {
            const week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            dateStr = `${months[now.getMonth()]} ${day}, ${year} (${week})`;
        }

        this.setData({
            currentDate: dateStr
        });
    }
})));
