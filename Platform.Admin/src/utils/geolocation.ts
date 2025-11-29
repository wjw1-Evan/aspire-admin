/**
 * 地理位置工具函数
 * 提供浏览器地理位置 API 的封装
 */

/**
 * 获取浏览器地理位置选项
 */
export interface GeolocationOptions {
  /** 是否启用高精度定位（默认：false） */
  enableHighAccuracy?: boolean;
  /** 超时时间（毫秒，默认：10000） */
  timeout?: number;
  /** 缓存时间（毫秒，默认：60000） */
  maximumAge?: number;
}

/**
 * 地理位置信息
 */
export interface GeolocationPosition {
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
 * 获取浏览器地理位置
 * @param options 定位选项
 * @returns Promise<GeolocationPosition>
 */
export function getCurrentPosition(
  options: GeolocationOptions = {},
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    // 检查浏览器是否支持地理位置 API
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置 API'));
      return;
    }

    const {
      enableHighAccuracy = false,
      timeout = 10000,
      maximumAge = 60000, // 1 分钟缓存
    } = options;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? undefined,
          altitude: position.coords.altitude ?? undefined,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let errorMessage = '获取地理位置失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了地理位置请求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '地理位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = '获取地理位置超时';
            break;
          default:
            errorMessage = `获取地理位置失败: ${error.message}`;
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      },
    );
  });
}

/**
 * 检查浏览器是否支持地理位置 API
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * 检查地理位置权限状态
 * @returns Promise<'granted' | 'denied' | 'prompt' | 'unsupported'>
 */
export async function getGeolocationPermissionStatus(): Promise<
  'granted' | 'denied' | 'prompt' | 'unsupported'
> {
  if (!isGeolocationSupported()) {
    return 'unsupported';
  }

  // 使用 Permissions API 检查权限状态（如果支持）
  if ('permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      // Permissions API 不支持或失败，返回 prompt
      return 'prompt';
    }
  }

  // 不支持 Permissions API，返回 prompt
  return 'prompt';
}

