const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        stats: {
            asset: null,
            investment: null,
            tenant: null,
            service: null,
            visit: null
        },
        aiReport: '',
        loading: false,
        generatingAi: false,
        i18nTitleKey: 'apps.park_stats'
    },

    onLoad() {
        this.fetchAllStats();
    },

    onPullDownRefresh() {
        this.fetchAllStats().then(() => {
            wx.stopPullDownRefresh();
        });
    },

    async fetchAllStats() {
        if (this.data.loading) return;
        this.setData({ loading: true });

        try {
            const [asset, investment, tenant, service, visit] = await Promise.all([
                request({ url: '/api/park/asset/statistics', method: 'GET' }),
                request({ url: '/api/park/investment/statistics', method: 'GET' }),
                request({ url: '/api/park/tenant/statistics', method: 'GET' }),
                request({ url: '/api/park/services/statistics', method: 'GET' }),
                request({ url: '/api/park-management/visit/statistics', method: 'GET' })
            ]);

            this.setData({
                stats: {
                    asset: asset.success ? asset.data : null,
                    investment: investment.success ? investment.data : null,
                    tenant: tenant.success ? tenant.data : null,
                    service: service.success ? service.data : null,
                    visit: visit.success ? visit.data : null
                }
            });
        } catch (err) {
            console.error('Fetch statistics failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    async generateAiReport() {
        if (this.data.generatingAi) return;
        this.setData({ generatingAi: true });

        try {
            const res = await request({
                url: '/api/park/statistics/ai-report',
                method: 'POST',
                data: this.data.stats
            });

            if (res.success) {
                this.setData({ aiReport: res.data });
            }
        } catch (err) {
            console.error('Generate AI report failed', err);
        } finally {
            this.setData({ generatingAi: false });
        }
    }
})));
