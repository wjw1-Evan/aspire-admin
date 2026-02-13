// 移除全局 getApp()，改在函数内部按需获取，防止在 App 启动前通过 require 引入导致 undefined
// const app = getApp();
const tokenUtils = require('./token.js');

let isRefreshing = false;
let requestsQueue = [];

function subscribeTokenRefresh(cb) {
    requestsQueue.push(cb);
}

function onRefreshed(token) {
    requestsQueue.map(cb => cb(token));
    requestsQueue = [];
}

const request = (options) => {
    return new Promise((resolve, reject) => {
        const app = getApp();
        const baseUrl = (app && app.globalData && app.globalData.baseUrl) || 'http://localhost:15000/apiservice';
        const url = (options.url.startsWith('http') ? '' : baseUrl) + options.url;
        const method = options.method || 'GET';
        const token = tokenUtils.getToken();

        const doRequest = (currentToken) => {
            wx.request({
                url,
                method,
                data: options.data,
                header: {
                    'Content-Type': 'application/json',
                    'Authorization': currentToken ? `Bearer ${currentToken}` : '',
                    ...options.header
                },
                success: async (res) => {
                    const responseData = res.data;
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        if (responseData && responseData.success === false) {
                            if (!options.skipErrorToast) {
                                wx.showToast({
                                    title: responseData.errorMessage || responseData.message || '操作失败',
                                    icon: 'none'
                                });
                            }
                            reject(responseData);
                        } else {
                            resolve(responseData);
                        }
                    } else if (res.statusCode === 401) {
                        // 401 处理：尝试刷新 Token
                        if (options.url.includes('/api/auth/refresh-token')) {
                            // 如果是刷新接口也 401，直接登出
                            isRefreshing = false;
                            handleLogout();
                            reject(responseData || res);
                            return;
                        }

                        const refreshToken = tokenUtils.getRefreshToken();
                        if (refreshToken) {
                            if (!isRefreshing) {
                                isRefreshing = true;
                                try {
                                    const refreshRes = await request({
                                        url: '/api/auth/refresh-token',
                                        method: 'POST',
                                        data: { refreshToken },
                                        skipAuth: true
                                    });

                                    if (refreshRes.success && refreshRes.data.token) {
                                        const { token: newToken, refreshToken: newRefreshToken, expiresAt } = refreshRes.data;
                                        tokenUtils.setTokens(newToken, newRefreshToken, expiresAt);
                                        isRefreshing = false;
                                        onRefreshed(newToken);
                                        // 重试当前请求
                                        resolve(doRequest(newToken));
                                    } else {
                                        throw new Error('Refresh failed');
                                    }
                                } catch (err) {
                                    isRefreshing = false;
                                    handleLogout();
                                    reject(err);
                                }
                            } else {
                                // 正在刷新中，加入等待队列
                                subscribeTokenRefresh((newToken) => {
                                    resolve(doRequest(newToken));
                                });
                            }
                        } else {
                            handleLogout();
                            reject(responseData || res);
                        }
                    } else {
                        if (!options.skipErrorToast) {
                            const errorMsg = (responseData && (responseData.errorMessage || responseData.message)) || '请求失败';
                            wx.showToast({
                                title: errorMsg,
                                icon: 'none'
                            });
                        }
                        reject(responseData || res);
                    }
                },
                fail: (err) => {
                    if (!options.skipErrorToast) {
                        wx.showToast({
                            title: '网络错误',
                            icon: 'none'
                        });
                    }
                    reject(err);
                }
            });
        };

        doRequest(options.skipAuth ? '' : token);
    });
};

function handleLogout() {
    tokenUtils.clearAllTokens();
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route !== 'pages/login/login') {
        wx.reLaunch({
            url: '/pages/login/login',
        });
    }
}

module.exports = {
    request,
    get: (url, data, options) => request({ url, data, method: 'GET', ...options }),
    post: (url, data, options) => request({ url, data, method: 'POST', ...options }),
    put: (url, data, options) => request({ url, data, method: 'PUT', ...options }),
    delete: (url, data, options) => request({ url, data, method: 'DELETE', ...options }),
};
