const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, getTranslations, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        tasks: [],
        statistics: null,
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        currentStatus: '',
        projectId: null,
        statusTabs: [],
        statusMap: {},
        priorityMap: {},
        t: {}
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        const translations = getTranslations();
        const statusTabs = [
            { label: t('common.all'), value: '' },
            { label: t('task.status.todo'), value: 0 },
            { label: t('task.status.in_progress'), value: 2 },
            { label: t('task.status.completed'), value: 3 },
            { label: t('task.status.paused'), value: 4 }
        ];
        const statusMap = {
            0: t('task.status.todo'),
            1: t('task.status.assigned'),
            2: t('task.status.in_progress'),
            3: t('task.status.completed'),
            4: t('task.status.paused'),
            5: t('task.status.failed'),
            6: t('task.status.cancelled')
        };
        const priorityMap = {
            0: t('task.priority.low'),
            1: t('task.priority.medium'),
            2: t('task.priority.high'),
            3: t('task.priority.urgent')
        };
        this.setData({
            t: {
                ...translations,
                'title': t('task.list.title'),
                'empty': t('common.empty'),
                'create': t('common.create')
            },
            statusTabs,
            statusMap,
            priorityMap
        });
        wx.setNavigationBarTitle({ title: t('task.list.title') });
    },

    onLoad(options) {
        this.updateTranslations();
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
})));
