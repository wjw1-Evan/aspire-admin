const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        tasks: [],
        statistics: null,
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        currentStatus: '', // '' means all
        projectId: null,
        statusTabs: [
            { label: '全部', value: '' },
            { label: '待处理', value: 0 },
            { label: '执行中', value: 2 },
            { label: '已完成', value: 3 },
            { label: '已暂停', value: 4 }
        ],
        statusMap: {
            0: '待处理',
            1: '已分配',
            2: '执行中',
            3: '已完成',
            4: '已暂停',
            5: '已失败',
            6: '已取消'
        },
        priorityMap: {
            0: '低',
            1: '中',
            2: '高',
            3: '紧急'
        }
    },

    onLoad(options) {
        if (options.projectId) {
            this.setData({ projectId: options.projectId });
        }
        this.fetchStatistics();
        this.fetchTasks(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            Promise.all([
                this.fetchStatistics(),
                this.fetchTasks(true)
            ]).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchTasks();
            });
        }
    },

    async fetchStatistics() {
        try {
            const res = await request({
                url: '/api/task/statistics',
                method: 'GET'
            });
            if (res.success) {
                this.setData({ statistics: res.data });
            }
        } catch (err) {
            console.error('Fetch task statistics failed', err);
        }
    },

    async fetchTasks(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/task/query',
                method: 'POST',
                data: {
                    status: this.data.currentStatus === '' ? null : this.data.currentStatus,
                    projectId: this.data.projectId,
                    page: this.data.page,
                    pageSize: this.data.pageSize,
                    sortBy: 'CreatedAt',
                    sortOrder: 'desc'
                }
            });

            if (res.success) {
                const newTasks = res.data.tasks.map(t => ({
                    ...t,
                    plannedEndTime: t.plannedEndTime ? t.plannedEndTime.split('T')[0] : '-'
                }));

                this.setData({
                    tasks: reset ? newTasks : [...this.data.tasks, ...newTasks],
                    hasMore: res.data.tasks.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch tasks failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    switchTab(e) {
        const status = e.currentTarget.dataset.status;
        if (this.data.currentStatus === status) return;

        this.setData({
            currentStatus: status,
            page: 1,
            hasMore: true
        }, () => {
            this.fetchTasks(true);
        });
    },

    goToCreate() {
        wx.navigateTo({
            url: `/pages/task/create${this.data.projectId ? '?projectId=' + this.data.projectId : ''}`
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/task/detail?id=${id}`
        });
    }
}));
