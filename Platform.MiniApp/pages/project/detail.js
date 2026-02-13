const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        project: null,
        members: [],
        statusMap: {},
        priorityMap: {},
        i18nTitleKey: 'project.detail.title'
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        this.setData({
            statusMap: {
                0: t('project.status.planning'),
                1: t('project.status.in_progress'),
                2: t('project.status.paused'),
                3: t('project.status.completed'),
                4: t('project.status.cancelled')
            },
            priorityMap: {
                0: t('project.priority.low'),
                1: t('project.priority.medium'),
                2: t('project.priority.high')
            }
        });
    },

    onLoad(options) {
        this.updateTranslations();
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchProjectDetail();
            this.fetchProjectMembers();
        }
    },

    async fetchProjectDetail() {
        try {
            const res = await request({
                url: `/api/project/${this.data.id}`,
                method: 'GET'
            });
            if (res.success) {
                const project = res.data;
                project.startDate = project.startDate ? project.startDate.split('T')[0] : '-';
                project.endDate = project.endDate ? project.endDate.split('T')[0] : '-';
                this.setData({ project });
                wx.setNavigationBarTitle({ title: project.name });
            }
        } catch (err) {
            console.error('Fetch project detail failed', err);
        }
    },

    async fetchProjectMembers() {
        try {
            const res = await request({
                url: `/api/project/${this.data.id}/members`,
                method: 'GET'
            });
            if (res.success) {
                this.setData({ members: res.data });
            }
        } catch (err) {
            console.error('Fetch project members failed', err);
        }
    },

    viewProjectTasks() {
        wx.navigateTo({
            url: `/pages/task/list?projectId=${this.data.id}`
        });
    },

    goToCreateTask() {
        wx.navigateTo({
            url: `/pages/task/create?projectId=${this.data.id}`
        });
    },
    goToEdit() {
        wx.navigateTo({
            url: `/pages/project/create?id=${this.data.id}`
        });
    },

    async handleDelete() {
        wx.showModal({
            title: t('project.detail.confirm_delete'),
            content: t('project.detail.delete_hint'),
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/project/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: t('project.detail.deleted') });
                            setTimeout(() => {
                                const pages = getCurrentPages();
                                const prevPage = pages[pages.length - 2];
                                if (prevPage && prevPage.fetchProjects) {
                                    prevPage.setData({ page: 1, projects: [] }, () => {
                                        prevPage.fetchProjects(true);
                                    });
                                }
                                wx.navigateBack();
                            }, 1500);
                        }
                    } catch (err) {
                        console.error('Delete project failed', err);
                        wx.showToast({ title: t('project.detail.delete_failed'), icon: 'none' });
                    }
                }
            }
        });
    }
})));
