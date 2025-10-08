// 本地存储清理工具

import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageCleaner {
  // 清除所有用户相关数据
  static async clearUserData(): Promise<void> {
    try {
      // 获取所有存储的键
      const keys = await AsyncStorage.getAllKeys();
      
      // 定义需要清除的键模式
      const patternsToRemove = [
        'user',
        'auth',
        'token',
        'session',
        'cache',
        'profile',
        'settings',
        'preferences',
        'login',
        'logout',
        'credential',
        'password',
        'remember',
        'auto_login',
        'biometric',
        'fingerprint',
        'face_id',
        'touch_id'
      ];
      
      // 过滤出需要删除的键
      const keysToRemove = keys.filter(key => 
        patternsToRemove.some(pattern => 
          key.toLowerCase().includes(pattern.toLowerCase())
        )
      );
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
    } catch (error) {
      console.error('StorageCleaner: Failed to clear user data:', error);
      throw error;
    }
  }
  
  // 清除所有应用数据（更彻底）
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('StorageCleaner: Failed to clear all data:', error);
      throw error;
    }
  }
  
  // 清除特定类型的数据
  static async clearDataByType(type: 'auth' | 'user' | 'cache' | 'settings'): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(key => 
        key.toLowerCase().includes(type.toLowerCase())
      );
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
    } catch (error) {
      console.error(`StorageCleaner: Failed to clear ${type} data:`, error);
      throw error;
    }
  }
  
  // 获取存储使用情况
  static async getStorageInfo(): Promise<{
    totalKeys: number;
    userRelatedKeys: string[];
    allKeys: string[];
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userRelatedKeys = keys.filter(key => 
        ['user', 'auth', 'token', 'session', 'cache'].some(pattern => 
          key.toLowerCase().includes(pattern.toLowerCase())
        )
      );
      
      return {
        totalKeys: keys.length,
        userRelatedKeys,
        allKeys: [...keys]
      };
    } catch (error) {
      console.error('StorageCleaner: Failed to get storage info:', error);
      return {
        totalKeys: 0,
        userRelatedKeys: [],
        allKeys: []
      };
    }
  }
}
