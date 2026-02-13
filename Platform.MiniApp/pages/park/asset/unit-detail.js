const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        unit: null,
        loading: false,
        i18nTitleKey: 'common.detail'
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchDetail();
        }
    },

    onShow() {
        if (this.data.id) {
            this.fetchDetail();
        }
    },

    async fetchDetail() {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/park/properties/${this.data.id}`,
                method: 'GET'
            });

            if (res.success) {
                this.setData({ unit: res.data });
                wx.setNavigationBarTitle({ title: `${res.data.unitNumber} ${t('common.detail')}` });
            }
        } catch (err) {
            console.error('Fetch unit detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    goToEdit() {
        wx.navigateTo({
            url: `/pages/park/asset/unit-form?id=${this.data.id}`
        });
    },

    handleDelete() {
        wx.showModal({
            title: t('common.confirm_delete'),
            content: t('park.asset.delete_unit_hint'),
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/park/properties/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: t('common.delete_success'), icon: 'success' });
                            setTimeout(() => wx.navigateBack(), 1500);
                        }
                    } catch (err) {
                        console.error('Delete unit failed', err);
                    }
                }
            }
        });
    }
})));
