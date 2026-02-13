const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
  data: {
    id: '',
    isEdit: false,
    formData: {
      name: '',
      contactPerson: '',
      phone: '',
      industry: '',
      unifySocialCreditCode: '',
      status: 'Active',
      address: ''
    },
    statuses: ['Active', 'InActive'],
    statusNames: ['正常', '停用'],
    statusIndex: 0,
    loading: false,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑租户' });
      this.fetchDetail();
    } else {
      wx.setNavigationBarTitle({ title: '新建租户' });
    }
  },

  async fetchDetail() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/park/tenants/${this.data.id}`,
        method: 'GET'
      });
      if (res.success) {
        const data = res.data;
        const sIndex = this.data.statuses.indexOf(data.status);
        this.setData({
          formData: {
            name: data.name || '',
            contactPerson: data.contactPerson || '',
            phone: data.phone || '',
            industry: data.industry || '',
            unifySocialCreditCode: data.unifySocialCreditCode || '',
            status: data.status || 'Active',
            address: data.address || ''
          },
          statusIndex: sIndex > -1 ? sIndex : 0
        });
      }
    } catch (err) {
      console.error('Fetch tenant detail failed', err);
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

  onStatusChange(e) {
    const index = e.detail.value;
    this.setData({
      statusIndex: index,
      'formData.status': this.data.statuses[index]
    });
  },

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.name) {
      wx.showToast({ title: '请输入租户名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const url = isEdit ? `/api/park/tenants/${id}` : '/api/park/tenants';
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
      console.error('Save tenant failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));