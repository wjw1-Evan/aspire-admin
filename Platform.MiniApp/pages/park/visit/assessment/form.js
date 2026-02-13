const { t, withI18n } = require('../../../../utils/i18n');
const request = require('../../../../utils/request');

Page(withI18n({
    data: {
        id: '',
        taskId: '',
        mode: 'create', // create, view
        formData: {
            score: 100,
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
            // Assuming a get-by-id endpoint exists or filtering the list
            // For now, let's look for it in the list or fetch it if possible
            // ParkVisitController doesn't have a GetAssessmentById, so we might need to fetch the list and find it
            // or assume the task info is already in the DTO
            const res = await request.get('/api/park-management/visit/assessments', { search: id });
            if (res.data && res.data.assessments && res.data.assessments.length > 0) {
                const assessment = res.data.assessments.find(a => a.id === id);
                if (assessment) {
                    this.setData({
                        formData: {
                            score: assessment.score,
                            comments: assessment.comments
                        },
                        taskInfo: {
                            title: assessment.taskDescription,
                            visitorName: assessment.visitorName,
                            location: assessment.location
                        }
                    });
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

    async handleSubmit() {
        if (this.data.mode === 'view') return;

        this.setData({ submitting: true });

        try {
            const payload = {
                taskId: this.data.taskId,
                score: parseInt(this.data.formData.score),
                comments: this.data.formData.comments,
                // The backend VisitAssessmentDto has more fields, but usually they are mapped from the Task on server side
                // If not, we might need to send them. Assuming TaskId is enough for the service to map.
                visitorName: this.data.taskInfo.managerName || this.data.taskInfo.visitor,
                location: this.data.taskInfo.visitLocation,
                taskDescription: this.data.taskInfo.title
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
