const { request } = require('../../../utils/request');
const { withAuth } = require('../../../utils/auth');
const { t, withI18n } = require('../../../utils/i18n');

Page(withAuth(withI18n({
    data: {
        id: '',
        task: null,
        loading: false,
        i18nTitleKey: 'common.detail'
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchDetail();
        }
    },

    async fetchDetail() {
        if (this.data.loading) return;

        this.setData({ loading: true });
        try {
            const res = await request({
                url: `/api/park-management/visit/task/${this.data.id}`,
                method: 'GET'
            });

            if (res.success) {
                this.setData({ task: res.data });
                wx.setNavigationBarTitle({ title: res.data.taskName });
            }
        } catch (err) {
            console.error('Fetch visit detail failed', err);
        } finally {
            this.setData({ loading: false });
        }
    },

    goToEdit() {
        const id = this.data.task && this.data.task.id ? this.data.task.id : this.data.id;
        wx.navigateTo({
            url: `/pages/park/visit/form?id=${id}`
        });
    },

    async handleDelete() {
        wx.showModal({
            title: t('common.confirm_delete'),
            content: t('park.visit.delete_hint'),
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const id = this.data.task && this.data.task.id ? this.data.task.id : this.data.id;
                        const delRes = await request({
                            url: `/api/park-management/visit/task/${id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: t('common.delete_success') });
                            setTimeout(() => {
                                const pages = getCurrentPages();
                                const prevPage = pages[pages.length - 2];
                                if (prevPage && prevPage.fetchTasks) {
                                    prevPage.setData({ page: 1, tasks: [] }, () => {
                                        prevPage.fetchTasks(true);
                                    });
                                }
                                wx.navigateBack();
                            }, 1500);
                        }
                    } catch (err) {
                        console.error('Delete visit task failed', err);
                        wx.showToast({ title: t('common.fail'), icon: 'none' });
                    }
                }
            }
        });
    }
})));
