const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { withI18n, t } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        tabs: [
            { key: 'all', title: '全部' },
            { key: 'System', title: '系统' },
            { key: 'Task', title: '任务' }
        ],
        activeTab: 'all',
        notifications: [],
        page: 1,
        pageSize: 20,
        hasMore: true,
        loading: false,
        isRefreshing: false
    },

    onLoad() {
        this.fetchNotifications(true);
    },

    onPullDownRefresh() {
        this.fetchNotifications(true);
    },

    onReachBottom() {
        if (this.data.hasMore && !this.data.loading) {
            this.fetchNotifications();
        }
    },

    handleTabChange(e) {
        const key = e.currentTarget.dataset.key;
        if (key !== this.data.activeTab) {
            this.setData({
                activeTab: key,
                notifications: [],
                page: 1,
                hasMore: true
            }, () => {
                this.fetchNotifications(true);
            });
        }
    },

    async fetchNotifications(isRefresh = false) {
        if (this.data.loading) return;

        const page = isRefresh ? 1 : this.data.page;

        this.setData({ loading: true });

        try {
            const res = await request({
                url: '/api/unified-notification/center',
                method: 'GET',
                data: {
                    page: page,
                    pageSize: this.data.pageSize,
                    filterType: this.data.activeTab,
                    sortBy: 'datetime'
                }
            });

            if (res.success && res.data.items) {
                const newItems = res.data.items.map(item => ({
                    ...item,
                    displayTime: this.formatTime(item.datetime),
                    tagClass: this.getTagClass(item.type),
                    tagLabel: this.getTagLabel(item.type)
                }));

                const notifications = isRefresh ? newItems : [...this.data.notifications, ...newItems];

                this.setData({
                    notifications,
                    page: page + 1,
                    hasMore: notifications.length < res.data.total,
                    loading: false,
                    isRefreshing: false
                });
            } else {
                this.setData({ loading: false, isRefreshing: false });
            }
        } catch (err) {
            console.error('Fetch notifications failed', err);
            this.setData({ loading: false, isRefreshing: false });
        } finally {
            if (isRefresh) {
                wx.stopPullDownRefresh();
            }
        }
    },

    formatTime(datetime) {
        const date = new Date(datetime);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000 / 60);

        if (diff < 1) return '刚刚';
        if (diff < 60) return `${diff}分钟前`;
        if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
        if (diff < 7200) return `${Math.floor(diff / 1440)}天前`;

        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
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
                // 更新该项为已读，避免重新请求整个列表
                const notifications = this.data.notifications.map(n => {
                    if (n.id === item.id) return { ...n, read: true };
                    return n;
                });
                this.setData({ notifications });
            } catch (err) {
                console.error('Mark as read failed', err);
            }
        }

        if (item.taskId) {
            wx.navigateTo({ url: `/pages/task/detail?id=${item.taskId}` });
        }
    },

    async markAllAsRead() {
        wx.showLoading({ title: '处理中...' });
        try {
            // 目前后端可能没有全量标记已读接口，如有则调用
            // 这里循环标记演示，实际建议后端提供 batch 接口
            const unreadItems = this.data.notifications.filter(n => !n.read);
            for (const item of unreadItems) {
                await request({
                    url: `/api/unified-notification/${item.id}/mark-as-read`,
                    method: 'POST'
                });
            }
            wx.hideLoading();
            this.fetchNotifications(true);
        } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
        }
    }
})));
