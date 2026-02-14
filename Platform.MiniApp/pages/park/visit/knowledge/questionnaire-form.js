const request = require('../../../../utils/request');
const { t, getTranslations } = require('../../../../utils/i18n');

Page({
    data: {
        t: {},
        isEdit: false,
        id: '',
        title: '',
        purpose: '',
        sortOrder: 0,
        allQuestions: [],
        selectedQuestions: [], // Full objects for sorted display
        selectedQuestionIds: [],
        selectedText: ''
    },

    onLoad(options) {
        this.setData({ t: getTranslations() });

        if (options.id) {
            const editData = wx.getStorageSync('edit_questionnaire');
            if (editData && editData.id === options.id) {
                this.setData({
                    isEdit: true,
                    id: options.id,
                    title: editData.title || '',
                    purpose: editData.purpose || '',
                    sortOrder: editData.sortOrder || 0,
                    selectedQuestionIds: editData.questionIds || []
                });
                wx.setNavigationBarTitle({
                    title: t('park.visit.knowledge.edit_questionnaire')
                });
            }
        } else {
            wx.setNavigationBarTitle({
                title: t('park.visit.knowledge.create_questionnaire')
            });
        }

        this.loadQuestions();
    },

    async loadQuestions() {
        try {
            wx.showLoading({ title: t('common.loading') });
            const res = await request.get('/api/park-management/visit/questions', { page: 1, pageSize: 1000 });
            const questions = (res.data && res.data.questions) ? res.data.questions : [];

            this.setData({ allQuestions: questions });
            this.refreshSelection(this.data.selectedQuestionIds);
        } catch (e) {
            console.error('Load questions failed', e);
            wx.showToast({ title: t('common.fail'), icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    },

    refreshSelection(selectedIds) {
        const { allQuestions } = this.data;

        // 1. Update checkbox state in allQuestions
        const updatedAll = allQuestions.map(q => ({
            ...q,
            selected: selectedIds.includes(q.id)
        }));

        // 2. Derive sorted selectedQuestions list based on the order in selectedIds
        const selectedQuestions = [];
        selectedIds.forEach(id => {
            const q = allQuestions.find(item => item.id === id);
            if (q) selectedQuestions.push(q);
        });

        this.setData({
            allQuestions: updatedAll,
            selectedQuestionIds: selectedIds,
            selectedQuestions
        });
        this.updateSelectedText();
    },

    onTitleInput(e) {
        this.setData({ title: e.detail.value });
    },

    onPurposeInput(e) {
        this.setData({ purpose: e.detail.value });
    },

    onSortOrderInput(e) {
        this.setData({ sortOrder: parseInt(e.detail.value) || 0 });
    },

    onQuestionChange(e) {
        const newIds = e.detail.value;
        const oldIds = this.data.selectedQuestionIds;

        // Preserve order for already selected ones, append new ones
        let finalIds = oldIds.filter(id => newIds.includes(id));
        const addedIds = newIds.filter(id => !oldIds.includes(id));
        finalIds = finalIds.concat(addedIds);

        this.refreshSelection(finalIds);
    },

    moveUp(e) {
        const index = e.currentTarget.dataset.index;
        if (index === 0) return;

        const ids = [...this.data.selectedQuestionIds];
        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];

        this.refreshSelection(ids);
    },

    moveDown(e) {
        const index = e.currentTarget.dataset.index;
        if (index === this.data.selectedQuestionIds.length - 1) return;

        const ids = [...this.data.selectedQuestionIds];
        [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];

        this.refreshSelection(ids);
    },

    updateSelectedText() {
        const count = this.data.selectedQuestionIds.length;
        let text = t('park.visit.knowledge.selected_count').replace('{count}', count);
        this.setData({ selectedText: text });
    },

    async submit() {
        const { title, purpose, selectedQuestionIds, isEdit, id, sortOrder } = this.data;

        if (!title.trim()) {
            wx.showToast({ title: t('common.please_input') + ' ' + t('park.visit.knowledge.questionnaire_title'), icon: 'none' });
            return;
        }

        if (selectedQuestionIds.length === 0) {
            wx.showToast({ title: t('park.visit.knowledge.no_questions_selected'), icon: 'none' });
            return;
        }

        try {
            wx.showLoading({ title: t('common.loading') });
            const data = {
                title,
                purpose,
                questionIds: selectedQuestionIds,
                sortOrder
            };

            if (isEdit) {
                await request.put(`/api/park-management/visit/questionnaire/${id}`, data);
            } else {
                await request.post('/api/park-management/visit/questionnaire', data);
            }

            wx.showToast({ title: t('common.success') });

            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage) {
                prevPage.setData({ activeTab: 'questionnaire' });
            }

            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        } catch (e) {
            console.error('Submit questionnaire failed', e);
            wx.showToast({ title: t('common.fail'), icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    }
});
