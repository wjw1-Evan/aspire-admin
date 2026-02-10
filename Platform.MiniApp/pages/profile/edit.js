const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        formData: {
            name: '',
            email: '',
            phoneNumber: '',
            age: 0,
            avatar: ''
        },
        loading: false
    },

    onLoad() {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
            this.setData({
                formData: {
                    name: userInfo.name || '',
                    email: userInfo.email || '',
                    phoneNumber: userInfo.phoneNumber || '',
                    age: userInfo.age || 0,
                    avatar: userInfo.avatar || ''
                }
            });
        }
    },

    onInput(e) {
        const { field } = e.currentTarget.dataset;
        const { value } = e.detail;
        this.setData({
            [`formData.${field}`]: field === 'age' ? parseInt(value) || 0 : value
        });
    },

    async handleSubmit() {
        const { formData } = this.data;

        if (!formData.name) {
            return wx.showToast({ title: '姓名不能为空', icon: 'none' });
        }

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/user/me',
                method: 'PUT',
                data: formData
            });

            if (res.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                // 更新本地缓存
                const userInfo = wx.getStorageSync('userInfo');
                wx.setStorageSync('userInfo', { ...userInfo, ...formData });

                setTimeout(() => {
                    wx.navigateBack();
                }, 1500);
            }
        } catch (err) {
            console.error('Update profile failed', err);
        } finally {
            this.setData({ loading: false });
        }
    }
}));
