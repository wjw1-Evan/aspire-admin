const { t, withI18n } = require('../../utils/i18n');
const request = require('../../utils/request');

Page(withI18n({
    data: {
        id: '',
        details: {},
        showPassword: false,
        loading: false,
        i18nTitleKey: 'password.book.detail.title'
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.loadDetails(options.id);
        }
    },

    async loadDetails(id) {
        this.setData({ loading: true });
        try {
            const res = await request.get(`/api/password-book/${id}`);
            if (res.data) {
                this.setData({ details: res.data });
            }
        } catch (e) {
            console.error('Failed to load password details', e);
            wx.showToast({
                title: t('common.fail'),
                icon: 'none'
            });
        } finally {
            this.setData({ loading: false });
        }
    },

    togglePassword() {
        this.setData({ showPassword: !this.data.showPassword });
    },

    copyPassword() {
        if (this.data.details.password) {
            wx.setClipboardData({
                data: this.data.details.password,
                success: () => {
                    wx.showToast({
                        title: t('password.book.copy_success'),
                        icon: 'success'
                    });
                }
            });
        }
    },

    copyText(e) {
        const text = e.currentTarget.dataset.text;
        if (text) {
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
    },

    goToEdit() {
        wx.navigateTo({
            url: `/pages/password-book/form?id=${this.data.id}`
        });
    },

    async handleDelete() {
        const confirmed = await new Promise(resolve => {
            wx.showModal({
                title: t('common.tips'),
                content: t('password.book.delete_confirm'),
                success: res => resolve(res.confirm)
            });
        });

        if (!confirmed) return;

        try {
            await request.delete(`/api/password-book/${this.data.id}`);
            wx.showToast({
                title: t('password.book.delete_success'),
                icon: 'success'
            });
            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        } catch (e) {
            console.error('Failed to delete password entry', e);
            wx.showToast({
                title: t('common.fail'),
                icon: 'none'
            });
        }
    }
}));
