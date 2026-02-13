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
                wx.setNavigationBarTitle({ title: `${res.data.unitNumber} 详情` });
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
            title: '确认删除',
            content: '确定要删除该单元吗？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/park/properties/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: '删除成功', icon: 'success' });
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
