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

    navigateToAsset() {
        wx.navigateTo({ url: '/pages/park/asset/list' });
    },

    navigateToTenant() {
        wx.navigateTo({ url: '/pages/park/tenant/list' });
    },

    navigateToContract() {
        wx.navigateTo({ url: '/pages/park/contract/list' });
    },

    navigateToService() {
        wx.navigateTo({ url: '/pages/park/enterprise-service/list' });
    },

    navigateToVisit() {
        wx.navigateTo({ url: '/pages/park/visit/task-list' });
    },

    navigateToParkStats() {
        wx.navigateTo({ url: '/pages/park/statistics/index' });
    },

    navigateToVisitAssessment() {
        wx.navigateTo({ url: '/pages/park/visit/assessment/list' });
    },

    navigateToVisitKnowledge() {
        wx.navigateTo({ url: '/pages/park/visit/knowledge/list' });
    },

    navigateToVisitStats() {
        wx.navigateTo({ url: '/pages/park/visit/statistics/index' });
    },

    navigateToPasswordBook() {
        wx.navigateTo({ url: '/pages/password-book/list' });
    },

    navigateToProfile() {
        wx.switchTab({
            url: '/pages/profile/profile'
        });
    }
})));
