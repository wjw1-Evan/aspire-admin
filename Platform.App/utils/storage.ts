import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

let nativeStore: typeof import('expo-secure-store') | null = null;

async function getNativeStore() {
    if (!nativeStore) {
        nativeStore = await import('expo-secure-store');
    }
    return nativeStore;
}

const isWeb = Platform.OS === 'web';

export const storage = {
    async get<T = string>(key: string): Promise<T | null> {
        try {
            const sk = sanitizeKey(key);
            if (isWeb) {
                const value = localStorage.getItem(sk);
                if (value === null) return null;
                try {
                    return JSON.parse(value) as T;
                } catch {
                    return value as T;
                }
            }
            const store = await getNativeStore();
            const value = await store.getItemAsync(sk);
            if (value === null) return null;
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    async set(key: string, value: any): Promise<void> {
        try {
            const sk = sanitizeKey(key);
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (isWeb) {
                localStorage.setItem(sk, stringValue);
                return;
            }
            const store = await getNativeStore();
            await store.setItemAsync(sk, stringValue);
        } catch (error) {
            console.error('Storage set error:', error);
            throw error;
        }
    },

    async remove(key: string): Promise<void> {
        try {
            const sk = sanitizeKey(key);
            if (isWeb) {
                localStorage.removeItem(sk);
                return;
            }
            const store = await getNativeStore();
            await store.deleteItemAsync(sk);
        } catch (error) {
            console.error('Storage remove error:', error);
            throw error;
        }
    },

    async clear(): Promise<void> {
        try {
            const keys = [
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.USER_INFO,
                STORAGE_KEYS.CURRENT_COMPANY_ID,
                STORAGE_KEYS.TOKEN_EXPIRES,
                'app_language',
                'theme_mode',
            ];
            const sanitized = keys.map(sanitizeKey);
            if (isWeb) {
                sanitized.forEach(k => localStorage.removeItem(k));
                return;
            }
            const store = await getNativeStore();
            await Promise.all(sanitized.map(k => store.deleteItemAsync(k)));
        } catch (error) {
            console.error('Storage clear error:', error);
            throw error;
        }
    },

    async multiGet(keys: string[]): Promise<Record<string, any>> {
        try {
            const sanitized = keys.map(sanitizeKey);
            if (isWeb) {
                const result: Record<string, any> = {};
                sanitized.forEach((sk, i) => {
                    const value = localStorage.getItem(sk);
                    if (value !== null) {
                        try {
                            result[keys[i]] = JSON.parse(value);
                        } catch {
                            result[keys[i]] = value;
                        }
                    }
                });
                return result;
            }
            const store = await getNativeStore();
            const entries = await Promise.all(
                sanitized.map(async (sk) => {
                    const value = await store.getItemAsync(sk);
                    return [sk, value] as const;
                })
            );
            const result: Record<string, any> = {};
            entries.forEach(([sk, value]) => {
                if (value !== null) {
                    try {
                        result[sk] = JSON.parse(value);
                    } catch {
                        result[sk] = value;
                    }
                }
            });
            return result;
        } catch (error) {
            console.error('Storage multiGet error:', error);
            return {};
        }
    },
};
