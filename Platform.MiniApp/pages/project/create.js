const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        statusOptions: [
            { label: '规划中', value: 0 },
            { label: '进行中', value: 1 },
            { label: '暂停', value: 2 },
            { label: '已完成', value: 3 },
            { label: '已取消', value: 4 }
        ],
        statusIndex: 0,
        priorityOptions: [
            { label: '低', value: 0 },
            { label: '中', value: 1 },
            { label: '高', value: 2 }
        ],
        priorityIndex: 1,
        startDate: '',
        endDate: '',
        submitting: false
    },

    onStatusChange(e) {
        this.setData({ statusIndex: e.detail.value });
    },

    onPriorityChange(e) {
        this.setData({ priorityIndex: e.detail.value });
    },

    onStartDateChange(e) {
        this.setData({ startDate: e.detail.value });
    },

    onEndDateChange(e) {
        this.setData({ endDate: e.detail.value });
    },

    async handleSubmit(e) {
        const values = e.detail.value;
        if (!values.name) {
            wx.showToast({ title: '项目名称必填', icon: 'none' });
            return;
        }

        this.setData({ submitting: true });
        try {
            const res = await request({
                url: '/api/project',
                method: 'POST',
                data: {
                    name: values.name,
                    description: values.description,
                    status: this.data.statusOptions[this.data.statusIndex].value,
                    priority: this.data.priorityOptions[this.data.priorityIndex].value,
                    startDate: this.data.startDate ? this.data.startDate + 'T00:00:00Z' : null,
                    endDate: this.data.endDate ? this.data.endDate + 'T23:59:59Z' : null,
                    budget: values.budget ? parseFloat(values.budget) : null
                }
            });

            if (res.success) {
                wx.showToast({ title: '创建成功' });
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
            console.error('Create project failed', err);
            wx.showToast({ title: '创建失败', icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
}));
