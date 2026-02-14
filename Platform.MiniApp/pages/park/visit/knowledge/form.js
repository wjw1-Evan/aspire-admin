const { t, withI18n, getTranslations } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        id: '',
        formData: {
            category: '',
            content: '',
            answer: '',
            sortOrder: 0
        },
        categories: ['政策咨询', '物业服务', '政务代办'],
        categoryIndex: 0,
        submitting: false,
        t: {}
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            const editItem = wx.getStorageSync('edit_question');
            if (editItem) {
                this.setData({
                    formData: {
                        category: editItem.category,
                        content: editItem.content,
                        answer: editItem.answer,
                        sortOrder: editItem.sortOrder || 0
                    },
                    categoryIndex: this.data.categories.indexOf(editItem.category) || 0
                });
                wx.removeStorageSync('edit_question');
                wx.setNavigationBarTitle({ title: t('park.visit.knowledge.edit_question') });
            }
        } else {
            wx.setNavigationBarTitle({ title: t('park.visit.knowledge.create_question') });
        }
    },

    onCategoryChange(e) {
        const index = e.detail.value;
        this.setData({
            categoryIndex: index,
            'formData.category': this.data.categories[index]
        });
    },

    async submitForm(e) {
        const { content, answer, sortOrder } = e.detail.value;
        const { category } = this.data.formData;

        if (!content) {
            return wx.showToast({ title: t('park.visit.knowledge.input_content'), icon: 'none' });
        }
        if (!answer) {
            return wx.showToast({ title: t('park.visit.knowledge.input_answer'), icon: 'none' });
        }

        this.setData({ submitting: true });

        try {
            const data = {
                category: category || this.data.categories[0],
                content,
                answer,
                sortOrder: parseInt(sortOrder) || 0
            };

            if (this.data.id) {
                await request.put(`/api/park-management/visit/question/${this.data.id}`, data);
            } else {
                await request.post('/api/park-management/visit/question', data);
            }

            wx.showToast({ title: t('common.save_success') });
            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        } catch (err) {
            wx.showToast({ title: t('common.fail'), icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
}));
