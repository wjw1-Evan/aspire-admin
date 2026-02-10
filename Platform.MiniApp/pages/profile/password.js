const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        formData: {
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        },
        loading: false
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
            return wx.showToast({ title: '请输入当前密码', icon: 'none' });
        }
        if (formData.newPassword.length < 6) {
            return wx.showToast({ title: '新密码长度至少6位', icon: 'none' });
        }
        if (formData.newPassword !== formData.confirmPassword) {
            return wx.showToast({ title: '两次输入的密码不一致', icon: 'none' });
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
                wx.showToast({ title: '修改成功', icon: 'success' });
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
}));
