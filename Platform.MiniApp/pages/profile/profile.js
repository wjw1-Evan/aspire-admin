const { request } = require('../../utils/request');
const { logout, withAuth } = require('../../utils/auth');
const { t, getLocale, withI18n } = require('../../utils/i18n');

const app = getApp();

Page(withAuth(withI18n({
    data: {
        t: {},
        userInfo: null,
        currentCompany: null
    },

    onLoad() {
        wx.setNavigationBarTitle({ title: t('profile.title') });
    },

    onShow() {
        this.fetchUserInfo();
        this.fetchCurrentCompany();
    },

    async fetchUserInfo() {
        try {
            const res = await request({
                url: '/api/users/me',
                method: 'GET'
            });
            if (res.success) {
                const userInfo = res.data;

                // 处理头像 URL
                if (userInfo.avatar && !userInfo.avatar.startsWith('http')) {
                    userInfo.avatar = `${app.globalData.baseUrl}${userInfo.avatar}`;
                }

                this.setData({ userInfo });
                wx.setStorageSync('userInfo', userInfo);
            }
        } catch (err) {
            console.error('Fetch user info failed', err);
        }
    },

    handleAvatarTap() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;

                if (!tempFilePath) return;

                // 检查文件大小 (5MB)
                if (res.tempFiles[0].size > 5 * 1024 * 1024) {
                    wx.showToast({ title: t('profile.image_too_large'), icon: 'none' });
                    return;
                }

                wx.showLoading({ title: t('common.uploading') });

                const token = wx.getStorageSync('token');

                // 构建完整上传 URL
                let uploadUrl = `${app.globalData.baseUrl}/api/avatar/upload`;
                // 处理 baseUrl 结尾可能有斜杠的情况，避免双斜杠 (虽然 http://...//api 也能工作，但最好规范)
                if (app.globalData.baseUrl.endsWith('/')) {
                    uploadUrl = `${app.globalData.baseUrl}api/avatar/upload`;
                }

                wx.uploadFile({
                    url: uploadUrl,
                    filePath: tempFilePath,
                    name: 'file',
                    header: {
                        'Authorization': `Bearer ${token}`
                    },
                    success: (uploadRes) => {
                        wx.hideLoading();

                        // wx.uploadFile 返回的 data 是字符串，需要 JSON.parse
                        try {
                            const data = JSON.parse(uploadRes.data);
                            if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
                                // 成功
                                let newAvatarUrl = data.url || data.data.url; // 兼容可能的返回结构

                                if (newAvatarUrl) {
                                    // 如果返回的是相对路径，拼接完整路径
                                    if (!newAvatarUrl.startsWith('http')) {
                                        newAvatarUrl = `${app.globalData.baseUrl}${newAvatarUrl}`;
                                    }

                                    // 更新页面数据
                                    this.setData({
                                        'userInfo.avatar': newAvatarUrl
                                    });

                                    wx.showToast({ title: t('profile.modify_success'), icon: 'success' });

                                    const currentUserInfo = wx.getStorageSync('userInfo') || {};
                                    currentUserInfo.avatar = newAvatarUrl;
                                    wx.setStorageSync('userInfo', currentUserInfo);
                                } else {
                                    wx.showToast({ title: t('profile.no_avatar_url'), icon: 'none' });
                                }
                            } else {
                                wx.showToast({
                                    title: data.message || t('profile.upload_failed'),
                                    icon: 'none'
                                });
                            }
                        } catch (e) {
                            console.error('解析上传响应失败', e);
                            wx.showToast({ title: t('profile.upload_response_error'), icon: 'none' });
                        }
                    },
                    fail: (err) => {
                        wx.hideLoading();
                        console.error('上传失败', err);
                        wx.showToast({ title: t('profile.network_error'), icon: 'none' });
                    }
                });
            }
        });
    },

    handleLogout() {
        wx.showModal({
            title: t('common.tips'),
            content: t('profile.logout.confirm'),
            confirmColor: '#1890ff',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await request({
                            url: '/api/auth/logout',
                            method: 'POST'
                        });
                    } catch (e) {
                        // 即使接口失败也清理本地并退出
                    }
                    logout();
                }
            }
        });
    },

    navigateToEdit() {
        wx.navigateTo({ url: '/pages/profile/edit' });
    },

    navigateToPassword() {
        wx.navigateTo({ url: '/pages/profile/password' });
    },

    navigateToSettings() {
        wx.navigateTo({ url: '/pages/profile/settings' });
    },

    async fetchCurrentCompany() {
        try {
            const res = await request({
                url: '/api/company/my-companies',
                method: 'GET'
            });
            if (res.success && res.data) {
                const current = res.data.find(c => c.isCurrent);
                if (current) {
                    this.setData({ currentCompany: current });
                }
            }
        } catch (err) {
            console.error('获取当前企业信息失败:', err);
        }
    },

    async handleSwitchCompany() {
        try {
            wx.showLoading({ title: t('common.loading') });

            const res = await request({
                url: '/api/company/my-companies',
                method: 'GET'
            });

            wx.hideLoading();

            if (!res.success || !res.data || res.data.length === 0) {
                wx.showToast({ title: t('profile.no_other_company'), icon: 'none' });
                return;
            }

            const companies = res.data;
            const currentCompanyId = this.data.currentCompany?.id;

            const itemList = companies.map(c => {
                let name = c.companyName;
                if (c.isAdmin) name += ` (${t('profile.admin')})`;
                if (c.isPersonal) name += ` (${t('profile.personal')})`;
                if (c.companyId === currentCompanyId) name += ` [${t('profile.current')}]`;
                return name;
            });

            wx.showActionSheet({
                itemList,
                success: async (tapRes) => {
                    const selectedCompany = companies[tapRes.tapIndex];

                    if (selectedCompany.companyId === currentCompanyId) {
                        return;
                    }

                    wx.showLoading({ title: t('profile.switching') });
                    try {
                        const switchRes = await request({
                            url: '/api/company/switch',
                            method: 'POST',
                            data: { targetCompanyId: selectedCompany.companyId }
                        });

                        if (switchRes.success) {
                            if (switchRes.data && switchRes.data.token) {
                                wx.setStorageSync('token', switchRes.data.token);
                            }

                            wx.showToast({ title: t('profile.switch_success'), icon: 'success' });

                            this.setData({
                                userInfo: null,
                                currentCompany: null
                            });

                            await this.fetchUserInfo();
                            await this.fetchCurrentCompany();

                            setTimeout(() => {
                                wx.reLaunch({ url: '/pages/index/index' });
                            }, 1000);

                        } else {
                            wx.showToast({
                                title: switchRes.message || t('profile.switch_failed'),
                                icon: 'none'
                            });
                        }
                    } catch (err) {
                        console.error('切换企业异常:', err);
                        wx.showToast({ title: t('profile.switch_failed'), icon: 'none' });
                    } finally {
                        wx.hideLoading();
                    }
                }
            });

        } catch (err) {
            wx.hideLoading();
            console.error('获取企业列表失败:', err);
            wx.showToast({ title: t('profile.failed_to_load_companies'), icon: 'none' });
        }
    },

    aboutUs() {
        wx.showModal({
            title: t('profile.about'),
            content: t('profile.about.content'),
            showCancel: false,
            confirmColor: '#1890ff'
        });
    }
})));
