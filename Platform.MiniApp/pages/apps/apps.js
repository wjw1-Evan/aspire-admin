const { withAuth } = require('../../utils/auth');
const { withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        i18nTitleKey: 'apps.title'
    },

    onShow: function () {
        // 页面展示时的逻辑
    },

    navigateToProject() {
        wx.navigateTo({
            url: '/pages/project/list',
        });
    },

    navigateToStatistics() {
        wx.navigateTo({
            url: '/pages/statistics/index'
        });
    },

    navigateToTask() {
        wx.navigateTo({
            url: '/pages/task/list',
        });
    },

    navigateToCloudStorage() {
        wx.navigateTo({
            url: '/pages/cloud-storage/index'
        });
    },

    navigateToParkInvestment() {
        wx.navigateTo({
            url: '/pages/park/investment/leads',
        });
    },

    navigateToProfile() {
        wx.switchTab({
            url: '/pages/profile/profile'
        });
    }
})));
