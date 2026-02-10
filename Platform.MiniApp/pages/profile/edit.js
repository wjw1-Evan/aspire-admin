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
                    phoneNumber: userInfo.phone || userInfo.phoneNumber || '',
                    age: userInfo.age || 0,
                    avatar: userInfo.avatar || ''
                }
            });
        }
    },

    chooseAvatar() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: async (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;

                // 上传头像
                wx.showLoading({ title: '上传中...' });
                const apiUrl = wx.getStorageSync('apiUrl') || 'https://aspire-admin.zeabur.app';
                try {
                    const uploadRes = await new Promise((resolve, reject) => {
                        wx.uploadFile({
                            url: `${apiUrl}/api/cloud-storage/upload`,
                            filePath: tempFilePath,
                            name: 'File', // 后端要求 File
                            formData: {
                                'Overwrite': 'true' // 头像上传通常覆盖或后端处理
                            },
                            header: {
                                'Authorization': `Bearer ${wx.getStorageSync('token')}`
                            },
                            success: (res) => resolve(res),
                            fail: (err) => reject(err)
                        });
                    });

                    if (uploadRes.statusCode === 200) {
                        const data = JSON.parse(uploadRes.data);
                        if (data.success) {
                            this.setData({
                                'formData.avatar': data.data.url
                            });
                            wx.showToast({ title: '上传成功', icon: 'success' });
                        } else {
                            wx.showToast({ title: '上传失败', icon: 'none' });
                        }
                    } else {
                        wx.showToast({ title: '上传失败', icon: 'none' });
                    }
                } catch (err) {
                    console.error('Upload avatar failed', err);
                    wx.showToast({ title: '上传出错', icon: 'none' });
                } finally {
                    wx.hideLoading();
                }
            }
        });
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
                wx.setStorageSync('userInfo', {
                    ...userInfo,
                    ...formData,
                    phone: formData.phoneNumber // 同时更新 phone 字段，保持一致
                });

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
