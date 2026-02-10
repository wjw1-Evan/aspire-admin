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

    navigateToTask() {
        wx.navigateTo({
            url: '/pages/task/list',
        });
    }
}));
