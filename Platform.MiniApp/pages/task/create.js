const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        typeOptions: ['开发', '设计', '测试', '文档', '其他'],
        typeIndex: 0,
        priorityOptions: [
            { label: '低', value: 0 },
            { label: '中', value: 1 },
            { label: '高', value: 2 },
            { label: '紧急', value: 3 }
        ],
        priorityIndex: 1,
        userList: [{ name: '请选择', id: '' }],
        userIndex: 0,
        projectList: [{ name: '请选择', id: '' }],
        projectIndex: 0,
        startDate: '',
        endDate: '',
        submitting: false
    },

    onLoad(options) {
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
                this.setData({
                    userList: [{ name: '请选择', id: '' }, ...res.data]
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
                const list = [{ name: '请选择', id: '' }, ...res.data.projects];
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
            wx.showToast({ title: '任务名称必填', icon: 'none' });
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
                wx.showToast({ title: '发布成功' });
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
            wx.showToast({ title: '发布失败', icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
}));
