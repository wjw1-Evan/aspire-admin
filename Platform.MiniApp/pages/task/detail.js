const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        id: '',
        task: null,
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
    }
}));
