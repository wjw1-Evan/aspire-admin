import JSEncrypt from 'jsencrypt';
import { getPublicKey } from '@/services/ant-design-pro/api';

/**
 * 密码加密服务
 * 使用 RSA 非对称加密前端敏感数据
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
            if (response.success && response.data) {
                this.publicKey = response.data;
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
     * @param password 原始明文密码
     */
    public static async encrypt(password: string): Promise<string> {
        if (!password) return '';

        const key = await this.getValidPublicKey();
        const encryptor = new JSEncrypt();
        encryptor.setPublicKey(key);

        const encrypted = encryptor.encrypt(password);
        if (encrypted === false) {
            console.error('RSA 加密失败');
            return password; // 加密失败回退明文，后端会处理
        }

        return encrypted as string;
    }
}
