const { request } = require('../../utils/request');
const { withAuth } = require('../../utils/auth');

Page(withAuth({
    data: {
        fileList: [],
        pathStack: [], // [{id, name}]
        currentParentId: '',
        loading: false,
        isRefreshing: false,
        showFabMenu: false,
        showFolderModal: false,
        newFolderName: '',
        page: 1,
        pageSize: 50
    },

    onLoad() {
        this.fetchFiles();
    },

    onPullDownRefresh() {
        this.setData({ isRefreshing: true, page: 1 }, () => {
            this.fetchFiles();
        });
    },

    async fetchFiles() {
        if (!this.data.isRefreshing) this.setData({ loading: true });

        try {
            const res = await request({
                url: `/api/cloud-storage/list?parentId=${this.data.currentParentId}&page=${this.data.page}&pageSize=${this.data.pageSize}`,
                method: 'GET'
            });

            if (res.success) {
                const list = res.data.list || [];
                const formattedList = list.map(item => {
                    return {
                        ...item,
                        displaySize: this.formatSize(item.size),
                        displayTime: this.formatDate(item.updatedAt || item.createdAt),
                        icon: this.getFileIcon(item.name, item.mimeType)
                    };
                });
                this.setData({ fileList: formattedList });
            }
        } catch (err) {
            console.error('Fetch files failed', err);
            wx.showToast({ title: '加载失败', icon: 'none' });
        } finally {
            this.setData({ loading: false, isRefreshing: false });
            wx.stopPullDownRefresh();
        }
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    },

    getFileIcon(name, mime) {
        const ext = name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
        if (['pdf'].includes(ext)) return '📕';
        if (['doc', 'docx'].includes(ext)) return '📘';
        if (['xls', 'xlsx'].includes(ext)) return '📗';
        if (['ppt', 'pptx'].includes(ext)) return '📙';
        if (['zip', 'rar', '7z'].includes(ext)) return '📦';
        return '📄';
    },

    onItemClick(e) {
        const item = e.currentTarget.dataset.item;
        if (item.type === 1) { // Folder
            const stack = this.data.pathStack;
            stack.push({ id: item.id, name: item.name });
            this.setData({
                pathStack: stack,
                currentParentId: item.id,
                page: 1
            }, () => {
                this.fetchFiles();
            });
        } else { // File
            this.previewFile(item);
        }
    },

    async previewFile(item) {
        // First try to get preview info from server
        try {
            wx.showLoading({ title: '加载中' });
            const res = await request({
                url: `/api/cloud-storage/${item.id}/preview`,
                method: 'GET'
            });

            const apiUrl = wx.getStorageSync('apiUrl') || '';
            if (res.success && res.data.isPreviewable) {
                // If it's an image, use previewImage
                const ext = item.name.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                    wx.previewImage({
                        urls: [res.data.previewUrl || `${apiUrl}/api/cloud-storage/${item.id}/download`]
                    });
                } else {
                    // For docs, download and open
                    this.downloadAndOpenDoc(item);
                }
            } else {
                // Not officially previewable by backend, try direct download and open
                this.downloadAndOpenDoc(item);
            }
        } catch (err) {
            console.warn('Preview info failed', err);
            this.downloadAndOpenDoc(item);
        } finally {
            wx.hideLoading();
        }
    },

    downloadAndOpenDoc(item) {
        wx.showLoading({ title: '正在下载文件' });
        const apiUrl = wx.getStorageSync('apiUrl') || '';
        const downloadUrl = `${apiUrl}/api/cloud-storage/${item.id}/download`;
        const token = wx.getStorageSync('token');

        wx.downloadFile({
            url: downloadUrl,
            header: { 'Authorization': `Bearer ${token}` },
            success: (res) => {
                if (res.statusCode === 200) {
                    wx.openDocument({
                        filePath: res.tempFilePath,
                        showMenu: true,
                        success: (res) => console.log('打开预览成功'),
                        fail: (err) => {
                            wx.showToast({ title: '不支持该类型预览', icon: 'none' });
                        }
                    });
                }
            },
            fail: (err) => {
                wx.showToast({ title: '下载失败', icon: 'none' });
            },
            complete: () => wx.hideLoading()
        });
    },

    navToRoot() {
        if (this.data.pathStack.length === 0) return;
        this.setData({ pathStack: [], currentParentId: '', page: 1 }, () => {
            this.fetchFiles();
        });
    },

    navToFolder(e) {
        const index = e.currentTarget.dataset.index;
        if (index === this.data.pathStack.length - 1) return;

        const newStack = this.data.pathStack.slice(0, index + 1);
        const folder = newStack[newStack.length - 1];
        this.setData({
            pathStack: newStack,
            currentParentId: folder.id,
            page: 1
        }, () => {
            this.fetchFiles();
        });
    },

    toggleFab() {
        this.setData({ showFabMenu: !this.data.showFabMenu });
    },

    uploadImage() {
        this.setData({ showFabMenu: false });
        wx.chooseImage({
            count: 9,
            success: (res) => {
                res.tempFilePaths.forEach(path => this.doUpload(path, 'image'));
            }
        });
    },

    uploadFile() {
        this.setData({ showFabMenu: false });
        if (wx.chooseMessageFile) {
            wx.chooseMessageFile({
                count: 1,
                type: 'all',
                success: (res) => {
                    res.tempFiles.forEach(file => this.doUpload(file.path, 'file', file.name));
                }
            });
        }
    },

    async doUpload(filePath, type, originalName) {
        wx.showLoading({ title: '上传中' });
        const token = wx.getStorageSync('token');
        const apiUrl = wx.getStorageSync('apiUrl') || '';

        wx.uploadFile({
            url: `${apiUrl}/api/cloud-storage/upload`,
            filePath: filePath,
            name: 'File',
            header: {
                'Authorization': `Bearer ${token}`
            },
            formData: {
                'ParentId': this.data.currentParentId,
                'Overwrite': 'false'
            },
            success: (res) => {
                const data = JSON.parse(res.data);
                if (data.success) {
                    wx.showToast({ title: '上传成功' });
                    this.fetchFiles();
                } else {
                    wx.showToast({ title: data.errorMessage || '上传失败', icon: 'none' });
                }
            },
            fail: (err) => {
                wx.showToast({ title: '上传异常', icon: 'none' });
            },
            complete: () => wx.hideLoading()
        });
    },

    showCreateFolder() {
        this.setData({ showFabMenu: false, showFolderModal: true, newFolderName: '' });
    },

    closeFolderModal() {
        this.setData({ showFolderModal: false });
    },

    onFolderNameInput(e) {
        this.setData({ newFolderName: e.detail.value });
    },

    async confirmCreateFolder() {
        if (!this.data.newFolderName) {
            wx.showToast({ title: '请输入名称', icon: 'none' });
            return;
        }

        try {
            const res = await request({
                url: '/api/cloud-storage/folders',
                method: 'POST',
                data: {
                    name: this.data.newFolderName,
                    parentId: this.data.currentParentId
                }
            });

            if (res.success) {
                wx.showToast({ title: '创建成功' });
                this.setData({ showFolderModal: false });
                this.fetchFiles();
            }
        } catch (err) {
            wx.showToast({ title: '创建失败', icon: 'none' });
        }
    },

    showActionMenu(e) {
        const item = e.currentTarget.dataset.item;
        wx.showActionSheet({
            itemList: ['重命名', '删除'],
            itemColor: '#333',
            success: (res) => {
                if (res.tapIndex === 0) {
                    // Rename logic placeholder
                    wx.showToast({ title: '功能开发中', icon: 'none' });
                } else if (res.tapIndex === 1) {
                    this.deleteItem(item.id);
                }
            }
        });
    },

    async deleteItem(id) {
        wx.showModal({
            title: '确认删除',
            content: '文件将移动到回收站',
            success: async (res) => {
                if (res.confirm) {
                    try {
                        const delRes = await request({
                            url: `/api/cloud-storage/${id}`,
                            method: 'DELETE'
                        });
                        if (delRes.success) {
                            wx.showToast({ title: '已移除' });
                            this.fetchFiles();
                        }
                    } catch (err) {
                        wx.showToast({ title: '操作失败', icon: 'none' });
                    }
                }
            }
        });
    }
}));
