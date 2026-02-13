const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');
const { t, withI18n } = require('../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        statusOptions: [],
        statusIndex: 0,
        priorityOptions: [],
        priorityIndex: 1,
        startDate: '',
        endDate: '',
        submitting: false,
        isEdit: false,
        projectId: '',
        formData: {
            name: '',
            description: '',
            budget: ''
        },
        t: {}
    },

    onShow() {
        this.updateTranslations();
    },

    updateTranslations() {
        const statusOptions = [
            { label: t('project.status.planning'), value: 0 },
            { label: t('project.status.in_progress'), value: 1 },
            { label: t('project.status.paused'), value: 2 },
            { label: t('project.status.completed'), value: 3 },
            { label: t('project.status.cancelled'), value: 4 }
        ];
        const priorityOptions = [
            { label: t('project.priority.low'), value: 0 },
            { label: t('project.priority.medium'), value: 1 },
            { label: t('project.priority.high'), value: 2 }
        ];
        this.setData({
            t: {
                'title': t('project.create.title'),
                'name': t('project.name'),
                'description': t('common.description'),
                'status': t('common.status'),
                'priority': t('common.priority'),
                'start_date': t('project.start_date'),
                'end_date': t('project.end_date'),
                'budget': t('project.budget'),
                'submit': t('common.submit')
            },
            statusOptions,
            priorityOptions
        });
        wx.setNavigationBarTitle({ title: this.data.isEdit ? '编辑项目' : t('project.create.title') });
    },

    onLoad(options) {
        if (options.id) {
            this.setData({
                isEdit: true,
                projectId: options.id
            });
            this.fetchProjectDetail(options.id);
        }
        this.updateTranslations();
    },

    async fetchProjectDetail(id) {
        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/project/${id}`,
                method: 'GET'
            });
            if (res.success) {
                const project = res.data;

                // Find indices for pickers
                const statusIndex = this.data.statusOptions.findIndex(s => s.value === project.status);
                const priorityIndex = this.data.priorityOptions.findIndex(p => p.value === project.priority);

                this.setData({
                    'formData.name': project.name,
                    'formData.description': project.description || '',
                    'formData.budget': project.budget || '',
                    statusIndex: statusIndex > -1 ? statusIndex : 0,
                    priorityIndex: priorityIndex > -1 ? priorityIndex : 1,
                    startDate: project.startDate ? project.startDate.split('T')[0] : '',
                    endDate: project.endDate ? project.endDate.split('T')[0] : ''
                });
            }
        } catch (err) {
            console.error('Fetch project detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onStatusChange(e) {
        this.setData({ statusIndex: e.detail.value });
    },

    onPriorityChange(e) {
        this.setData({ priorityIndex: e.detail.value });
    },

    onStartDateChange(e) {
        this.setData({ startDate: e.detail.value });
    },

    onEndDateChange(e) {
        this.setData({ endDate: e.detail.value });
    },

    async handleSubmit(e) {
        const values = e.detail.value;
        if (!values.name) {
            wx.showToast({ title: t('project.name_required'), icon: 'none' });
            return;
        }

        this.setData({ submitting: true });
        try {
            const url = this.data.isEdit ? `/api/project/${this.data.projectId}` : '/api/project';
            const method = this.data.isEdit ? 'PUT' : 'POST';
            const data = {
                name: values.name,
                description: values.description,
                status: this.data.statusOptions[this.data.statusIndex].value,
                priority: this.data.priorityOptions[this.data.priorityIndex].value,
                startDate: this.data.startDate ? (this.data.startDate.includes('T') ? this.data.startDate : this.data.startDate + 'T00:00:00Z') : null,
                endDate: this.data.endDate ? (this.data.endDate.includes('T') ? this.data.endDate : this.data.endDate + 'T23:59:59Z') : null,
                budget: values.budget ? parseFloat(values.budget) : null
            };

            const res = await request({
                url,
                method,
                data
            });

            if (res.success) {
                wx.showToast({ title: this.data.isEdit ? '修改成功' : t('project.create.success') });
                setTimeout(() => {
                    const pages = getCurrentPages();
                    const prevPage = pages[pages.length - 2];
                    if (prevPage) {
                        if (prevPage.fetchProjects) {
                            prevPage.setData({ page: 1, projects: [] }, () => {
                                prevPage.fetchProjects(true);
                            });
                        }
                        if (prevPage.fetchProjectDetail) {
                            prevPage.fetchProjectDetail();
                        }
                    }
                    wx.navigateBack();
                }, 1500);
            }
        } catch (err) {
            console.error('Create project failed', err);
            wx.showToast({ title: t('project.create.failed'), icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
})));
