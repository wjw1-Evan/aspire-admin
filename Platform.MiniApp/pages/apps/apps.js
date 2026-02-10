const { withAuth } = require('../../utils/auth');

Page(withAuth({
    onShow: function () {
        // 页面展示时的逻辑
    }
}));
