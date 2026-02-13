const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
  data: {
    id: '',
    isEdit: false,
    buildings: [],
    buildingIndex: -1,
    formData: {
      buildingId: '',
      unitNumber: '',
      floor: 1,
      area: 0,
      monthlyRent: 0,
      unitType: 'Office',
      description: '',
      facilities: []
    },
    unitTypes: ['Office', 'Retail', 'Warehouse'],
    unitTypeNames: [], // will be set in onShow
    unitTypeIndex: 0,
    loading: false,
    submitting: false,
    i18nTitleKey: 'park.asset.unit_create'
  },

  onShow() {
    this.updateTranslations();
  },

  updateTranslations() {
    this.setData({
      unitTypeNames: [
        t('park.asset.type.office'),
        t('park.asset.type.retail'),
        t('park.asset.type.warehouse')
      ]
    });
    const title = this.data.isEdit ? t('park.asset.unit_edit') : t('park.asset.unit_create');
    wx.setNavigationBarTitle({ title });
  },

  onLoad(options) {
    this.fetchBuildings();
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true,
        i18nTitleKey: 'park.asset.unit_edit'
      });
      this.fetchDetail();
    } else {
      if (options.buildingId) {
        this.setData({
          'formData.buildingId': options.buildingId
        });
      }
    }
    this.updateTranslations();
  },

  // ... existing methods

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.buildingId) {
      wx.showToast({ title: t('park.asset.unit_select_building'), icon: 'none' });
      return;
    }
    if (!formData.unitNumber) {
      wx.showToast({ title: t('park.asset.unit_input_no'), icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const url = isEdit ? `/api/park/properties/${id}` : '/api/park/properties';
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
      console.error('Save unit failed', err);
      wx.showToast({ title: t('common.save_fail'), icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));