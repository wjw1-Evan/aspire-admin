Page({
    data: {
        content: ''
    },

    onLoad() {
        const report = wx.getStorageSync('last_ai_report');
        if (report) {
            // Very basic markdown to simple HTML conversion for demonstration
            // In a real app, use a proper markdown library or more robust conversion
            const html = this.simpleMarkdownToHtml(report);
            this.setData({ content: html });
        }
    },

    simpleMarkdownToHtml(md) {
        if (!md) return '';

        let html = md
            .replace(/^### (.*$)/gm, '<h3 style="color:#1890ff;margin:20rpx 0;">$1</h3>')
            .replace(/^## (.*$)/gm, '<h2 style="border-bottom:1rpx solid #eee;padding-bottom:10rpx;margin-top:30rpx;">$1</h2>')
            .replace(/^# (.*$)/gm, '<h1 style="text-align:center;">$1</h1>')
            .replace(/\*\*(.*)\*\*/g, '<b style="color:#333;">$1</b>')
            .replace(/^- (.*$)/gm, '<li style="margin-left:20rpx;color:#666;">$1</li>')
            .replace(/\n/g, '<br/>');

        return `<div style="line-height:1.6;font-size:28rpx;color:#444;">${html}</div>`;
    },

    onShareAppMessage() {
        return {
            title: '项目运营 AI 深度分析报告',
            path: '/pages/statistics/index'
        };
    }
});
