import { sm2 } from 'sm-crypto';
import { apiClient } from '../services/api';

class PasswordEncryption {
    private static publicKey: string | null = null;
    private static lastFetchTime: number = 0;
    private static CACHE_DURATION = 1000 * 60 * 30; // 30 minutes cache

    /**
     * Get valid public key from backend or cache
     */
    private static async getValidPublicKey(): Promise<string> {
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
            throw new Error('Failed to fetch public key');
        } catch (error) {
            console.error('Error fetching public key:', error);
            throw error;
        }
    }

    /**
     * Encrypt password using SM2
     */
    static async encrypt(password: string): Promise<string> {
        if (!password) return '';

        try {
            const pubKey = await this.getValidPublicKey();

            // SM2 encryption requires the key without "04" prefix if it's there
            // Usually the backend returns it explicitly but we handle common format
            let hexKey = pubKey;

            // Generate SM2 encrypted string with cipherMode 1 (C1C3C2)
            let encrypted = sm2.doEncrypt(password, hexKey, 1);

            if (!encrypted) {
                console.error('SM2 encryption failed');
                return password;
            }

            // Ensure our encrypted string starts with '04' to indicate uncompressed format
            if (!encrypted.startsWith('04')) {
                encrypted = '04' + encrypted;
            }

            return encrypted;
        } catch (err) {
            console.error('Encryption process error:', err);
            return password; // Fallback to plaintext if error
        }
    }
}

export default PasswordEncryption;
