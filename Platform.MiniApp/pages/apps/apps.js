const { withAuth } = require('../../utils/auth');

Page(withAuth({
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

    navigateToProfile() {
        wx.switchTab({
            url: '/pages/profile/profile'
        });
    }
}));
