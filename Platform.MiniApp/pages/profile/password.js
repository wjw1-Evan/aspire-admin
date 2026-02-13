const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        formData: {
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        },
        loading: false,
        i18nTitleKey: 'profile.password.title'
    },

    onInput(e) {
        const { field } = e.currentTarget.dataset;
        const { value } = e.detail;
        this.setData({
            [`formData.${field}`]: value
        });
    },

    async handleSubmit() {
        const { formData } = this.data;

        if (!formData.oldPassword) {
            return wx.showToast({ title: t('profile.password.current_required'), icon: 'none' });
        }
        if (formData.newPassword.length < 6) {
            return wx.showToast({ title: t('profile.password.min_length'), icon: 'none' });
        }
        if (formData.newPassword !== formData.confirmPassword) {
            return wx.showToast({ title: t('profile.password.not_match'), icon: 'none' });
        }

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/user/me/password',
                method: 'PUT',
                data: {
                    oldPassword: formData.oldPassword,
                    newPassword: formData.newPassword
                }
            });

            if (res.success) {
                wx.showToast({ title: t('profile.password.success'), icon: 'success' });
                setTimeout(() => {
                    wx.navigateBack();
                }, 1500);
            }
        } catch (err) {
            console.error('Change password failed', err);
        } finally {
            this.setData({ loading: false });
        }
    }
})));
