const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        building: null,
        units: [],
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
                url: `/api/park/buildings/${this.data.id}`,
                method: 'GET'
            });

            if (res.success) {
                this.setData({ building: res.data });
                wx.setNavigationBarTitle({ title: res.data.name || t('park.asset.building_detail') });
                this.fetchUnits();
            }
        } catch (err) {
            console.error('Fetch building detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    async fetchUnits() {
        try {
            const unitsRes = await request({
                url: '/api/park/properties/list',
                method: 'POST',
                data: {
                    buildingId: this.data.id,
                    page: 1,
                    pageSize: 100
                }
            });

            if (unitsRes.success) {
                // The API returns 'units' instead of 'propertyUnits'
                this.setData({ units: unitsRes.data.units || [] });
            }
        } catch (err) {
            console.error('Fetch units failed', err);
        }
    },

    goToEdit() {
        wx.navigateTo({
            url: `/pages/park/asset/building-form?id=${this.data.id}`
        });
    },

    handleDelete() {
        wx.showModal({
            title: '确认删除',
            content: '确定要删除该楼宇吗？（关联的单元也将受影响）',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/park/buildings/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: '删除成功', icon: 'success' });
                            setTimeout(() => wx.navigateBack(), 1500);
                        }
                    } catch (err) {
                        console.error('Delete building failed', err);
                    }
                }
            }
        });
    },

    goToAddUnit() {
        wx.navigateTo({
            url: `/pages/park/asset/unit-form?buildingId=${this.data.id}`
        });
    },

    goToUnitDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/asset/unit-detail?id=${id}`
        });
    }
})));
