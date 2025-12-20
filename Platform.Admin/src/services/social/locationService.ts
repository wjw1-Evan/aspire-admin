/**
 * 位置上报服务
 * 自动获取并上报用户地理位置信息
 * 
 * SignalR 已移除，改为使用 REST API 上报
 */

import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';
import { getCurrentPosition } from '@/utils/geolocation';

export interface LocationReportRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

class LocationService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly REPORT_INTERVAL = 30000; // 30 秒上报一次

  /**
   * 上报位置信息
   */
  async reportLocation(location: LocationReportRequest): Promise<void> {
    try {
      await request<ApiResponse<void>>('/api/social/location/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: location,
      });
    } catch (error) {
      console.error('位置上报失败:', error);
      // 静默失败，不影响用户体验
    }
  }

  /**
   * 启动定期位置上报
   * @param immediate 是否立即上报一次（默认：true）
   */
  async startPeriodicReporting(immediate: boolean = true): Promise<void> {
    // 如果已经在运行，先停止
    this.stopPeriodicReporting();

    // 立即上报一次
    if (immediate) {
      this.reportCurrentLocation();
    }

    // 设置定期上报
    this.intervalId = setInterval(() => {
      this.reportCurrentLocation();
    }, this.REPORT_INTERVAL);
  }

  /**
   * 停止定期位置上报
   */
  stopPeriodicReporting(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 获取当前位置并上报
   */
  private async reportCurrentLocation(): Promise<void> {
    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000, // 使用 1 分钟内的缓存位置
      });

      await this.reportLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        heading: position.heading,
        speed: position.speed,
        timestamp: position.timestamp,
      });
    } catch (error) {
      // 静默失败，不影响用户体验
      // 可能是用户拒绝了权限或定位失败
    }
  }
}

export default new LocationService();
