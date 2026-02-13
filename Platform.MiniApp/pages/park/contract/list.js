const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        contracts: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        searchKeyword: '',
        currentStatus: '',
        i18nTitleKey: 'park.contract.title'
    },

    onLoad() {
        this.fetchContracts(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchContracts(true).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchContracts();
            });
        }
    },

    async fetchContracts(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/park/contracts/list',
                method: 'POST',
                data: {
                    search: this.data.searchKeyword,
                    status: this.data.currentStatus || null,
                    page: this.data.page,
                    pageSize: this.data.pageSize,
                    sortOrder: 'desc'
                }
            });

            if (res.success) {
                const newContracts = res.data.contracts || [];
                this.setData({
                    contracts: reset ? newContracts : [...this.data.contracts, ...newContracts],
                    hasMore: newContracts.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch contracts failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
    },

    handleSearch() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchContracts(true);
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/contract/detail?id=${id}`
        });
    },

    goToAdd() {
        wx.navigateTo({
            url: '/pages/park/contract/form'
        });
    }
})));
