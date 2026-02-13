const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        isEdit: false,
        formData: {
            name: '',
            address: '',
            totalFloors: 0,
            totalArea: 0,
            buildingType: '',
            yearBuilt: new Date().getFullYear(),
            deliveryDate: '',
            description: ''
        },
        loading: false,
        submitting: false
    },

    onLoad(options) {
        if (options.id) {
            this.setData({
                id: options.id,
                isEdit: true
            });
            wx.setNavigationBarTitle({ title: '编辑楼宇' });
            this.fetchDetail();
        } else {
            wx.setNavigationBarTitle({ title: '新建楼宇' });
            // Set default delivery date to today
            const today = new Date().toISOString().split('T')[0];
            this.setData({
                'formData.deliveryDate': today
            });
        }
    },

    async fetchDetail() {
        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/park/buildings/${this.data.id}`,
                method: 'GET'
            });
            if (res.success) {
                const data = res.data;
                this.setData({
                    formData: {
                        name: data.name || '',
                        address: data.address || '',
                        totalFloors: data.totalFloors || 0,
                        totalArea: data.totalArea || 0,
                        buildingType: data.buildingType || '',
                        yearBuilt: data.yearBuilt || new Date().getFullYear(),
                        deliveryDate: data.deliveryDate ? data.deliveryDate.split('T')[0] : '',
                        description: data.description || ''
                    }
                });
            }
        } catch (err) {
            console.error('Fetch building detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    onInputChange(e) {
        const { field } = e.currentTarget.dataset;
        const { value } = e.detail;
        this.setData({
            [`formData.${field}`]: value
        });
    },

    onDateChange(e) {
        this.setData({
            'formData.deliveryDate': e.detail.value
        });
    },

    async handleSubmit() {
        const { formData, isEdit, id } = this.data;

        // Simple validation
        if (!formData.name) {
            wx.showToast({ title: '请输入楼宇名称', icon: 'none' });
            return;
        }

        this.setData({ submitting: true });
        try {
            const url = isEdit ? `/api/park/buildings/${id}` : '/api/park/buildings';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await request({
                url,
                method,
                data: formData
            });

            if (res.success) {
                wx.showToast({ title: '保存成功', icon: 'success' });
                setTimeout(() => {
                    wx.navigateBack();
                }, 1500);
            }
        } catch (err) {
            console.error('Save building failed', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
        } finally {
            this.setData({ submitting: false });
        }
    }
})));
