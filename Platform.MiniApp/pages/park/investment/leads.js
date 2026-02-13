const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');

Page(withAuth({
    data: {
        leads: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        searchKeyword: '',
        statusOptions: [
            { label: '全部', value: '' },
            { label: '新线索', value: 'New' },
            { label: '跟进中', value: 'Following' },
            { label: '由于', value: 'Qualified' },
            { label: '已丢弃', value: 'Lost' }
        ],
        currentStatus: ''
    },

    onLoad() {
        this.fetchLeads(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchLeads(true).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchLeads();
            });
        }
    },

    async fetchLeads(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/park/investment/leads/list',
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
                const newLeads = res.data.leads || [];
                this.setData({
                    leads: reset ? newLeads : [...this.data.leads, ...newLeads],
                    hasMore: newLeads.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch leads failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
    },

    handleSearch() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchLeads(true);
        });
    },

    switchStatus(e) {
        const status = e.currentTarget.dataset.status;
        if (this.data.currentStatus === status) return;

        this.setData({
            currentStatus: status,
            page: 1,
            hasMore: true
        }, () => {
            this.fetchLeads(true);
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/investment/lead-detail?id=${id}`
        });
    }
}));
