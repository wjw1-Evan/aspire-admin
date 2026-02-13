const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        tenants: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        searchKeyword: '',
        i18nTitleKey: 'park.tenant.title'
    },

    onLoad() {
        this.fetchTenants(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchTenants(true).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchTenants();
            });
        }
    },

    async fetchTenants(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/park/tenants/list',
                method: 'POST',
                data: {
                    search: this.data.searchKeyword,
                    page: this.data.page,
                    pageSize: this.data.pageSize,
                    sortOrder: 'desc'
                }
            });

            if (res.success) {
                const newTenants = res.data.tenants || [];
                this.setData({
                    tenants: reset ? newTenants : [...this.data.tenants, ...newTenants],
                    hasMore: newTenants.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch tenants failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
    },

    handleSearch() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchTenants(true);
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/tenant/detail?id=${id}`
        });
    },

    goToAdd() {
        wx.navigateTo({
            url: '/pages/park/tenant/form'
        });
    }
})));
