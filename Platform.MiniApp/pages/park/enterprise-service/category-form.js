const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
  data: {
    id: '',
    isEdit: false,
    formData: {
      name: '',
      icon: 'icon-service',
      sort: 0,
      status: 'Active',
      description: ''
    },
    icons: ['icon-service', 'icon-finance', 'icon-legal', 'icon-hr', 'icon-tech', 'icon-marketing', 'icon-policy'],
    iconIndex: 0,
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
      wx.setNavigationBarTitle({ title: '编辑分类' });
      this.fetchDetail();
    } else {
      wx.setNavigationBarTitle({ title: '新建分类' });
    }
  },

  async fetchDetail() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/park/service-categories/${this.data.id}`,
        method: 'GET'
      });
      if (res.success) {
        const data = res.data;
        const iIndex = this.data.icons.indexOf(data.icon);
        const sIndex = this.data.statuses.indexOf(data.status);
        this.setData({
          formData: {
            name: data.name || '',
            icon: data.icon || 'icon-service',
            sort: data.sort || 0,
            status: data.status || 'Active',
            description: data.description || ''
          },
          iconIndex: iIndex > -1 ? iIndex : 0,
          statusIndex: sIndex > -1 ? sIndex : 0
        });
      }
    } catch (err) {
      console.error('Fetch category detail failed', err);
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
    const { field, range, name } = e.currentTarget.dataset;
    const index = e.detail.value;
    this.setData({
      [`${field}Index`]: index,
      [`formData.${name}`]: this.data[range][index]
    });
  },

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const url = isEdit ? `/api/park/service-categories/${id}` : '/api/park/service-categories';
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
      console.error('Save category failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));