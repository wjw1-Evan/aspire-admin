const { t, withI18n } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        stats: {},
        monthlyTrends: [],
        managerRanking: [],
        aiLoading: false,
        i18nTitleKey: 'park.visit.statistics.title'
    },

    onLoad() {
        this.loadStatistics();
    },

    onPullDownRefresh() {
        this.loadStatistics().then(() => {
            wx.stopPullDownRefresh();
        });
    },

    async loadStatistics() {
        try {
            const res = await request.get('/api/park-management/visit/statistics');
            if (res.data) {
                const stats = res.data;

                // Format Trends
                let monthlyTrends = [];
                if (stats.monthlyTrends) {
                    const maxCount = Math.max(...Object.values(stats.monthlyTrends), 1);
                    monthlyTrends = Object.keys(stats.monthlyTrends).map(month => ({
                        month,
                        count: stats.monthlyTrends[month],
                        percent: (stats.monthlyTrends[month] / maxCount) * 100
                    })).sort((a, b) => a.month.localeCompare(b.month));
                }

                // Format Ranking
                let managerRanking = [];
                if (stats.managerRanking) {
                    managerRanking = Object.keys(stats.managerRanking).map(name => ({
                        name,
                        count: stats.managerRanking[name]
                    })).sort((a, b) => b.count - a.count);
                }

                this.setData({
                    stats,
                    monthlyTrends,
                    managerRanking
                });
            }
        } catch (e) {
            console.error('Failed to load visit statistics', e);
            wx.showToast({
                title: t('stats.load_failed'),
                icon: 'none'
            });
        }
    },

    async generateAiReport() {
        this.setData({ aiLoading: true });
        try {
            const res = await request.post('/api/park-management/visit/statistics/ai-report', this.data.stats);
            if (res.data) {
                // Navigate to report viewing page
                // Assuming we use the existing statistics/report page or similar
                wx.navigateTo({
                    url: `/pages/statistics/report?content=${encodeURIComponent(res.data)}&title=${encodeURIComponent(t('park.visit.statistics.title'))}`
                });
            }
        } catch (e) {
            console.error('Failed to generate AI report', e);
            wx.showToast({
                title: t('stats.ai_report_failed'),
                icon: 'none'
            });
        } finally {
            this.setData({ aiLoading: false });
        }
    }
}));
