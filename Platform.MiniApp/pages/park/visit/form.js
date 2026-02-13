const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        isEdit: false,
        taskId: '',
        formData: {
            taskName: '',
            description: ''
        },
        tenantList: [],
        tenantIndex: 0,
        plannedVisitDate: '',
        priorityOptions: [
            { label: '高', value: 'High' },
            { label: '中', value: 'Medium' },
            { label: '低', value: 'Low' }
        ],
        priorityIndex: 1,
        submitting: false,
        i18nTitleKey: 'park.visit.task_create'
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        this.setData({
            priorityOptions: [
                { label: t('park.visit.priority.high'), value: 'High' },
                { label: t('park.visit.priority.medium'), value: 'Medium' },
                { label: t('park.visit.priority.low'), value: 'Low' }
            ]
        });
        // We set title manually or rely on i18nTitleKey if simple
        const title = this.data.isEdit ? t('park.visit.task_edit') : t('park.visit.task_create');
        wx.setNavigationBarTitle({ title });
    },

    onLoad(options) {
        this.loadTenants();
        if (options.id) {
            this.setData({
                isEdit: true,
                taskId: options.id,
                i18nTitleKey: 'park.visit.task_edit'
            });
            this.fetchTaskDetail(options.id);
        }
        this.updateTranslations();
    },

    // ... existing ...

    async handleSubmit(e) {
        const values = e.detail.value;
        if (!values.taskName) {
            wx.showToast({ title: t('park.visit.task_input_name'), icon: 'none' });
            return;
        }

        const tenantId = this.data.tenantList[this.data.tenantIndex].id;

        this.setData({ submitting: true });
        try {
            const url = this.data.isEdit ? `/api/park-management/visit/task/${this.data.taskId}` : '/api/park-management/visit/task';
            const method = this.data.isEdit ? 'PUT' : 'POST';

            const res = await request({
                url,
                method,
                data: {
                    taskName: values.taskName,
                    description: values.description,
                    tenantId: tenantId || null,
                    priority: this.data.priorityOptions[this.data.priorityIndex].value,
                    plannedVisitDate: this.data.plannedVisitDate ? this.data.plannedVisitDate + 'T00:00:00Z' : null,
                    status: this.data.isEdit ? undefined : 'Pending'
                }
            });

            if (res.success) {
                wx.showToast({ title: t('common.save_success') });
                setTimeout(() => {
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage) {
                        if (prevPage.fetchTasks) {
                            prevPage.setData({ page: 1, tasks: [] }, () => {
                                prevPage.fetchTasks(true);
                            });
                        }
                        if (prevPage.fetchTaskDetail) {
                            prevPage.fetchTaskDetail();
                        }
                    }
                    wx.navigateBack();
                }, 1500);
            }
        } catch (err) {
            console.error('Submit visit task failed', err);
            wx.showToast({ title: t('common.submit_fail'), icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
})));
