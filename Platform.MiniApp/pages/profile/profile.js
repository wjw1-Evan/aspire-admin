const { request } = require('../../utils/request');
const { logout, withAuth } = require('../../utils/auth');

const app = getApp();

Page(withAuth({
    data: {
        userInfo: null,
        currentCompany: null
    },

    onShow() {
        this.fetchUserInfo();
        this.fetchCurrentCompany();
    },

    async fetchUserInfo() {
        try {
            const res = await request({
                url: '/api/user/me',
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
                    wx.showToast({ title: '图片过大，请使用5MB以内的图片', icon: 'none' });
                    return;
                }

                wx.showLoading({ title: '上传中...' });

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

                                    wx.showToast({ title: '修改成功', icon: 'success' });

                                    // 更新本地存储
                                    const currentUserInfo = wx.getStorageSync('userInfo') || {};
                                    currentUserInfo.avatar = newAvatarUrl;
                                    wx.setStorageSync('userInfo', currentUserInfo);
                                } else {
                                    wx.showToast({ title: '上传成功但未获取到地址', icon: 'none' });
                                }
                            } else {
                                wx.showToast({
                                    title: data.message || '上传失败',
                                    icon: 'none'
                                });
                            }
                        } catch (e) {
                            console.error('解析上传响应失败', e);
                            wx.showToast({ title: '上传响应异常', icon: 'none' });
                        }
                    },
                    fail: (err) => {
                        wx.hideLoading();
                        console.error('上传失败', err);
                        wx.showToast({ title: '网络错误', icon: 'none' });
                    }
                });
            }
        });
    },

    handleLogout() {
        wx.showModal({
            title: '提示',
            content: '确定要退出登录吗？',
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
            wx.showLoading({ title: '加载中...' });

            // 1. 获取我的企业列表
            const res = await request({
                url: '/api/company/my-companies',
                method: 'GET'
            });

            wx.hideLoading();

            if (!res.success || !res.data || res.data.length === 0) {
                wx.showToast({ title: '暂无其他企业', icon: 'none' });
                return;
            }

            const companies = res.data;
            const currentCompanyId = this.data.currentCompany?.id;

            // 2. 构建 ActionSheet 选项
            const itemList = companies.map(c => {
                let name = c.companyName;
                if (c.isAdmin) name += ' (管理员)';
                if (c.isPersonal) name += ' (个人)';
                if (c.companyId === currentCompanyId) name += ' [当前]';
                return name;
            });

            // 3. 显示选择菜单
            wx.showActionSheet({
                itemList,
                success: async (tapRes) => {
                    const selectedCompany = companies[tapRes.tapIndex];

                    // 如果选择的是当前企业，直接返回
                    if (selectedCompany.companyId === currentCompanyId) {
                        return;
                    }

                    // 4. 执行切换
                    wx.showLoading({ title: '切换中...' });
                    try {
                        const switchRes = await request({
                            url: '/api/company/switch',
                            method: 'POST',
                            data: { targetCompanyId: selectedCompany.companyId }
                        });

                        if (switchRes.success) {
                            // 更新 Token
                            if (switchRes.data && switchRes.data.token) {
                                wx.setStorageSync('token', switchRes.data.token);
                            }

                            wx.showToast({ title: '切换成功', icon: 'success' });

                            // 刷新数据
                            this.setData({
                                userInfo: null,
                                currentCompany: null
                            });

                            // 重新加载页面数据
                            await this.fetchUserInfo();
                            await this.fetchCurrentCompany();

                            // 通知首页或其他页面刷新（如果需要）
                            // 也可以选择 reLaunch 重启应用确保状态彻底清理
                            setTimeout(() => {
                                wx.reLaunch({ url: '/pages/index/index' });
                            }, 1000);

                        } else {
                            wx.showToast({
                                title: switchRes.message || '切换失败',
                                icon: 'none'
                            });
                        }
                    } catch (err) {
                        console.error('切换企业异常:', err);
                        wx.showToast({ title: '切换失败', icon: 'none' });
                    } finally {
                        wx.hideLoading();
                    }
                }
            });

        } catch (err) {
            wx.hideLoading();
            console.error('获取企业列表失败:', err);
            wx.showToast({ title: '获取列表失败', icon: 'none' });
        }
    },

    aboutUs() {
        wx.showModal({
            title: '关于系统',
            content: 'Aspire Admin v1.0.0\n企业级微服务管理平台移动端',
            showCancel: false,
            confirmColor: '#1890ff'
        });
    }
}));
