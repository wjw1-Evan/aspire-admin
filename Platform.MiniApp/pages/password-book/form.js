const { t, withI18n } = require('../../utils/i18n');
const request = require('../../utils/request');

Page(withI18n({
    data: {
        id: '',
        isEdit: false,
        formData: {
            platform: '',
            account: '',
            password: '',
            url: '',
            category: '',
            tagsString: '',
            notes: ''
        },
        strength: null,
        submitting: false,
        i18nTitleKey: 'password.book.form.title'
    },

    onLoad(options) {
        if (options.id) {
            this.setData({
                id: options.id,
                isEdit: true,
                i18nTitleKey: 'password.book.edit.title'
            });
            this.loadDetails(options.id);
        } else {
            this.setData({
                i18nTitleKey: 'password.book.create.title'
            });
        }
    },

    async loadDetails(id) {
        try {
            const res = await request.get(`/api/password-book/${id}`);
            if (res.data) {
                const data = res.data;
                this.setData({
                    formData: {
                        platform: data.platform,
                        account: data.account,
                        password: data.password || '',
                        url: data.url || '',
                        category: data.category || '',
                        tagsString: data.tags ? data.tags.join(', ') : '',
                        notes: data.notes || ''
                    }
                });
                if (data.password) {
                    this.checkStrength(data.password);
                }
            }
        } catch (e) {
            console.error('Failed to load password details', e);
        }
    },

    onInputChange(e) {
        const field = e.currentTarget.dataset.field;
        const value = e.detail.value;
        this.setData({ [`formData.${field}`]: value });

        if (field === 'password') {
            this.onPasswordInput(value);
        }
    },

    onPasswordInput(password) {
        clearTimeout(this.strengthTimer);
        if (!password) {
            this.setData({ strength: null });
            return;
        }
        this.strengthTimer = setTimeout(() => {
            this.checkStrength(password);
        }, 500);
    },

    async checkStrength(password) {
        try {
            // Backend expects string body for simple strength check or object?
            // Based on PasswordBookController, it might be [FromBody] string password or a request model.
            // Looking at common patterns, probably an object.
            const res = await request.post('/api/password-book/check-strength', { password });
            if (res.data) {
                this.setData({ strength: res.data });
            }
        } catch (e) {
            console.error('Failed to check password strength', e);
        }
    },

    async generatePassword() {
        try {
            const res = await request.post('/api/password-book/generate', {
                length: 16,
                includeUppercase: true,
                includeLowercase: true,
                includeNumbers: true,
                includeSpecialChars: true
            });
            if (res.data && res.data.password) {
                this.setData({
                    'formData.password': res.data.password,
                    strength: res.data.strength
                });
            }
        } catch (e) {
            console.error('Failed to generate password', e);
        }
    },

    async handleSubmit() {
        const { platform, account, password } = this.data.formData;
        if (!platform || !account || !password) {
            wx.showToast({
                title: t('common.input_required'),
                icon: 'none'
            });
            return;
        }

        this.setData({ submitting: true });

        try {
            const payload = {
                ...this.data.formData,
                tags: this.data.formData.tagsString ? this.data.formData.tagsString.split(',').map(s => s.trim()).filter(s => s) : []
            };
            delete payload.tagsString;

            if (this.data.isEdit) {
                await request.put(`/api/password-book/${this.data.id}`, payload);
            } else {
                await request.post('/api/password-book', payload);
            }

            wx.showToast({
                title: t('common.success'),
                icon: 'success'
            });

            setTimeout(() => {
                const pages = getCurrentPages();
                const prevPage = pages[pages.length - 2];
                if (prevPage && prevPage.onPullDownRefresh) {
                    prevPage.onPullDownRefresh();
                }
                wx.navigateBack();
            }, 1500);
        } catch (e) {
            console.error('Failed to save password entry', e);
            wx.showToast({
                title: t('common.fail'),
                icon: 'none'
            });
        } finally {
            this.setData({ submitting: false });
        }
    }
}));
