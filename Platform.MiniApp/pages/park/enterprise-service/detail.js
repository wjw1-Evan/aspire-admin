const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        serviceRequest: null,
        loading: false,
        i18nTitleKey: 'common.detail'
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchDetail();
        }
    },

    async fetchDetail() {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/park/services/requests/${this.data.id}`,
                method: 'GET'
            });

            if (res.success) {
                this.setData({ serviceRequest: res.data });
                wx.setNavigationBarTitle({ title: res.data.categoryName || t('common.detail') });
            }
        } catch (err) {
            console.error('Fetch service request detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    }
})));
