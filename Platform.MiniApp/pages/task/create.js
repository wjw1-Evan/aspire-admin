const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        typeOptions: [],
        typeIndex: 0,
        priorityOptions: [],
        priorityIndex: 1,
        userList: [],
        userIndex: 0,
        projectList: [],
        projectIndex: 0,
        startDate: '',
        endDate: '',
        submitting: false,
        t: {}
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        const typeOptions = [
            t('task.type.dev'),
            t('task.type.design'),
            t('task.type.test'),
            t('task.type.doc'),
            t('task.type.other')
        ];
        const priorityOptions = [
            { label: t('task.priority.low'), value: 0 },
            { label: t('task.priority.medium'), value: 1 },
            { label: t('task.priority.high'), value: 2 },
            { label: t('task.priority.urgent'), value: 3 }
        ];
        this.setData({
            t: {
                'title': t('task.create.title'),
                'name': t('task.name'),
                'description': t('common.description'),
                'type': t('task.type'),
                'priority': t('common.priority'),
                'assigned_to': t('task.assigned_to'),
                'related_project': t('task.related_project'),
                'planned_start': t('task.planned_start'),
                'planned_end': t('task.planned_end'),
                'submit': t('common.submit')
            },
            typeOptions,
            priorityOptions
        });
        wx.setNavigationBarTitle({ title: t('task.create.title') });
    },

    onLoad(options) {
        this.updateTranslations();
        this.loadUsers();
        this.loadProjects(options.projectId);
    },

    async loadUsers() {
        try {
            const res = await request({
                url: '/api/user/all',
                method: 'GET'
            });
            if (res.success) {
                const selectText = t('common.select');
                this.setData({
                    userList: [{ name: selectText, id: '' }, ...res.data]
                });
            }
        } catch (err) {
            console.error('Load users failed', err);
        }
    },

    async loadProjects(selectedProjectId) {
        try {
            const res = await request({
                url: '/api/project/list',
                method: 'POST',
                data: { page: 1, pageSize: 100 }
            });
            if (res.success) {
                const selectText = t('common.select');
                const list = [{ name: selectText, id: '' }, ...res.data.projects];
                let index = 0;
                if (selectedProjectId) {
                    index = list.findIndex(p => p.id === selectedProjectId);
                    if (index === -1) index = 0;
                }
                this.setData({
                    projectList: list,
                    projectIndex: index
                });
            }
        } catch (err) {
            console.error('Load projects failed', err);
        }
    },

    onTypeChange(e) { this.setData({ typeIndex: e.detail.value }); },
    onPriorityChange(e) { this.setData({ priorityIndex: e.detail.value }); },
    onUserChange(e) { this.setData({ userIndex: e.detail.value }); },
    onProjectChange(e) { this.setData({ projectIndex: e.detail.value }); },
    onStartDateChange(e) { this.setData({ startDate: e.detail.value }); },
    onEndDateChange(e) { this.setData({ endDate: e.detail.value }); },

    async handleSubmit(e) {
        const values = e.detail.value;
        if (!values.taskName) {
            wx.showToast({ title: t('task.name_required'), icon: 'none' });
            return;
        }

        const assignedTo = this.data.userList[this.data.userIndex].id;
        const projectId = this.data.projectList[this.data.projectIndex].id;

        this.setData({ submitting: true });
        try {
            const res = await request({
                url: '/api/task/create',
                method: 'POST',
                data: {
                    taskName: values.taskName,
                    description: values.description,
                    taskType: this.data.typeOptions[this.data.typeIndex],
                    priority: this.data.priorityOptions[this.data.priorityIndex].value,
                    assignedTo: assignedTo || null,
                    projectId: projectId || null,
                    plannedStartTime: this.data.startDate ? this.data.startDate + 'T00:00:00Z' : null,
                    plannedEndTime: this.data.endDate ? this.data.endDate + 'T23:59:59Z' : null
                }
            });

            if (res.success) {
                wx.showToast({ title: t('task.create.success') });
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
            console.error('Create task failed', err);
            wx.showToast({ title: t('task.create.failed'), icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
})));
