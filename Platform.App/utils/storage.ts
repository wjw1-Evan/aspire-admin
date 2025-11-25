import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility functions for AsyncStorage operations
 */

export const storage = {
    /**
     * Get a value from storage
     */
    async get<T = string>(key: string): Promise<T | null> {
        try {
            const value = await AsyncStorage.getItem(key);
            if (value === null) return null;

            // Try to parse as JSON, fallback to string
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

    /**
     * Set a value in storage
     */
    async set(key: string, value: any): Promise<void> {
        try {
            const stringValue = typeof value === 'string'
                ? value
                : JSON.stringify(value);
            await AsyncStorage.setItem(key, stringValue);
        } catch (error) {
            console.error('Storage set error:', error);
            throw error;
        }
    },

    /**
     * Remove a value from storage
     */
    async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
            throw error;
        }
    },

    /**
     * Clear all storage
     */
    async clear(): Promise<void> {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
            throw error;
        }
    },

    /**
     * Get multiple values
     */
    async multiGet(keys: string[]): Promise<Record<string, any>> {
        try {
            const pairs = await AsyncStorage.multiGet(keys);
            const result: Record<string, any> = {};

            pairs.forEach(([key, value]) => {
                if (value !== null) {
                    try {
                        result[key] = JSON.parse(value);
                    } catch {
                        result[key] = value;
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
