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

        try {
            const pubKey = await this.getValidPublicKey();

            if (!pubKey) {
                return password;
            }

            let hexKey = pubKey;

            let encrypted = sm2.doEncrypt(password, hexKey, 1);

            if (!encrypted) {
                console.error('SM2 encryption failed');
                return password;
            }

            if (!encrypted.startsWith('04')) {
                encrypted = '04' + encrypted;
            }

            return encrypted;
        } catch (err) {
            console.error('Encryption process error:', err);
            return password;
        }
    }
}

export default PasswordEncryption;
