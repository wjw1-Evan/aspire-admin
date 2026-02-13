const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, getLocale, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        activeTab: 'building', // building or property
        buildings: [],
        properties: [],
        loading: false,
        page: 1,
        pageSize: 10,
        hasMore: true,
        searchKeyword: '',
        i18nTitleKey: 'apps.asset'
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
            buildings: [],
            properties: []
        }, () => {
            this.fetchData(true);
        });
    },

    async fetchData(reset = false) {
        if (this.data.loading) return;

        this.setData({ loading: true });
        const isBuilding = this.data.activeTab === 'building';
        const url = isBuilding ? '/api/park/buildings/list' : '/api/park/properties/list';

        try {
            const res = await request({
                url: url,
                method: 'POST',
                data: {
                    search: this.data.searchKeyword,
                    page: this.data.page,
                    pageSize: this.data.pageSize,
                    sortOrder: 'asc'
                }
            });

            if (res.success) {
                const list = isBuilding ? (res.data.buildings || []) : (res.data.propertyUnits || []);
                if (isBuilding) {
                    this.setData({
                        buildings: reset ? list : [...this.data.buildings, ...list],
                        hasMore: list.length === this.data.pageSize
                    });
                } else {
                    this.setData({
                        properties: reset ? list : [...this.data.properties, ...list],
                        hasMore: list.length === this.data.pageSize
                    });
                }
            }
        } catch (err) {
            console.error('Fetch assets failed', err);
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

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/asset/detail?id=${id}`
        });
    },

    goToUnitDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/park/asset/unit-detail?id=${id}`
        });
    },

    goToAdd() {
        const path = this.data.activeTab === 'building' ? 'building-form' : 'unit-form';
        wx.navigateTo({
            url: `/pages/park/asset/${path}`
        });
    }
})));
