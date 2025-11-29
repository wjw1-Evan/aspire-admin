/**
 * 位置上报工具
 * 在登录成功后自动请求位置权限并上报位置信息
 */

import { getCurrentPosition, requestLocationPermission } from './location';
import { updateLocation } from '../services/socialService';

/**
 * 上报用户位置
 * 静默执行，失败不抛出错误（避免影响登录流程）
 */
export async function reportUserLocation(): Promise<void> {
  try {
    // 请求位置权限
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.log('用户拒绝了位置权限，跳过位置上报');
      return;
    }

    // 获取当前位置
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000, // 使用 1 分钟内的缓存位置
    });

    // 上报位置到服务器
    await updateLocation({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      altitude: position.altitude,
      heading: position.heading,
      speed: position.speed,
      timestamp: position.timestamp,
    });

    console.log('位置上报成功:', {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
    });
  } catch (error: any) {
    // 静默失败，不影响登录流程
    console.warn('位置上报失败:', error.message || error);
  }
}

