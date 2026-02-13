const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        tenant: null,
        contracts: [],
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
                url: `/api/park/tenants/${this.data.id}`,
                method: 'GET'
            });

            if (res.success) {
                this.setData({ tenant: res.data });
                wx.setNavigationBarTitle({ title: res.data.name || '租户详情' });
                this.fetchContracts();
            }
        } catch (err) {
            console.error('Fetch tenant detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    goToEdit() {
        wx.navigateTo({
            url: `/pages/park/tenant/form?id=${this.data.id}`
        });
    },

    handleDelete() {
        wx.showModal({
            title: '确认删除',
            content: '确定要删除该租户吗？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/park/tenants/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: '删除成功', icon: 'success' });
                            setTimeout(() => wx.navigateBack(), 1500);
                        }
                    } catch (err) {
                        console.error('Delete tenant failed', err);
                    }
                }
            }
        });
    },

    async fetchContracts() {
        try {
            const contractsRes = await request({
                url: '/api/park/contracts/list',
                method: 'POST',
                data: {
                    tenantId: this.data.id,
                    page: 1,
                    pageSize: 50
                }
            });

            if (contractsRes.success) {
                this.setData({ contracts: contractsRes.data.contracts || [] });
            }
        } catch (err) {
            console.error('Fetch tenant detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    goToContractDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/contract/detail?id=${id}`
        });
    },

    makePhoneCall() {
        if (this.data.tenant && this.data.tenant.phone) {
            wx.makePhoneCall({
                phoneNumber: this.data.tenant.phone
            });
        }
    }
})));
