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
            this.fetchLeadDetail();
        }
    },

    async fetchLeadDetail() {
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
                wx.setNavigationBarTitle({ title: lead.companyName });
            }
        } catch (err) {
            console.error('Fetch lead detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
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
