const { t, withI18n, getTranslations } = require('../../../../utils/i18n');
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
        // 更新翻译
        const translations = getTranslations();
        this.setData({
            t: {
                ...translations,
                'title': t('park.visit.knowledge.list.title'),
                'faq': t('park.visit.knowledge.faq'),
                'questionnaire': t('park.visit.knowledge.questionnaire'),
                'all': t('common.all'),
                'empty': t('common.empty'),
                'loading': t('common.loading'),
                'noMore': t('common.no_more'),
                'questions': t('task.detail.title')
            }
        });

        // 刷新列表（如果是从表单页返回）
        if (this.data.activeTab === 'faq') {
            this.setData({ faqList: [], faqPage: 1, hasMoreFaq: true }, () => {
                this.loadFaq();
            });
        } else {
            this.loadQuestionnaires();
        }
    },

    onLoad() {
        // 初始加载由 onShow 处理
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
                    hasMoreFaq: (this.data.faqList.length + res.data.questions.length) < res.data.total
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
    },

    goToCreate() {
        if (this.data.activeTab === 'faq') {
            wx.navigateTo({
                url: './form'
            });
        } else {
            wx.navigateTo({
                url: './questionnaire-form'
            });
        }
    },

    goToEdit(e) {
        const item = e.currentTarget.dataset.item;
        wx.setStorageSync('edit_question', item);
        wx.navigateTo({
            url: './form?id=' + item.id
        });
    },

    goToEditQuestionnaire(e) {
        const item = e.currentTarget.dataset.item;
        wx.setStorageSync('edit_questionnaire', item);
        wx.navigateTo({
            url: './questionnaire-form?id=' + item.id
        });
    },

    async deleteQuestion(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: t('common.tips'),
            content: t('park.visit.knowledge.delete_hint'),
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await request.delete(`/api/park-management/visit/question/${id}`);
                        wx.showToast({ title: t('common.delete_success') });
                        this.setData({ faqList: [], faqPage: 1, hasMoreFaq: true }, () => {
                            this.loadFaq();
                        });
                    } catch (e) {
                        wx.showToast({ title: t('common.fail'), icon: 'none' });
                    }
                }
            }
        });
    },

    async deleteQuestionnaire(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: t('common.tips'),
            content: t('park.visit.delete_hint'),
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await request.delete(`/api/park-management/visit/questionnaire/${id}`);
                        wx.showToast({ title: t('common.delete_success') });
                        this.setData({ questionnaireList: [] }, () => {
                            this.loadQuestionnaires();
                        });
                    } catch (e) {
                        wx.showToast({ title: t('common.fail'), icon: 'none' });
                    }
                }
            }
        });
    },

    goToQuestionnaireDetail(e) {
        const id = e.currentTarget.dataset.id;
        const item = this.data.questionnaireList.find(q => q.id === id);
        if (item) {
            wx.setStorageSync('view_questionnaire', item);
        }
        wx.navigateTo({
            url: './detail?id=' + id
        });
    }
}));
