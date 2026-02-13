const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, getLocale, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        leads: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        searchKeyword: '',
        statusOptions: [],
        currentStatus: '',
        t: {}
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        const locale = getLocale();
        const statusOptions = [
            { label: t('park.leads.status.all'), value: '' },
            { label: t('park.leads.status.new'), value: 'New' },
            { label: t('park.leads.status.following'), value: 'Following' },
            { label: t('park.leads.status.qualified'), value: 'Qualified' },
            { label: t('park.leads.status.lost'), value: 'Lost' }
        ];
        this.setData({
            t: {
                'title': t('park.leads.title'),
                'search': t('common.search'),
                'empty': t('common.empty')
            },
            statusOptions
        });
        wx.setNavigationBarTitle({ title: t('park.leads.title') });
    },

    onLoad() {
        this.updateTranslations();
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
})));
