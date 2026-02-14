const { t, withI18n } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        activeTab: 'faq',
        faqList: [],
        questionnaireList: [],
        faqPage: 1,
        pageSize: 10,
        hasMoreFaq: true,
        loading: false,
        expandedFaq: '',
        i18nTitleKey: 'park.visit.knowledge.list.title',
        t: {}
    },

    onShow() {
        this.updateTranslations();
    },

    onLoad() {
        this.updateTranslations();
        this.loadFaq();
    },

    updateTranslations() {
        this.setData({
            t: {
                'title': t('park.visit.knowledge.list.title'),
                'faq': t('park.visit.knowledge.faq'),
                'questionnaire': t('park.visit.knowledge.questionnaire'),
                'all': t('common.all'),
                'empty': t('common.empty'),
                'loading': t('common.loading'),
                'noMore': t('common.no_more'),
                'questions': t('task.detail.title') // 使用已有的翻译键或调整
            }
        });
        wx.setNavigationBarTitle({ title: t('park.visit.knowledge.list.title') });
    },

    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        if (tab === this.data.activeTab) return;

        this.setData({ activeTab: tab });

        if (tab === 'faq' && this.data.faqList.length === 0) {
            this.loadFaq();
        } else if (tab === 'questionnaire' && this.data.questionnaireList.length === 0) {
            this.loadQuestionnaires();
        }
    },

    async loadFaq() {
        if (this.data.loading || !this.data.hasMoreFaq) return;

        this.setData({ loading: true });

        try {
            const res = await request.get('/api/park-management/visit/questions', {
                page: this.data.faqPage,
                pageSize: this.data.pageSize
            });

            if (res.data && res.data.questions) {
                this.setData({
                    faqList: this.data.faqList.concat(res.data.questions),
                    faqPage: this.data.faqPage + 1,
                    hasMoreFaq: this.data.faqList.length + res.data.questions.length < res.data.total
                });
            }
        } catch (e) {
            console.error('Failed to load FAQ', e);
        } finally {
            this.setData({ loading: false });
        }
    },

    async loadQuestionnaires() {
        if (this.data.loading) return;

        this.setData({ loading: true });

        try {
            const res = await request.get('/api/park-management/visit/questionnaires');
            if (res.data && res.data.questionnaires) {
                const list = res.data.questionnaires.map(item => ({
                    ...item,
                    createdAt: item.createdAt ? item.createdAt.substring(0, 10) : ''
                }));
                this.setData({
                    questionnaireList: list
                });
            }
        } catch (e) {
            console.error('Failed to load questionnaires', e);
        } finally {
            this.setData({ loading: false });
        }
    },

    toggleFaq(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({
            expandedFaq: this.data.expandedFaq === id ? '' : id
        });
    },

    loadMore() {
        if (this.data.activeTab === 'faq') {
            this.loadFaq();
        }
    }
}));
