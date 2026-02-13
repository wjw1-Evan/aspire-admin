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
    statusNames: [], // will be set in onShow
    statusIndex: 0,
    loading: false,
    submitting: false,
    i18nTitleKey: 'park.service_category.create'
  },

  onShow() {
    this.updateTranslations();
  },

  updateTranslations() {
    this.setData({
      statusNames: [
        t('common.status_active'),
        t('common.status_inactive')
      ]
    });
    const title = this.data.isEdit ? t('park.service_category.edit') : t('park.service_category.create');
    wx.setNavigationBarTitle({ title });
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true,
        i18nTitleKey: 'park.service_category.edit'
      });
      this.fetchDetail();
    }
    this.updateTranslations();
  },

  // ... existing ...

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.name) {
      wx.showToast({ title: t('park.service_category.input_name'), icon: 'none' });
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
        wx.showToast({ title: t('common.save_success'), icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('Save category failed', err);
      wx.showToast({ title: t('common.save_fail'), icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));