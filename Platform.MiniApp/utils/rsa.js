const RSA = require('./wx_rsa.js');
const { request } = require('./request.js');

/**
 * 密码加密服务
 * 使用 RSA 非对称加密前端敏感数据
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
            // 注意：此时可能形成循环依赖，如果 request.js 引用了 auth.js，而 auth.js 引用了 rsa.js
            // 但 request 函数本身是独立的。
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
            console.error('RSA公钥获取异常:', error);
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
            const key = await this.getValidPublicKey();

            // 🔧 修复：使用 KEYUTIL.getKey 直接从 PEM 字符串加载公钥
            // 原来的 setPublic(key, '10001') 无法解析 PEM 标头
            const encryptor = RSA.KEYUTIL.getKey(key);

            let encrypted = encryptor.encrypt(password);
            if (!encrypted) {
                console.error('RSA 加密失败');
                return password;
            }

            // 🔧 适配：有些版本的 RSA 库返回 hex 字符串，后端需要的是 Base64
            // jsrsasign 的 RSAKey.encrypt 通常返回 hex
            if (/^[0-9a-fA-F]+$/.test(encrypted)) {
                encrypted = RSA.hex2b64(encrypted);
            }

            return encrypted;
        } catch (err) {
            console.error('RSA 加密过程异常:', err);
            return password;
        }
    }
}

module.exports = PasswordEncryption;
