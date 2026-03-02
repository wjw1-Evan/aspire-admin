const sm2 = require('sm-crypto').sm2;
const { request } = require('./request.js');

/**
 * 密码加密服务
 * 使用 SM2 非对称加密前端敏感数据
 */
class PasswordEncryption {
    static publicKey = null;
    static lastFetchTime = 0;
    static CACHE_DURATION = 1000 * 60 * 30; // 缓存30分钟

    /**
     * 获取并缓存公钥
     */
    static async getValidPublicKey() {
        const now = Date.now();
        if (this.publicKey && (now - this.lastFetchTime < this.CACHE_DURATION)) {
            return this.publicKey;
        }

        try {
            const res = await request({
                url: '/api/auth/public-key',
                method: 'GET'
            });

            if (res.success && res.data) {
                this.publicKey = res.data;
                this.lastFetchTime = now;
                return this.publicKey;
            }
            throw new Error('获取公钥失败');
        } catch (error) {
            console.error('SM2公钥获取异常:', error);
            throw error;
        }
    }

    /**
     * 加密密码
     * @param {string} password 原始明文密码
     */
    static async encrypt(password) {
        if (!password) return '';

        try {
            const pubKey = await this.getValidPublicKey();

            // 使用 sm-crypto 进行 SM2 加密，cipherMode = 1 (C1C3C2)
            let encrypted = sm2.doEncrypt(password, pubKey, 1);

            if (!encrypted) {
                console.error('SM2 加密失败');
                return password;
            }

            // 国密标准要求明确加上 04 前缀表示未压缩格式
            if (!encrypted.startsWith('04')) {
                encrypted = '04' + encrypted;
            }

            return encrypted;
        } catch (err) {
            console.error('SM2 加密过程异常:', err);
            return password;
        }
    }
}

module.exports = PasswordEncryption;
