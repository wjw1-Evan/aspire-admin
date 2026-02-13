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
    paymentCycleNames: [], // set in onShow
    paymentCycleIndex: 0,
    statuses: ['Active', 'Expired', 'Terminated'],
    statusNames: [], // set in onShow
    statusIndex: 0,
    loading: false,
    submitting: false,
    i18nTitleKey: 'park.contract.create_title'
  },

  onShow() {
    this.updateTranslations();
  },

  updateTranslations() {
    this.setData({
      paymentCycleNames: [
        t('park.contract.cycle.monthly'),
        t('park.contract.cycle.quarterly'),
        t('park.contract.cycle.semi'),
        t('park.contract.cycle.annual')
      ],
      statusNames: [
        t('park.contract.status_label.active'),
        t('park.contract.status_label.expired'),
        t('park.contract.status_label.terminated')
      ]
    });
    const title = this.data.isEdit ? t('park.contract.edit_title') : t('park.contract.create_title');
    wx.setNavigationBarTitle({ title });
  },

  onLoad(options) {
    this.fetchTenants();
    this.fetchUnits();
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true,
        i18nTitleKey: 'park.contract.edit_title'
      });
      this.fetchDetail();
    } else {
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
    this.updateTranslations();
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
      wx.showToast({ title: t('park.contract.input_number'), icon: 'none' });
      return;
    }
    if (!formData.tenantId) {
      wx.showToast({ title: t('park.contract.select_tenant_toast'), icon: 'none' });
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
        wx.showToast({ title: t('common.save_success'), icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('Save contract failed', err);
      wx.showToast({ title: t('common.save_fail'), icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));