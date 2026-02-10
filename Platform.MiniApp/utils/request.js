const app = getApp();

const request = (options) => {
    return new Promise((resolve, reject) => {
        const token = wx.getStorageSync('token');

        wx.request({
            url: (options.url.startsWith('http') ? '' : app.globalData.baseUrl) + options.url,
            method: options.method || 'GET',
            data: options.data,
            header: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.header
            },
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else if (res.statusCode === 401) {
                    wx.removeStorageSync('token');
                    wx.navigateTo({
                        url: '/pages/login/login',
                    });
                    reject(res);
                } else {
                    wx.showToast({
                        title: res.data.message || '请求失败',
                        icon: 'none'
                    });
                    reject(res);
                }
            },
            fail: (err) => {
                wx.showToast({
                    title: '网络错误',
                    icon: 'none'
                });
                reject(err);
            }
        });
    });
};

module.exports = {
    request,
    get: (url, data, options) => request({ url, data, method: 'GET', ...options }),
    post: (url, data, options) => request({ url, data, method: 'POST', ...options }),
    put: (url, data, options) => request({ url, data, method: 'PUT', ...options }),
    delete: (url, data, options) => request({ url, data, method: 'DELETE', ...options }),
};
