/**
 * 位置上报服务
 * 自动获取并上报用户地理位置信息
 */

import { updateLocation } from './api';
import { getCurrentPosition, isGeolocationSupported } from '@/utils/geolocation';
import { tokenUtils } from '@/utils/token';

/**
 * 位置上报服务类
 */
class LocationService {
  private static isReporting = false;
  private static lastReportTime = 0;
  private static reportIntervalId: NodeJS.Timeout | null = null;
  private static readonly REPORT_INTERVAL = 5 * 60 * 1000; // 5 分钟上报一次

  /**
   * 上报当前位置
   * @param force 是否强制上报（忽略时间间隔限制）
   */
  static async reportLocation(force = false): Promise<void> {
    // 检查是否有 token
    if (!tokenUtils.hasToken()) {
      if (process.env.NODE_ENV === 'development') {
        console.log('位置上报：用户未登录，跳过上报');
      }
      return;
    }

    // 检查是否正在上报
    if (this.isReporting) {
      if (process.env.NODE_ENV === 'development') {
        console.log('位置上报：正在上报中，跳过重复请求');
      }
      return;
    }

    // 检查时间间隔（除非强制上报）
    const now = Date.now();
    if (!force && now - this.lastReportTime < this.REPORT_INTERVAL) {
      if (process.env.NODE_ENV === 'development') {
        console.log('位置上报：距离上次上报时间过短，跳过上报');
      }
      return;
    }

    // 检查浏览器是否支持地理位置 API
    if (!isGeolocationSupported()) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('位置上报：浏览器不支持地理位置 API');
      }
      return;
    }

    this.isReporting = true;

    try {
      // 获取当前位置
      const position = await getCurrentPosition({
        enableHighAccuracy: false, // 不需要高精度，节省电量
        timeout: 10000, // 10 秒超时
        maximumAge: 60000, // 使用 1 分钟内的缓存位置
      });

      // 上报位置
      const response = await updateLocation(
        {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude,
          heading: position.heading,
          speed: position.speed,
          timestamp: position.timestamp,
        },
        {
          // 静默失败，不显示错误提示
          skipErrorHandler: true,
        },
      );

      if (response.success) {
        this.lastReportTime = now;
        if (process.env.NODE_ENV === 'development') {
          console.log('位置上报成功', {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
          });
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('位置上报失败', response.errorMessage);
        }
      }
    } catch (error: any) {
      // 地理位置获取失败或上报失败，静默处理
      if (process.env.NODE_ENV === 'development') {
        console.warn('位置上报失败', error.message);
      }
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 定期上报位置（每 5 分钟）
   */
  static startPeriodicReporting(): void {
    // 如果已经启动，先停止
    if (this.reportIntervalId) {
      this.stopPeriodicReporting();
    }

    // 立即上报一次
    this.reportLocation(true).catch(() => {
      // 静默失败
    });

    // 设置定期上报
    this.reportIntervalId = setInterval(() => {
      this.reportLocation().catch(() => {
        // 静默失败
      });
    }, this.REPORT_INTERVAL);

    if (process.env.NODE_ENV === 'development') {
      console.log('位置上报：已启动定期上报（每 5 分钟）');
    }
  }

  /**
   * 停止定期上报
   */
  static stopPeriodicReporting(): void {
    if (this.reportIntervalId) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = null;
      if (process.env.NODE_ENV === 'development') {
        console.log('位置上报：已停止定期上报');
      }
    }
  }
}

export default LocationService;

