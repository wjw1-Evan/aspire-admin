const { t, setLocale, getLocale } = require('../../utils/i18n');

Page({
    data: {
        t: {},
        currentLanguageName: ''
    },

    onLoad() {
        this.updateTranslations();
    },

    updateTranslations() {
        const locale = getLocale();
        const tObj = {
            'settings.title': t('settings.title'),
            'settings.language': t('settings.language'),
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
        const languages = [t('settings.language.chinese'), t('settings.language.english')];
        const codes = ['zh-CN', 'en-US'];

        wx.showActionSheet({
            itemList: languages,
            success: (res) => {
                const selectedCode = codes[res.tapIndex];
                if (selectedCode !== getLocale()) {
                    setLocale(selectedCode);
                    this.updateTranslations();
                    
                    const appInstance = getApp();
                    if (appInstance.updateTabBarI18n) {
                        appInstance.updateTabBarI18n();
                    }
                    
                    wx.reLaunch({
                        url: '/pages/index/index'
                    });
                    
                    wx.showToast({
                        title: selectedCode === 'zh-CN' ? '设置成功' : 'Language changed',
                        icon: 'success'
                    });
                }
            }
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
