const { login } = require('../../utils/auth.js');
const { request } = require('../../utils/request.js');

Page({
    data: {
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
                title: '请输入用户名和密码',
                icon: 'none'
            });
            return;
        }

        if (showCaptcha && !captchaAnswer) {
            wx.showToast({
                title: '请输入验证码',
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
                title: '登录成功',
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

            // 🔧 优化：错误码转义，提供更友好的中文提示
            const errorMap = {
                'CAPTCHA_REQUIRED': '请输入验证码',
                'CAPTCHA_INVALID': '验证码错误',
                'CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN': '多次登录失败，请输入验证码后重试',
                'LOGIN_FAILED': '用户名或密码错误',
                'INVALID_CREDENTIALS': '用户名或密码错误',
                'USER_NOT_FOUND': '用户不存在',
                'USER_DISABLED': '该账户已被禁用',
                'VALIDATION_ERROR': '输入格式不正确'
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
                title: message || '登录失败',
                icon: 'none',
                duration: 2000
            });
        } finally {
            this.setData({ loading: false });
        }
    }
});
