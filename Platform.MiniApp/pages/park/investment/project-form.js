const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
  data: {
    id: '',
    isEdit: false,
    leads: [],
    leadIndex: -1,
    formData: {
      name: '',
      leadId: '',
      status: 'Negotiating',
      requirements: ''
    },
    statuses: ['Negotiating', 'Signing', 'Completed', 'Dropped'],
    statusNames: ['商务洽谈', '合同签署', '已落地', '已丢弃'],
    statusIndex: 0,
    loading: false,
    submitting: false
  },

  onLoad(options) {
    this.fetchLeads();
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑项目' });
      this.fetchDetail();
    } else {
      wx.setNavigationBarTitle({ title: '新建项目' });
      if (options.leadId) {
        this.setData({
          'formData.leadId': options.leadId
        });
      }
    }
  },

  async fetchLeads() {
    try {
      const res = await request({
        url: '/api/park/investment/leads/list',
        method: 'POST',
        data: { page: 1, pageSize: 100 }
      });
      if (res.success) {
        const leads = res.data.leads || [];
        this.setData({ leads });
        this.updateLeadIndex();
      }
    } catch (err) {
      console.error('Fetch leads failed', err);
    }
  },

  updateLeadIndex() {
    const { leads, formData } = this.data;
    if (formData.leadId && leads.length > 0) {
      const index = leads.findIndex(l => l.id === formData.leadId);
      this.setData({ leadIndex: index });
    }
  },

  async fetchDetail() {
    this.setData({ loading: true });
    try {
      const res = await request({
        url: `/api/park/investment/projects/${this.data.id}`,
        method: 'GET'
      });
      if (res.success) {
        const data = res.data;
        const sIndex = this.data.statuses.indexOf(data.status);
        this.setData({
          formData: {
            name: data.name || '',
            leadId: data.leadId || '',
            status: data.status || 'Negotiating',
            requirements: data.requirements || ''
          },
          statusIndex: sIndex > -1 ? sIndex : 0
        });
        this.updateLeadIndex();
      }
    } catch (err) {
      console.error('Fetch project detail failed', err);
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

  onLeadChange(e) {
    const index = e.detail.value;
    const lead = this.data.leads[index];
    this.setData({
      leadIndex: index,
      'formData.leadId': lead.id
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
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const url = isEdit ? `/api/park/investment/projects/${id}` : '/api/park/investment/projects';
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
      console.error('Save project failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
})));