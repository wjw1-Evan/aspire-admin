const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, getLocale, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        activeTab: 'lead',
        leads: [],
        projects: [],
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
        this.fetchData(true);
    },

    updateTranslations() {
        const locale = getLocale();
        const statusOptions = this.data.activeTab === 'lead' ? [
            { label: t('park.leads.status.all'), value: '' },
            { label: t('park.leads.status.new'), value: 'New' },
            { label: t('park.leads.status.following'), value: 'Following' },
            { label: t('park.leads.status.qualified'), value: 'Qualified' },
            { label: t('park.leads.status.lost'), value: 'Lost' }
        ] : [
            { label: '全部', value: '' },
            { label: '邀约中', value: 'Negotiating' },
            { label: '签约成功', value: 'Signing' },
            { label: '已落地', value: 'Completed' }
        ];
        this.setData({
            t: {
                'title': this.data.activeTab === 'lead' ? t('park.leads.title') : '招商项目',
                'search': t('common.search'),
                'empty': t('common.empty')
            },
            statusOptions
        });
        wx.setNavigationBarTitle({ title: this.data.activeTab === 'lead' ? t('park.leads.title') : '招商项目' });
    },

    onLoad() {
        this.fetchData(true);
    },

    async fetchData(reset = false) {
        this.updateTranslations();
        if (this.data.activeTab === 'lead') {
            await this.fetchLeads(reset);
        } else {
            await this.fetchProjects(reset);
        }
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchData(true).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchData();
            });
        }
    },

    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        if (this.data.activeTab === tab) return;

        this.setData({
            activeTab: tab,
            page: 1,
            hasMore: true,
            currentStatus: '',
            searchKeyword: ''
        }, () => {
            this.fetchData(true);
        });
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
                    pageSize: this.data.pageSize
                }
            });
            if (res.success) {
                const list = res.data.leads || [];
                this.setData({
                    leads: reset ? list : [...this.data.leads, ...list],
                    hasMore: list.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch leads failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    async fetchProjects(reset = false) {
        if (this.data.loading) return;
        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/park/investment/projects/list',
                method: 'POST',
                data: {
                    search: this.data.searchKeyword,
                    status: this.data.currentStatus || null,
                    page: this.data.page,
                    pageSize: this.data.pageSize
                }
            });
            if (res.success) {
                const list = res.data.projects || [];
                this.setData({
                    projects: reset ? list : [...this.data.projects, ...list],
                    hasMore: list.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch projects failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
    },

    handleSearch() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchData(true);
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
            this.fetchData(true);
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/investment/lead-detail?id=${id}`
        });
    },

    goToProjectDetail(e) {
        const id = e.currentTarget.dataset.id;
        // Navigation to project-detail (if implemented)
        wx.showToast({ title: '开发中', icon: 'none' });
    },

    goToAdd() {
        const path = this.data.activeTab === 'lead' ? 'lead-form' : 'project-form';
        wx.navigateTo({
            url: `/pages/park/investment/${path}`
        });
    }
})));
