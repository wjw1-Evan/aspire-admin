const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
  data: {
    id: '',
    isEdit: false,
    tenants: [],
    tenantIndex: -1,
    units: [],
    unitIndex: -1,
    formData: {
      contractNumber: '',
      tenantId: '',
      propertyUnitId: '',
      startDate: '',
      endDate: '',
      monthlyRent: 0,
      deposit: 0,
      paymentCycle: 'Monthly',
      status: 'Active'
    },
    paymentCycles: ['Monthly', 'Quarterly', 'SemiAnnually', 'Annually'],
    paymentCycleNames: ['月付', '季付', '半年付', '年付'],
    paymentCycleIndex: 0,
    statuses: ['Active', 'Expired', 'Terminated'],
    statusNames: ['执行中', '已到期', '已解除'],
    statusIndex: 0,
    loading: false,
    submitting: false
  },

  onLoad(options) {
    this.fetchTenants();
    this.fetchUnits();
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑合同' });
      this.fetchDetail();
    } else {
      wx.setNavigationBarTitle({ title: '新建合同' });
      if (options.tenantId) {
        this.setData({
          'formData.tenantId': options.tenantId
        });
      }
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      this.setData({
        'formData.startDate': today,
        'formData.endDate': nextYear.toISOString().split('T')[0]
      });
    }
  },

  async fetchTenants() {
    try {
      const res = await request({
        url: '/api/park/tenants/list',
        method: 'POST',
        data: { page: 1, pageSize: 100 }
      });
      if (res.success) {
        const tenants = res.data.tenants || [];
        this.setData({ tenants });
        this.updateTenantIndex();
      }
    } catch (err) {
      console.error('Fetch tenants failed', err);
    }
  },

  async fetchUnits() {
    try {
      const res = await request({
        url: '/api/park/properties/list',
        method: 'POST',
        data: { page: 1, pageSize: 100, status: 'Available' }
      });
      if (res.success) {
        const units = res.data.units || [];
        // If editing, also include the current unit
        this.setData({ units });
        this.updateUnitIndex();
      }
    } catch (err) {
      console.error('Fetch units failed', err);
    }
  },

  updateTenantIndex() {
    const { tenants, formData } = this.data;
    if (formData.tenantId && tenants.length > 0) {
      const index = tenants.findIndex(t => t.id === formData.tenantId);
      this.setData({ tenantIndex: index });
    }
  },

  updateUnitIndex() {
    const { units, formData } = this.data;
    if (formData.propertyUnitId && units.length > 0) {
      const index = units.findIndex(u => u.id === formData.propertyUnitId);
      this.setData({ unitIndex: index });
    }
  },

  async fetchDetail() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/park/contracts/${this.data.id}`,
        method: 'GET'
      });
      if (res.success) {
        const data = res.data;
        const pcIndex = this.data.paymentCycles.indexOf(data.paymentCycle);
        const sIndex = this.data.statuses.indexOf(data.status);
        this.setData({
          formData: {
            contractNumber: data.contractNumber || '',
            tenantId: data.tenantId || '',
            propertyUnitId: data.propertyUnitId || '',
            startDate: data.startDate ? data.startDate.split('T')[0] : '',
            endDate: data.endDate ? data.endDate.split('T')[0] : '',
            monthlyRent: data.monthlyRent || 0,
            deposit: data.deposit || 0,
            paymentCycle: data.paymentCycle || 'Monthly',
            status: data.status || 'Active'
          },
          paymentCycleIndex: pcIndex > -1 ? pcIndex : 0,
          statusIndex: sIndex > -1 ? sIndex : 0
        });
        this.updateTenantIndex();
        this.updateUnitIndex();
      }
    } catch (err) {
      console.error('Fetch contract detail failed', err);
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
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onTenantChange(e) {
    const index = e.detail.value;
    const tenant = this.data.tenants[index];
    this.setData({
      tenantIndex: index,
      'formData.tenantId': tenant.id
    });
  },

  onUnitChange(e) {
    const index = e.detail.value;
    const unit = this.data.units[index];
    this.setData({
      unitIndex: index,
      'formData.propertyUnitId': unit.id,
      'formData.monthlyRent': unit.monthlyRent // Default rent from unit
    });
  },

  onPickerChange(e) {
    const { field, range } = e.currentTarget.dataset;
    const { name } = e.currentTarget.dataset;
    const index = e.detail.value;
    this.setData({
      [`${field}Index`]: index,
      [`formData.${name}`]: this.data[range][index]
    });
  },

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.contractNumber) {
      wx.showToast({ title: '请输入合同编号', icon: 'none' });
      return;
    }
    if (!formData.tenantId) {
      wx.showToast({ title: '请选择租户', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const url = isEdit ? `/api/park/contracts/${id}` : '/api/park/contracts';
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
      console.error('Save contract failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));