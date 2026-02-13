const { withAuth } = require('../../utils/auth.js');
const { t, withI18n } = require('../../utils/i18n.js');

Page(withAuth(withI18n({
    data: {
        content: '',
        i18nTitleKey: 'stats.ai_report'
    },

    onLoad() {
        const report = wx.getStorageSync('last_ai_report');
        if (report) {
            const html = this.simpleMarkdownToHtml(report);
            this.setData({ content: html });
        }
    },

    simpleMarkdownToHtml(md) {
        return md
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*)$/gm, '<p style="padding-left:16px;">• $1</p>')
            .replace(/\n/g, '<br/>');
    },

    onShareAppMessage() {
        return {
            title: t('stats.report.share_title'),
            path: '/pages/statistics/report'
        };
    }
})));
