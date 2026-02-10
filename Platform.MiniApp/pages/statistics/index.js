const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        periods: [
            { label: '周', value: 0 },
            { label: '月', value: 1 },
            { label: '季', value: 2 },
            { label: '年', value: 3 }
        ],
        currentPeriod: 1, // Default Month
        loading: false,
        statistics: null,
        projectCompletion: 0,
        aiLoading: false
    },

    onLoad() {
        this.fetchStatistics();
    },

    switchPeriod(e) {
        const value = e.currentTarget.dataset.value;
        if (value === this.data.currentPeriod) return;
        this.setData({ currentPeriod: value }, () => {
            this.fetchStatistics();
        });
    },

    async fetchStatistics() {
        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/project/statistics/dashboard?period=${this.data.currentPeriod}`,
                method: 'GET'
            });

            if (res.success) {
                const project = res.data.project;
                const completion = project.totalProjects > 0
                    ? Math.round((project.completedProjects / project.totalProjects) * 100)
                    : 0;

                this.setData({
                    statistics: res.data,
                    projectCompletion: completion
                });
            }
        } catch (err) {
            console.error('Fetch statistics failed', err);
            wx.showToast({ title: '加载失败', icon: 'none' });
        } finally {
            this.setData({ loading: false });
        }
    },

    async generateAiReport() {
        this.setData({ aiLoading: true });
        try {
            const res = await request({
                url: `/api/project/statistics/ai-report?period=${this.data.currentPeriod}`,
                method: 'POST',
                data: this.data.statistics
            });

            if (res.success && res.data) {
                // Store report and navigate to report page
                wx.setStorageSync('last_ai_report', res.data);
                wx.navigateTo({
                    url: '/pages/statistics/report'
                });
            } else {
                wx.showToast({ title: '报告生成失败', icon: 'none' });
            }
        } catch (err) {
            console.error('Generate AI report failed', err);
            wx.showToast({ title: '生成异常', icon: 'none' });
        } finally {
            this.setData({ aiLoading: false });
        }
    }
}));
