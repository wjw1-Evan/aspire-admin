const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');

Page(withAuth({
    data: {
        id: '',
        lead: null,
        loading: false
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchDetail();
        }
    },

    onShow() {
        if (this.data.id) {
            this.fetchDetail();
        }
    },

    async fetchDetail() {
        if (this.data.loading) return;
        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/park/investment/leads/${this.data.id}`,
                method: 'GET'
            });
            if (res.success) {
                const lead = res.data;
                // Format dates
                if (lead.createdAt) {
                    lead.createdAt = lead.createdAt.replace('T', ' ').split('.')[0];
                }
                if (lead.nextFollowUpDate) {
                    lead.nextFollowUpDate = lead.nextFollowUpDate.split('T')[0];
                }
                this.setData({ lead });
                wx.setNavigationBarTitle({ title: res.data.companyName || '线索详情' });
            }
        } catch (err) {
            console.error('Fetch lead detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    goToEdit() {
        wx.navigateTo({
            url: `/pages/park/investment/lead-form?id=${this.data.id}`
        });
    },

    handleDelete() {
        wx.showModal({
            title: '确认删除',
            content: '确定要删除该招商线索吗？',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/park/investment/leads/${this.data.id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: '删除成功', icon: 'success' });
                            setTimeout(() => wx.navigateBack(), 1500);
                        }
                    } catch (err) {
                        console.error('Delete lead failed', err);
                    }
                }
            }
        });
    },

    callPhone() {
        if (this.data.lead && this.data.lead.phone) {
            wx.makePhoneCall({
                phoneNumber: this.data.lead.phone
            });
        }
    },

    copyEmail() {
        if (this.data.lead && this.data.lead.email) {
            wx.setClipboardData({
                data: this.data.lead.email,
                success: () => {
                    wx.showToast({ title: '邮箱已复制' });
                }
            });
        }
    }
}));
