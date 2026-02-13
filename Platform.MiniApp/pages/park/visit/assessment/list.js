const { t, withI18n } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        assessments: [],
        page: 1,
        pageSize: 10,
        search: '',
        loading: false,
        hasMore: true,
        i18nTitleKey: 'park.visit.assessment.list.title'
    },

    onLoad() {
        this.loadAssessments();
    },

    onPullDownRefresh() {
        this.setData({
            assessments: [],
            page: 1,
            hasMore: true
        }, () => {
            this.loadAssessments().then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onSearchInput(e) {
        const search = e.detail.value;
        this.setData({ search });
        // Use debounce if necessary
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.setData({
                assessments: [],
                page: 1,
                hasMore: true
            }, () => {
                this.loadAssessments();
            });
        }, 500);
    },

    async loadAssessments() {
        if (this.data.loading || !this.data.hasMore) return;

        this.setData({ loading: true });

        try {
            const res = await request.get('/api/park-management/visit/assessments', {
                page: this.data.page,
                pageSize: this.data.pageSize,
                search: this.data.search
            });

            if (res.data && res.data.assessments) {
                const newAssessments = res.data.assessments.map(item => ({
                    ...item,
                    createdAt: item.createdAt ? item.createdAt.substring(0, 10) : ''
                }));

                this.setData({
                    assessments: this.data.assessments.concat(newAssessments),
                    page: this.data.page + 1,
                    hasMore: this.data.assessments.length + newAssessments.length < res.data.total
                });
            }
        } catch (e) {
            console.error('Failed to load assessments', e);
            wx.showToast({
                title: t('common.fail'),
                icon: 'none'
            });
        } finally {
            this.setData({ loading: false });
        }
    },

    loadMore() {
        this.loadAssessments();
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        // For now, assessment detail might just be viewing the record
        // Or we could navigate to the form in view mode
        wx.navigateTo({
            url: `../assessment/form?id=${id}&mode=view`
        });
    }
}));
