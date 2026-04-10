import { sm2 } from 'sm-crypto';
import { getPublicKey } from '@/services/ant-design-pro/api';

/**
 * 密码加密服务
 * 使用国密 SM2 非对称加密前端敏感数据
 */
export class PasswordEncryption {
    private static publicKey: string | null = null;
    private static lastFetchTime: number = 0;
    private static readonly CACHE_DURATION = 1000 * 60 * 30; // 缓存30分钟

    /**
     * 获取并缓存公钥
     */
    private static async getValidPublicKey(): Promise<string> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastFetchTime < this.CACHE_DURATION)) {
            return this.publicKey;
        }

        try {
            const response = await getPublicKey();
            if (response.success && response.data?.key) {
                this.publicKey = response.data.key;
                this.lastFetchTime = now;
                console.log('SM2公钥已缓存, 长度:', this.publicKey.length);
                return this.publicKey;
            }
            throw new Error('获取公钥失败: ' + JSON.stringify(response));
        } catch (error) {
            console.error('SM2公钥获取异常:', error);
            throw error;
        }
    }

    /**
     * 清除缓存的公钥（用于强制刷新）
     */
    public static clearCache(): void {
        this.publicKey = null;
        this.lastFetchTime = 0;
    }

    /**
     * 加密密码
     * @param password 原始明文密码
     */
    public static async encrypt(password: string): Promise<string> {
        if (!password) return '';

        try {
            const keyHex = await this.getValidPublicKey();
            if (!keyHex || keyHex.length !== 130) {
                throw new Error('无效的公钥格式: ' + (keyHex?.substring(0, 10) || 'undefined'));
            }
            const encryptedData = sm2.doEncrypt(password, keyHex, 1);
            return encryptedData;
        } catch (error) {
            console.error('SM2 加密失败', error);
            this.clearCache();
            return password;
        }
    }
}
