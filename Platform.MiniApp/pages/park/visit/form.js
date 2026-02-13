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
        submitting: false
    },

    onLoad(options) {
        this.loadTenants();
        if (options.id) {
            this.setData({
                isEdit: true,
                taskId: options.id
            });
            wx.setNavigationBarTitle({ title: '编辑走访任务' });
            this.fetchTaskDetail(options.id);
        } else {
            wx.setNavigationBarTitle({ title: '创建走访任务' });
        }
    },

    async loadTenants() {
        try {
            const res = await request({
                url: '/api/park-management/tenants',
                method: 'GET',
                data: { page: 1, pageSize: 100 }
            });
            if (res.success) {
                const list = [{ name: '请选择', id: '' }, ...(res.data.tenants || [])];
                this.setData({ tenantList: list }, () => {
                    this.matchPickerIndices();
                });
            }
        } catch (err) {
            console.error('Load tenants failed', err);
        }
    },

    async fetchTaskDetail(id) {
        try {
            const res = await request({
                url: `/api/park-management/visit/task/${id}`,
                method: 'GET'
            });
            if (res.success) {
                const task = res.data;
                const priorityIndex = this.data.priorityOptions.findIndex(p => p.value === task.priority);

                this.setData({
                    'formData.taskName': task.taskName,
                    'formData.description': task.description || '',
                    priorityIndex: priorityIndex > -1 ? priorityIndex : 1,
                    plannedVisitDate: task.plannedVisitDate ? task.plannedVisitDate.split('T')[0] : ''
                });

                this._pendingTenantId = task.tenantId;
                this.matchPickerIndices();
            }
        } catch (err) {
            console.error('Fetch visit detail failed', err);
        }
    },

    matchPickerIndices() {
        if (this._pendingTenantId && this.data.tenantList.length > 1) {
            const index = this.data.tenantList.findIndex(t => t.id === this._pendingTenantId);
            if (index > -1) this.setData({ tenantIndex: index });
            this._pendingTenantId = null;
        }
    },

    onTenantChange(e) { this.setData({ tenantIndex: e.detail.value }); },
    onDateChange(e) { this.setData({ plannedVisitDate: e.detail.value }); },
    onPriorityChange(e) { this.setData({ priorityIndex: e.detail.value }); },

    async handleSubmit(e) {
        const values = e.detail.value;
        if (!values.taskName) {
            wx.showToast({ title: '请输入任务名称', icon: 'none' });
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
                wx.showToast({ title: this.data.isEdit ? '保存成功' : '创建成功' });
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
            wx.showToast({ title: '提交失败', icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
})));
