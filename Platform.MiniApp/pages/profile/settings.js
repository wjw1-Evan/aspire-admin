const { t, setLocale, getLocale } = require('../../utils/i18n');

Page({
    data: {
        t: {},
        currentLanguageName: '',
        isDarkTheme: false
    },

    onLoad() {
        this.updateTranslations();
    },

    updateTranslations() {
        const locale = getLocale();
        const tObj = {
            'settings.title': t('settings.title'),
            'settings.language': t('settings.language'),
            'settings.theme': t('settings.theme'),
            'settings.cache': t('settings.cache'),
            'settings.version': t('settings.version'),
        };

        const languageMap = {
            'zh-CN': t('settings.language.chinese'),
            'en-US': t('settings.language.english')
        };

        this.setData({
            t: tObj,
            currentLanguageName: languageMap[locale]
        });

        wx.setNavigationBarTitle({
            title: t('settings.title')
        });
    },

    handleLanguageChange() {
        const languages = ['简体中文', 'English'];
        const codes = ['zh-CN', 'en-US'];

        wx.showActionSheet({
            itemList: languages,
            success: (res) => {
                const selectedCode = codes[res.tapIndex];
                if (selectedCode !== getLocale()) {
                    setLocale(selectedCode);
                    this.updateTranslations();
                    wx.showToast({
                        title: selectedCode === 'zh-CN' ? '设置成功' : 'Language changed',
                        icon: 'success'
                    });

                    // 通知其他页面更新（可选，也可以通过全局变量或事件总线）
                }
            }
        });
    },

    handleThemeChange(e) {
        this.setData({ isDarkTheme: e.detail.value });
        wx.showToast({
            title: t('common.tips'),
            icon: 'none'
        });
    },

    handleClearCache() {
        wx.showModal({
            title: t('common.tips'),
            content: t('settings.cache.msg'),
            confirmColor: '#1890ff',
            success: (res) => {
                if (res.confirm) {
                    // 保留 Token 和必要的登录信息，只清理临时缓存
                    const token = wx.getStorageSync('token');
                    const refreshToken = wx.getStorageSync('refresh_token');
                    const userInfo = wx.getStorageSync('userInfo');
                    const locale = wx.getStorageSync('locale');

                    wx.clearStorageSync();

                    // 恢复关键数据
                    wx.setStorageSync('token', token);
                    wx.setStorageSync('refresh_token', refreshToken);
                    wx.setStorageSync('userInfo', userInfo);
                    wx.setStorageSync('locale', locale);

                    wx.showToast({
                        title: t('settings.cache.success'),
                        icon: 'success'
                    });
                }
            }
        });
    }
});
