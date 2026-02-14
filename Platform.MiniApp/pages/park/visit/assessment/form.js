const { t, withI18n } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        id: '',
        taskId: '',
        mode: 'create', // create, view
        formData: {
            score: 5,
            comments: ''
        },
        taskInfo: null,
        submitting: false,
        i18nTitleKey: 'park.visit.assessment.form.title'
    },

    onLoad(options) {
        const { id, taskId, mode = 'create' } = options;
        this.setData({ id, taskId, mode });

        if (id) {
            this.loadAssessment(id);
        } else if (taskId) {
            this.loadTaskInfo(taskId);
        }
    },

    async loadAssessment(id) {
        try {
            const res = await request.get(`/api/park-management/visit/assessments`, { id });
            if (res.data && res.data.assessments) {
                const assessment = res.data.assessments.find(a => a.id === id);
                if (assessment) {
                    this.setData({
                        formData: {
                            score: assessment.score,
                            comments: assessment.comments
                        },
                        taskInfo: {
                            title: assessment.taskDescription,
                            tenantName: assessment.visitorName,
                            visitDate: assessment.createdAt
                        }
                    });
                    if (assessment.taskId) {
                        this.loadTaskInfo(assessment.taskId);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load assessment', e);
        }
    },

    async loadTaskInfo(taskId) {
        try {
            const res = await request.get(`/api/park-management/visit/task/${taskId}`);
            if (res.data) {
                this.setData({
                    taskInfo: res.data
                });
            }
        } catch (e) {
            console.error('Failed to load task info', e);
        }
    },

    onScoreChange(e) {
        this.setData({ 'formData.score': e.detail.value });
    },

    onCommentInput(e) {
        this.setData({ 'formData.comments': e.detail.value });
    },

    async handleSubmit(e) {
        if (this.data.mode === 'view') return;

        const { score, comment } = e.detail.value;

        this.setData({ submitting: true });

        try {
            // Check if visitorName exists in taskInfo
            const visitorName = this.data.taskInfo.intervieweeName || this.data.taskInfo.tenantName || 'Unknown';
            const phone = this.data.taskInfo.intervieweePhone || this.data.taskInfo.phone;
            const location = this.data.taskInfo.visitLocation;
            const taskDescription = this.data.taskInfo.title;

            const payload = {
                taskId: this.data.taskId,
                score: parseInt(score || this.data.formData.score),
                comments: comment || this.data.formData.comments,
                visitorName,
                phone,
                location,
                taskDescription
            };

            await request.post('/api/park-management/visit/assessment', payload);

            wx.showToast({
                title: t('common.success'),
                icon: 'success'
            });

            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        } catch (e) {
            console.error('Failed to create assessment', e);
            wx.showToast({
                title: t('common.fail'),
                icon: 'none'
            });
        } finally {
            this.setData({ submitting: false });
        }
    }
}));
