const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
  data: {
    id: '',
    isEdit: false,
    formData: {
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      industry: '',
      source: 'Manual',
      intendedArea: 0,
      priority: 'Medium',
      status: 'New'
    },
    sources: ['Manual', 'Referral', 'Website', 'Advertisement'],
    priorities: ['High', 'Medium', 'Low'],
    statuses: ['New', 'Following', 'Converted', 'Closed'],
    loading: false,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑线索' });
      this.fetchDetail();
    } else {
      wx.setNavigationBarTitle({ title: '新建线索' });
    }
  },

  async fetchDetail() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/park/investment/leads/${this.data.id}`,
        method: 'GET'
      });
      if (res.success) {
        const data = res.data;
        this.setData({
          formData: {
            companyName: data.companyName || '',
            contactPerson: data.contactPerson || '',
            phone: data.phone || '',
            email: data.email || '',
            industry: data.industry || '',
            source: data.source || 'Manual',
            intendedArea: data.intendedArea || 0,
            priority: data.priority || 'Medium',
            status: data.status || 'New'
          }
        });
      }
    } catch (err) {
      console.error('Fetch lead detail failed', err);
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

  onPickerChange(e) {
    const { field, range } = e.currentTarget.dataset;
    const index = e.detail.value;
    this.setData({
      [`formData.${field}`]: this.data[range][index]
    });
  },

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.companyName) {
      wx.showToast({ title: '请输入企业名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const url = isEdit ? `/api/park/investment/leads/${id}` : '/api/park/investment/leads';
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
      console.error('Save lead failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));