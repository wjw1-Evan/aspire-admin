const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        activeTab: 'category', // category or request
        categories: [],
        requests: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        i18nTitleKey: 'apps.service'
    },

    onLoad() {
        this.fetchData(true);
    },

    onPullDownRefresh() {
        this.setData({ page: 1, hasMore: true }, () => {
            this.fetchData(true).then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (!this.data.loading && this.data.hasMore && this.data.activeTab === 'request') {
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
            categories: [],
            requests: []
        }, () => {
            this.fetchData(true);
        });
    },

    async fetchData(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        const isCategory = this.data.activeTab === 'category';
        const url = isCategory ? '/api/park/services/categories' : '/api/park/services/requests/list';
        const method = isCategory ? 'GET' : 'POST';
        const data = isCategory ? {} : {
            page: this.data.page,
            pageSize: this.data.pageSize,
            sortOrder: 'desc'
        };

        try {
            const res = await request({
                url,
                method,
                data
            });

            if (res.success) {
                if (isCategory) {
                    this.setData({ categories: res.data || [] });
                } else {
                    const list = res.data.requests || [];
                    this.setData({
                        requests: reset ? list : [...this.data.requests, ...list],
                        hasMore: list.length === this.data.pageSize
                    });
                }
            }
        } catch (err) {
            console.error('Fetch service data failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    goToCreate(e) {
        const catId = e.currentTarget.dataset.id;
        wx.showToast({ title: '申请功能开发中', icon: 'none' });
    },

    handleEditCategory(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/enterprise-service/category-form?id=${id}`
        });
    },

    handleDeleteCategory(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '确定要删除该服务分类吗？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/park/service-categories/${id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: '删除成功', icon: 'success' });
                            this.fetchData(true);
                        }
                    } catch (err) {
                        console.error('Delete category failed', err);
                    }
                }
            }
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/enterprise-service/detail?id=${id}`
        });
    },

    goToAdd() {
        if (this.data.activeTab === 'category') {
            wx.navigateTo({
                url: '/pages/park/enterprise-service/category-form'
            });
        } else {
            // For requests, we might want to navigate to category list first
            this.setData({ activeTab: 'category' });
        }
    }
})));
