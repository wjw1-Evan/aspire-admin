const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        id: '',
        project: null,
        members: [],
        statusMap: {
            0: '规划中',
            1: '进行中',
            2: '暂停',
            3: '已完成',
            4: '已取消'
        },
        priorityMap: {
            0: '低',
            1: '中',
            2: '高'
        }
    },

    onLoad(options) {
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
    }
}));
