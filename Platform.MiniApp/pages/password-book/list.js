const { t, withI18n } = require('../../utils/i18n');
const request = require('../../utils/request');

Page(withI18n({
    data: {
        passwords: [],
        page: 1,
        pageSize: 10,
        keyword: '',
        loading: false,
        hasMore: true,
        i18nTitleKey: 'password.book.list.title'
    },

    onLoad() {
        this.loadPasswords();
    },

    onPullDownRefresh() {
        this.setData({
            passwords: [],
            page: 1,
            hasMore: true
        }, () => {
            this.loadPasswords().then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onSearchInput(e) {
        this.setData({ keyword: e.detail.value });
    },

    handleSearch() {
        this.setData({
            passwords: [],
            page: 1,
            hasMore: true
        }, () => {
            this.loadPasswords();
        });
    },

    async loadPasswords() {
        if (this.data.loading || !this.data.hasMore) return;

        this.setData({ loading: true });

        try {
            const res = await request.post('/api/password-book/list', {
                current: this.data.page,
                pageSize: this.data.pageSize,
                keyword: this.data.keyword
            });

            if (res.data && res.data.data) {
                this.setData({
                    passwords: this.data.passwords.concat(res.data.data),
                    page: this.data.page + 1,
                    hasMore: this.data.passwords.length + res.data.data.length < res.data.total
                });
            }
        } catch (e) {
            console.error('Failed to load passwords', e);
        } finally {
            this.setData({ loading: false });
        }
    },

    loadMore() {
        this.loadPasswords();
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/password-book/detail?id=${id}`
        });
    },

    goToAdd() {
        wx.navigateTo({
            url: '/pages/password-book/form'
        });
    },

    copyText(e) {
        const text = e.currentTarget.dataset.text;
        wx.setClipboardData({
            data: text,
            success: () => {
                wx.showToast({
                    title: t('password.book.copy_success'),
                    icon: 'success'
                });
            }
        });
    }
}));
