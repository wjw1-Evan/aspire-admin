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
        isEdit: false,
        taskId: '',
        formData: {
            taskName: '',
            description: ''
        },
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
        wx.setNavigationBarTitle({ title: this.data.isEdit ? '编辑任务' : t('task.create.title') });
    },

    onLoad(options) {
        if (options.id) {
            this.setData({
                isEdit: true,
                taskId: options.id
            });
            this.fetchTaskDetail(options.id);
        }
        this.updateTranslations();
        this.loadUsers();
        this.loadProjects(options.projectId);
    },

    async fetchTaskDetail(id) {
        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/task/${id}`,
                method: 'GET'
            });
            if (res.success) {
                const task = res.data;

                // Find indices for pickers
                const typeIndex = this.data.typeOptions.indexOf(task.taskType);
                const priorityIndex = this.data.priorityOptions.findIndex(p => p.value === task.priority);

                // We'll need to wait for userList and projectList to load if we want to set indices correctly
                // or set them after they load.

                this.setData({
                    'formData.taskName': task.taskName,
                    'formData.description': task.description || '',
                    typeIndex: typeIndex > -1 ? typeIndex : 0,
                    priorityIndex: priorityIndex > -1 ? priorityIndex : 1,
                    startDate: task.plannedStartTime ? task.plannedStartTime.split('T')[0] : '',
                    endDate: task.plannedEndTime ? task.plannedEndTime.split('T')[0] : ''
                });

                // Store IDs to match after loading lists
                this._pendingAssignedTo = task.assignedTo;
                this._pendingProjectId = task.projectId;

                this.matchPickerIndices();
            }
        } catch (err) {
            console.error('Fetch task detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    matchPickerIndices() {
        const { userList, projectList } = this.data;
        if (this._pendingAssignedTo && userList.length > 1) {
            const index = userList.findIndex(u => u.id === this._pendingAssignedTo);
            if (index > -1) this.setData({ userIndex: index });
            this._pendingAssignedTo = null;
        }
        if (this._pendingProjectId && projectList.length > 1) {
            const index = projectList.findIndex(p => p.id === this._pendingProjectId);
            if (index > -1) this.setData({ projectIndex: index });
            this._pendingProjectId = null;
        }
    },

    async loadUsers() {
        try {
            const res = await request({
                url: '/api/users/all',
                method: 'GET'
            });
            if (res.success) {
                const selectText = t('common.select');
                this.setData({
                    userList: [{ name: selectText, id: '' }, ...res.data]
                }, () => {
                    this.matchPickerIndices();
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
                }, () => {
                    this.matchPickerIndices();
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
            const url = this.data.isEdit ? '/api/task/update' : '/api/task/create';
            const method = this.data.isEdit ? 'PUT' : 'POST';
            const data = {
                taskName: values.taskName,
                description: values.description,
                taskType: this.data.typeOptions[this.data.typeIndex],
                priority: this.data.priorityOptions[this.data.priorityIndex].value,
                assignedTo: assignedTo || null,
                projectId: projectId || null,
                plannedStartTime: this.data.startDate ? (this.data.startDate.includes('T') ? this.data.startDate : this.data.startDate + 'T00:00:00Z') : null,
                plannedEndTime: this.data.endDate ? (this.data.endDate.includes('T') ? this.data.endDate : this.data.endDate + 'T23:59:59Z') : null
            };

            if (this.data.isEdit) {
                data.taskId = this.data.taskId;
            }

            const res = await request({
                url,
                method,
                data
            });

            if (res.success) {
                wx.showToast({ title: this.data.isEdit ? '修改成功' : t('task.create.success') });
                setTimeout(() => {
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage) {
                        if (prevPage.fetchTasks) {
                            prevPage.setData({ page: 1, tasks: [] }, () => {
                                prevPage.fetchTasks(true);
                            });
                        }
                        if (prevPage.fetchTaskDetail) {
                            prevPage.fetchTaskDetail();
                        }
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
