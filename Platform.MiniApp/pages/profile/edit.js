const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');
const app = getApp();

Page(withAuth(withI18n({
    data: {
        formData: {
            name: '',
            email: '',
            phoneNumber: '',
            age: 0,
            avatar: ''
        },
        loading: false,
        i18nTitleKey: 'profile.edit.title'
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

                wx.showLoading({ title: t('profile.edit.upload_ing') });
                const apiUrl = app.globalData.baseUrl;
                try {
                    const uploadRes = await new Promise((resolve, reject) => {
                        wx.uploadFile({
                            url: `${apiUrl}/api/avatar/upload`,
                            filePath: tempFilePath,
                            name: 'file',
                            formData: {},
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
                            const avatarUrl = data.data.url;
                            this.setData({
                                'formData.avatar': avatarUrl,
                                'localAvatar': tempFilePath
                            });
                            wx.showToast({ title: t('profile.edit.upload_success'), icon: 'success' });
                        } else {
                            wx.showToast({ title: t('profile.edit.upload_failed'), icon: 'none' });
                        }
                    } else {
                        wx.showToast({ title: t('profile.edit.upload_failed'), icon: 'none' });
                    }
                } catch (err) {
                    console.error('Upload avatar failed', err);
                    wx.showToast({ title: t('profile.edit.upload_error'), icon: 'none' });
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
            return wx.showToast({ title: t('profile.edit.name_required'), icon: 'none' });
        }

        this.setData({ loading: true });
        try {
            const res = await request({
                url: '/api/users/me',
                method: 'PUT',
                data: formData
            });

            if (res.success) {
                wx.showToast({ title: t('profile.edit.save_success'), icon: 'success' });
                // 更新本地缓存
                const userInfo = wx.getStorageSync('userInfo');
                wx.setStorageSync('userInfo', {
                    ...userInfo,
                    ...formData,
                    phone: formData.phoneNumber
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
})));
