const { login } = require('../../utils/auth.js');
const { request } = require('../../utils/request.js');
const { withI18n, t } = require('../../utils/i18n.js');

Page(withI18n({
    data: {
        i18nTitleKey: 'login.title',
        username: '',
        password: '',
        loading: false,
        showCaptcha: false,
        captchaId: '',
        captchaAnswer: '',
        captchaUrl: ''
    },

    onUsernameInput(e) {
        this.setData({ username: e.detail.value });
    },

    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },

    onCaptchaInput(e) {
        this.setData({ captchaAnswer: e.detail.value });
    },

    async fetchCaptcha() {
        try {
            const res = await request({
                url: '/api/auth/captcha/image',
                method: 'GET',
                skipAuth: true
            });
            if (res.success && res.data) {
                this.setData({
                    captchaId: res.data.captchaId,
                    // 🔧 修复：Base64 图片需要协议前缀才能在 <image> 组件显示
                    captchaUrl: `data:image/png;base64,${res.data.imageData}`,
                    captchaAnswer: ''
                });
            }
        } catch (err) {
            console.error('Fetch captcha failed', err);
        }
    },

    async handleLogin() {
        const { username, password, showCaptcha, captchaId, captchaAnswer } = this.data;
        if (!username || !password) {
            wx.showToast({
                title: t('login.failed'),
                icon: 'none'
            });
            return;
        }

        if (showCaptcha && !captchaAnswer) {
            wx.showToast({
                title: t('login.captcha'),
                icon: 'none'
            });
            return;
        }

        this.setData({ loading: true });
        try {
            await login({
                username,
                password,
                captchaId: showCaptcha ? captchaId : undefined,
                captchaAnswer: showCaptcha ? captchaAnswer : undefined
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

            // 🔧 优化：错误码转义，提供更友好的多语言提示
            const errorMap = {
                'CAPTCHA_REQUIRED': t('login.captcha'),
                'CAPTCHA_INVALID': t('common.fail'),
                'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': t('login.captcha'),
                'LOGIN_FAILED': t('login.failed'),
                'INVALID_CREDENTIALS': t('login.failed'),
                'USER_NOT_FOUND': t('login.failed'),
                'USER_DISABLED': t('common.fail'),
                'VALIDATION_ERROR': t('common.fail')
            };

            if (errorMap[code]) {
                message = errorMap[code];
            }

            // 业务逻辑：根据错误码决定是否显示验证码
            const captchaCodes = ['CAPTCHA_REQUIRED', 'CAPTCHA_INVALID', 'LOGIN_FAILED', 'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN'];
            if (captchaCodes.includes(code)) {
                this.setData({ showCaptcha: true });
                this.fetchCaptcha();
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
