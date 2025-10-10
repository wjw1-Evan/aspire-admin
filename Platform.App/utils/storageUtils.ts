/**
 * 存储工具函数
 * 提供安全的数据存储和获取
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 安全地存储数据
 */
export async function setItem(key: string, value: any): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Failed to set item ${key}:`, error);
    throw error;
  }
}

/**
 * 安全地获取数据
 */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Failed to get item ${key}:`, error);
    return null;
  }
}

/**
 * 安全地移除数据
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove item ${key}:`, error);
    throw error;
  }
}

/**
 * 批量设置数据
 */
export async function multiSet(items: Array<[string, any]>): Promise<void> {
  try {
    const stringifiedItems: Array<[string, string]> = items.map(([key, value]) => [
      key,
      JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(stringifiedItems);
  } catch (error) {
    console.error('Failed to multi set items:', error);
    throw error;
  }
}

/**
 * 批量获取数据
 */
export async function multiGet<T = any>(keys: string[]): Promise<Record<string, T | null>> {
  try {
    const items = await AsyncStorage.multiGet(keys);
    const result: Record<string, T | null> = {};
    
    for (const [key, value] of items) {
      result[key] = value != null ? JSON.parse(value) : null;
    }
    
    return result;
  } catch (error) {
    console.error('Failed to multi get items:', error);
    return {};
  }
}

/**
 * 批量移除数据
 */
export async function multiRemove(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to multi remove items:', error);
    throw error;
  }
}

/**
 * 清除所有数据
 */
export async function clear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
}

