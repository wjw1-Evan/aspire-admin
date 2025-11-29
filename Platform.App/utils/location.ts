/**
 * 地理位置工具函数
 * 提供 Expo Location API 的封装
 */

import * as Location from 'expo-location';

/**
 * 地理位置选项
 */
export interface LocationOptions {
  /** 是否启用高精度定位（默认：true） */
  enableHighAccuracy?: boolean;
  /** 超时时间（毫秒，默认：15000） */
  timeout?: number;
  /** 缓存时间（毫秒，默认：60000） */
  maximumAge?: number;
}

/**
 * 地理位置信息
 */
export interface LocationPosition {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 定位精度（米） */
  accuracy?: number;
  /** 海拔高度（米） */
  altitude?: number;
  /** 航向角（度） */
  heading?: number;
  /** 移动速度（米/秒） */
  speed?: number;
  /** 时间戳（毫秒） */
  timestamp?: number;
}

/**
 * 请求位置权限
 * @returns Promise<boolean> 是否已授予权限
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('请求位置权限失败:', error);
    return false;
  }
}

/**
 * 检查位置权限状态
 * @returns Promise<'granted' | 'denied' | 'undetermined'>
 */
export async function getLocationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  } catch (error) {
    console.error('检查位置权限失败:', error);
    return 'undetermined';
  }
}

/**
 * 获取当前位置
 * @param options 定位选项
 * @returns Promise<LocationPosition>
 */
export async function getCurrentPosition(
  options: LocationOptions = {},
): Promise<LocationPosition> {
  // 先检查权限
  const permissionStatus = await getLocationPermissionStatus();
  if (permissionStatus !== 'granted') {
    const granted = await requestLocationPermission();
    if (!granted) {
      throw new Error('用户拒绝了位置权限请求');
    }
  }

  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 60000, // 1 分钟缓存
  } = options;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: enableHighAccuracy
        ? Location.Accuracy.Balanced
        : Location.Accuracy.Low,
      timeoutInterval: timeout,
      maximumAge,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
      altitude: location.coords.altitude ?? undefined,
      heading: location.coords.heading ?? undefined,
      speed: location.coords.speed ?? undefined,
      timestamp: location.timestamp,
    };
  } catch (error: any) {
    let errorMessage = '获取地理位置失败';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      switch (error.code) {
        case 'E_LOCATION_SERVICES_DISABLED':
          errorMessage = '位置服务已禁用，请在设置中启用';
          break;
        case 'E_LOCATION_UNAVAILABLE':
          errorMessage = '地理位置信息不可用';
          break;
        case 'E_LOCATION_TIMEOUT':
          errorMessage = '获取地理位置超时';
          break;
        default:
          errorMessage = `获取地理位置失败: ${error.code}`;
          break;
      }
    }
    throw new Error(errorMessage);
  }
}

/**
 * 检查是否支持位置服务
 */
export function isLocationSupported(): boolean {
  return Location.hasServicesEnabledAsync !== undefined;
}

/**
 * 检查位置服务是否启用
 * @returns Promise<boolean>
 */
export async function isLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('检查位置服务状态失败:', error);
    return false;
  }
}

