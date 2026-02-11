const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const app = getApp();

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
        const displayAvatar = (userInfo.avatar && userInfo.avatar.startsWith('http')) ? '' : (userInfo.avatar || '');

        this.setData({
            displayAvatar,
            formData: {
                name: userInfo.name || '',
                email: userInfo.email || '',
                phoneNumber: userInfo.phone || userInfo.phoneNumber || '',
                age: userInfo.age || 0,
                avatar: userInfo.avatar || ''
            }
        });

        // 如果有头像且是远程链接，尝试下载以正确显示
        if (userInfo.avatar && userInfo.avatar.startsWith('http')) {
            wx.downloadFile({
                url: userInfo.avatar,
                header: {
                    'Authorization': `Bearer ${wx.getStorageSync('token')}`
                },
                success: (res) => {
                    if (res.statusCode === 200) {
                        this.setData({ localAvatar: res.tempFilePath });
                    }
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
                const apiUrl = app.globalData.baseUrl;
                try {
                    const uploadRes = await new Promise((resolve, reject) => {
                        wx.uploadFile({
                            url: `${apiUrl}/api/avatar/upload`,
                            filePath: tempFilePath,
                            name: 'file', // 后端参数名为 file
                            formData: {
                                // 'Overwrite': 'true' // AvatarController 不需要此参数
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
                            // 使用临时路径立即展示，解决上传后不刷新问题
                            // 后端直接返回完整的 url
                            const avatarUrl = data.data.url;
                            this.setData({
                                'formData.avatar': avatarUrl,
                                'localAvatar': tempFilePath
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
