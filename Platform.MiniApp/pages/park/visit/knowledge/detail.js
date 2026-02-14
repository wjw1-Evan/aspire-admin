const { t, withI18n, getTranslations } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        id: '',
        questionnaire: null,
        questions: [],
        loading: true,
        t: {}
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.loadData(options.id);
        }
    },

    async loadData(id) {
        this.setData({ loading: true });
        try {
            // 1. Get Questionnaire (Try storage first, then API)
            let questionnaire = wx.getStorageSync('view_questionnaire');
            if (!questionnaire || questionnaire.id !== id) {
                // Fallback: fetch list and find
                const res = await request.get('/api/park-management/visit/questionnaires');
                if (res.data && res.data.questionnaires) {
                    questionnaire = res.data.questionnaires.find(q => q.id === id);
                }
            }

            if (!questionnaire) {
                wx.showToast({ title: t('common.empty'), icon: 'none' });
                setTimeout(() => wx.navigateBack(), 1500);
                return;
            }

            // 2. Get All Questions to map details
            const qRes = await request.get('/api/park-management/visit/questions', { page: 1, pageSize: 1000 });
            const allQuestions = (qRes.data && qRes.data.questions) ? qRes.data.questions : [];

            // 3. Map questions
            const questionDetails = (questionnaire.questionIds || []).map(qId => {
                return allQuestions.find(q => q.id === qId);
            }).filter(q => !!q);

            // Format dates
            if (questionnaire.createdAt) {
                questionnaire.createdAt = questionnaire.createdAt.substring(0, 10);
            }

            this.setData({
                questionnaire,
                questions: questionDetails,
                loading: false
            });

            wx.setNavigationBarTitle({
                title: questionnaire.title || t('park.visit.knowledge.questionnaire')
            });

        } catch (e) {
            console.error('Load detail failed', e);
            wx.showToast({ title: t('common.fail'), icon: 'none' });
            this.setData({ loading: false });
        }
    },

    goToEdit() {
        wx.setStorageSync('edit_questionnaire', this.data.questionnaire);
        wx.navigateTo({
            url: './questionnaire-form?id=' + this.data.id
        });
    },

    handleDelete() {
        wx.showModal({
            title: t('common.tips'),
            content: t('park.visit.delete_hint'),
            confirmColor: '#ff4d4f',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        await request.delete(`/api/park-management/visit/questionnaire/${this.data.id}`);
                        wx.showToast({ title: t('common.delete_success') });

                        // Refresh list page
                        const pages = getCurrentPages();
                        const prevPage = pages[pages.length - 2];
                        if (prevPage && prevPage.loadQuestionnaires) {
                            prevPage.loadQuestionnaires();
                        }

                        setTimeout(() => wx.navigateBack(), 1500);
                    } catch (e) {
                        wx.showToast({ title: t('common.fail'), icon: 'none' });
                    }
                }
            }
        });
    }
}));
