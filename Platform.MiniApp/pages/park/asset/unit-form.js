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
    unitTypeNames: ['写字楼', '零售', '仓库'],
    unitTypeIndex: 0,
    loading: false,
    submitting: false
  },

  onLoad(options) {
    this.fetchBuildings();
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑单元' });
      this.fetchDetail();
    } else {
      wx.setNavigationBarTitle({ title: '新建单元' });
      if (options.buildingId) {
        this.setData({
          'formData.buildingId': options.buildingId
        });
      }
    }
  },

  async fetchBuildings() {
    try {
      const res = await request({
        url: '/api/park/buildings/list',
        method: 'POST',
        data: { page: 1, pageSize: 100 }
      });
      if (res.success) {
        const buildings = res.data.buildings || [];
        this.setData({ buildings });
        this.updateBuildingIndex();
      }
    } catch (err) {
      console.error('Fetch buildings failed', err);
    }
  },

  updateBuildingIndex() {
    const { buildings, formData } = this.data;
    if (formData.buildingId && buildings.length > 0) {
      const index = buildings.findIndex(b => b.id === formData.buildingId);
      this.setData({ buildingIndex: index });
    }
  },

  async fetchDetail() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/park/properties/${this.data.id}`,
        method: 'GET'
      });
      if (res.success) {
        const data = res.data;
        const typeIndex = this.data.unitTypes.indexOf(data.unitType);
        this.setData({
          formData: {
            buildingId: data.buildingId || '',
            unitNumber: data.unitNumber || '',
            floor: data.floor || 1,
            area: data.area || 0,
            monthlyRent: data.monthlyRent || 0,
            unitType: data.unitType || 'Office',
            description: data.description || '',
            facilities: data.facilities || []
          },
          unitTypeIndex: typeIndex > -1 ? typeIndex : 0
        });
        this.updateBuildingIndex();
      }
    } catch (err) {
      console.error('Fetch unit detail failed', err);
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

  onBuildingChange(e) {
    const index = e.detail.value;
    const building = this.data.buildings[index];
    this.setData({
      buildingIndex: index,
      'formData.buildingId': building.id
    });
  },

  onTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      unitTypeIndex: index,
      'formData.unitType': this.data.unitTypes[index]
    });
  },

  async handleSubmit() {
    const { formData, isEdit, id } = this.data;

    if (!formData.buildingId) {
      wx.showToast({ title: '请选择楼宇', icon: 'none' });
      return;
    }
    if (!formData.unitNumber) {
      wx.showToast({ title: '请输入房号', icon: 'none' });
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
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('Save unit failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));