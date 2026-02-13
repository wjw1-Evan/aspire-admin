const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        tasks: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        searchKeyword: '',
        i18nTitleKey: 'park.visit.title'
    },

    onLoad() {
        this.fetchTasks(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchTasks(true).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchTasks();
            });
        }
    },

    async fetchTasks(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/park-management/visit/tasks',
                method: 'GET',
                data: {
                    search: this.data.searchKeyword,
                    page: this.data.page,
                    pageSize: this.data.pageSize
                }
            });

            if (res.success) {
                const newTasks = res.data.tasks || [];
                this.setData({
                    tasks: reset ? newTasks : [...this.data.tasks, ...newTasks],
                    hasMore: newTasks.length === this.data.pageSize
                });
            }
        } catch (err) {
            console.error('Fetch visit tasks failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onSearchInput(e) {
        this.setData({ searchKeyword: e.detail.value });
    },

    handleSearch() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchTasks(true);
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/visit/detail?id=${id}`
        });
    },

    goToAdd() {
        wx.navigateTo({
            url: '/pages/park/visit/form'
        });
    }
})));
