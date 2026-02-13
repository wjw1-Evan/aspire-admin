const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        task: null,
        statusMap: {},
        priorityMap: {},
        i18nTitleKey: 'task.detail.title'
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        this.setData({
            statusMap: {
                0: t('task.status.todo'),
                1: t('task.status.assigned'),
                2: t('task.status.in_progress'),
                3: t('task.status.completed'),
                4: t('task.status.paused'),
                5: t('task.status.failed'),
                6: t('task.status.cancelled')
            },
            priorityMap: {
                0: t('task.priority.low'),
                1: t('task.priority.medium'),
                2: t('task.priority.high'),
                3: t('task.priority.urgent')
            }
        });
    },

    onLoad(options) {
        this.updateTranslations();
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchTaskDetail();
        }
    },

    async fetchTaskDetail() {
        try {
            const res = await request({
                url: `/api/task/${this.data.id}`,
                method: 'GET'
            });
            if (res.success) {
                const task = res.data;
                // Format dates
                ['plannedEndTime', 'createdAt', 'actualStartTime', 'actualEndTime'].forEach(key => {
                    if (task[key]) {
                        task[key] = task[key].replace('T', ' ').split('.')[0];
                    }
                });
                this.setData({ task });
                wx.setNavigationBarTitle({ title: task.taskName });
            }
        } catch (err) {
            console.error('Fetch task detail failed', err);
        }
    },
    goToEdit() {
        wx.navigateTo({
            url: `/pages/task/create?id=${this.data.id}`
        });
    },

    async handleDelete() {
        wx.showModal({
            title: t('task.detail.confirm_delete'),
            content: t('task.detail.delete_hint'),
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/task/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: t('task.detail.deleted') });
                            setTimeout(() => {
                                const pages = getCurrentPages();
                                const prevPage = pages[pages.length - 2];
                                if (prevPage && prevPage.fetchTasks) {
                                    prevPage.setData({ page: 1, tasks: [] }, () => {
                                        prevPage.fetchTasks(true);
                                    });
                                }
                                wx.navigateBack();
                            }, 1500);
                        }
                    } catch (err) {
                        console.error('Delete task failed', err);
                        wx.showToast({ title: t('task.detail.delete_failed'), icon: 'none' });
                    }
                }
            }
        });
    }
})));
