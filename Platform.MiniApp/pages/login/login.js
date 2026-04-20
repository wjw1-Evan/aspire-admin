const { login } = require('../../utils/auth.js');
const { request } = require('../../utils/request.js');
const { withI18n, t } = require('../../utils/i18n.js');

Page(withI18n({
    data: {
        i18nTitleKey: 'login.title',
        username: '',
        password: '',
        loading: false,
    },

    onUsernameInput(e) {
        this.setData({ username: e.detail.value });
    },

    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },

    async handleLogin() {
        const { username, password } = this.data;
        if (!username || !password) {
            wx.showToast({
                title: t('login.failed'),
                icon: 'none'
            });
            return;
        }

        this.setData({ loading: true });
        try {
            await login({
                username,
                password,
            });

            wx.showToast({
                title: t('common.success'),
                icon: 'success'
            });
            setTimeout(() => {
                wx.switchTab({
                    url: '/pages/index/index',
                });
            }, 1000);
        } catch (res) {
            console.error('Login failed:', res);
            const code = res.code || res.errorCode;
            let message = res.errorMessage || res.message;

            const errorMap = {
                'INVALID_CREDENTIALS': t('login.failed'),
                'USER_NOT_FOUND': t('login.failed'),
                'USER_DISABLED': t('common.fail'),
                'VALIDATION_ERROR': t('common.fail')
            };

            if (errorMap[code]) {
                message = errorMap[code];
            }

            wx.showToast({
                title: message || t('login.failed'),
                icon: 'none',
                duration: 2000
            });
        } finally {
            this.setData({ loading: false });
        }
    }
}));
