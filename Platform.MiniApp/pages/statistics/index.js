const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        periods: [],
        currentPeriod: 1,
        loading: false,
        statistics: null,
        projectCompletion: 0,
        aiLoading: false,
        t: {}
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        const periods = [
            { label: t('stats.period.week'), value: 0 },
            { label: t('stats.period.month'), value: 1 },
            { label: t('stats.period.quarter'), value: 2 },
            { label: t('stats.period.year'), value: 3 }
        ];
        this.setData({
            t: {
                'title': t('stats.title'),
                'ai_report': t('stats.ai_report'),
                'completion_rate': t('stats.completion_rate'),
                'total_projects': t('stats.total_projects'),
                'completed_projects': t('stats.completed_projects')
            },
            periods
        });
        wx.setNavigationBarTitle({ title: t('stats.title') });
    },

    onLoad() {
        this.updateTranslations();
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
            wx.showToast({ title: t('stats.load_failed'), icon: 'none' });
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
                wx.showToast({ title: t('stats.ai_report_failed'), icon: 'none' });
            }
        } catch (err) {
            console.error('Generate AI report failed', err);
            wx.showToast({ title: t('stats.ai_report_exception'), icon: 'none' });
        } finally {
            this.setData({ aiLoading: false });
        }
    }
})));
