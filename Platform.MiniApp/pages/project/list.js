const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        projects: [],
        statistics: null,
        searchKeyword: '',
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        statusMap: {
            0: '规划中',
            1: '进行中',
            2: '暂停',
            3: '已完成',
            4: '已取消'
        }
    },

    onLoad() {
        this.fetchStatistics();
        this.fetchProjects(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            Promise.all([
                this.fetchStatistics(),
                this.fetchProjects(true)
            ]).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore) {
            this.setData({ page: this.data.page + 1 }, () => {
                this.fetchProjects();
            });
        }
    },

    async fetchStatistics() {
        try {
            const res = await request({
                url: '/api/project/statistics',
                method: 'GET'
            });
            if (res.success) {
                this.setData({ statistics: res.data });
            }
        } catch (err) {
            console.error('Fetch project statistics failed', err);
        }
    },

    async fetchProjects(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/project/list',
                method: 'POST',
                data: {
                    search: this.data.searchKeyword,
                    page: this.data.page,
                    pageSize: this.data.pageSize,
                    sortBy: 'CreatedAt',
                    sortOrder: 'desc'
                }
            });

            if (res.success) {
                const newProjects = res.data.projects.map(p => ({
                    ...p,
                    endDate: p.endDate ? p.endDate.split('T')[0] : '-'
                }));

                this.setData({
                    projects: reset ? newProjects : [...this.data.projects, ...newProjects],
                    hasMore: res.data.projects.length === this.data.pageSize
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
            this.fetchProjects(true);
        });
    },

    goToCreate() {
        wx.navigateTo({
            url: '/pages/project/create'
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/project/detail?id=${id}`
        });
    }
}));
