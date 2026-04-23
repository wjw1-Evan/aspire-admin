import { sm2 } from 'sm-crypto';
import { getPublicKey } from '@/services/ant-design-pro/api';

/**
 * 密码加密服务
 * 使用国密 SM2 非对称加密算法（GM/T 0003 / GM/T 0009）保护前端敏感数据传输
 *
 * 密文格式遵循 GM/T 0009-2012 标准 C1C3C2 模式：
 *   04 || C1_x(32B) || C1_y(32B) || C3(SM3,32B) || C2(密文)
 *
 * sm-crypto 库 doEncrypt 输出不带 04 前缀（仅输出 C1_x || C1_y || C3 || C2），
 * 需手动拼接 04 前缀以符合国密标准，同时满足后端 BouncyCastle SM2Engine 解密要求。
 *
 * 公钥格式遵循 GM/T 0003.1-2012 非压缩点表示：
 *   04 || x(32B) || y(32B) = 130 hex chars
 */
export class PasswordEncryption {
    private static publicKey: string | null = null;
    private static lastFetchTime: number = 0;
    private static readonly CACHE_DURATION = 1000 * 60 * 30;

    private static async getValidPublicKey(): Promise<string> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastFetchTime < this.CACHE_DURATION)) {
            return this.publicKey;
        }

        try {
            const response = await getPublicKey();
            const key = typeof response.data === 'string' ? response.data : response.data?.key;
            if (response.success && key && key.length === 130 && key.startsWith('04')) {
                this.publicKey = key;
                this.lastFetchTime = now;
                return this.publicKey;
            }
            throw new Error('无效的 SM2 公钥格式（应为 04 开头的 130 位非压缩点）');
        } catch (error) {
            console.error('SM2 公钥获取异常:', error);
            this.publicKey = null;
            this.lastFetchTime = 0;
            throw error;
        }
    }

    public static clearCache(): void {
        this.publicKey = null;
        this.lastFetchTime = 0;
    }

    /**
     * 加密密码（GM/T 0009-2012 C1C3C2 模式）
     * sm-crypto doEncrypt(cipherMode=1) 输出: C1_x || C1_y || C3 || C2（无 04 前缀）
     * 拼接 04 前缀后符合国密标准: 04 || C1_x || C1_y || C3 || C2
     */
    public static async encrypt(password: string): Promise<string> {
        if (!password) return '';

        try {
            const keyHex = await this.getValidPublicKey();
            const encryptedData = sm2.doEncrypt(password, keyHex, 1);
            return '04' + encryptedData;
        } catch (error) {
            console.error('SM2 加密失败，清除缓存后重试', error);
            this.clearCache();
            const keyHex = await this.getValidPublicKey();
            const encryptedData = sm2.doEncrypt(password, keyHex, 1);
            return '04' + encryptedData;
        }
    }
}