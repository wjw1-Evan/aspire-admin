const { login } = require('../../utils/auth');

Page({
    data: {
        username: '',
        password: '',
        loading: false
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
                title: '请输入用户名和密码',
                icon: 'none'
            });
            return;
        }

        this.setData({ loading: true });
        try {
            await login(username, password);
            wx.showToast({
                title: '登录成功',
                icon: 'success'
            });
            setTimeout(() => {
                wx.switchTab({
                    url: '/pages/index/index',
                });
            }, 1500);
        } catch (err) {
            console.error('Login error:', err);
        } finally {
            this.setData({ loading: false });
        }
    }
});
