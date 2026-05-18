import { sm2 } from 'sm-crypto';
import { apiClient } from '../services/api';

class PasswordEncryption {
    private static publicKey: string | null = null;
    private static lastFetchTime: number = 0;
    private static CACHE_DURATION = 1000 * 60 * 30; // 30 minutes cache

    /**
     * Get valid public key from backend or cache
     */
    private static async getValidPublicKey(): Promise<string | null> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastFetchTime < this.CACHE_DURATION)) {
            return this.publicKey;
        }

        try {
            const response = await apiClient.get<any, { success: boolean, data: string }>('/api/auth/public-key');

            if (response.success && response.data) {
                this.publicKey = response.data;
                this.lastFetchTime = now;
                return this.publicKey;
            }
        } catch (error) {
            console.error('Error fetching public key:', error);
        }
        return this.publicKey;
    }

    /**
     * Encrypt password using SM2
     */
    static async encrypt(password: string): Promise<string> {
        if (!password) return '';

        const pubKey = await this.getValidPublicKey();

        if (!pubKey) {
            throw new Error('无法获取加密公钥，请检查网络连接');
        }

        let hexKey = pubKey;
        let encrypted = sm2.doEncrypt(password, hexKey, 1);

        if (!encrypted) {
            throw new Error('密码加密失败，请稍后重试');
        }

        if (!encrypted.startsWith('04')) {
            encrypted = '04' + encrypted;
        }

        return encrypted;
    }
}

export default PasswordEncryption;
