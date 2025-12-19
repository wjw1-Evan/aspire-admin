/**
 * 位置上报服务（SignalR 版本）
 * 使用 SignalR 实时上报用户地理位置信息，替代轮询
 */

import { tokenUtils } from '@/utils/token';
import { getCurrentPosition, isGeolocationSupported } from '@/utils/geolocation';
import * as signalR from '@microsoft/signalr';
import { getApiBaseUrl } from '@/utils/request';

/**
 * 位置上报服务类
 */
class LocationServiceSignalR {
  private static connection: signalR.HubConnection | null = null;
  private static isConnecting = false;
  private static isReporting = false;
  private static lastReportTime = 0;
  private static readonly REPORT_INTERVAL = 5 * 60 * 1000; // 5 分钟上报一次

  /**
   * 初始化 SignalR 连接
   */
  private static async initializeConnection(): Promise<void> {
    // 如果连接已存在，检查其状态
    if (this.connection) {
      const state = this.connection.state;
      
      // 如果已连接或正在连接，直接返回
      if (state === signalR.HubConnectionState.Connected || 
          state === signalR.HubConnectionState.Connecting) {
        return;
      }

      // 如果处于重新连接状态，也直接返回
      if (state === signalR.HubConnectionState.Reconnecting) {
        return;
      }

      // 如果连接已断开，尝试重新启动
      if (state === signalR.HubConnectionState.Disconnected) {
        if (this.isConnecting) {
          return;
        }

        this.isConnecting = true;

        try {
          await this.connection.start();
          return;
        } catch (error) {
          this.connection = null;
          throw error;
        } finally {
          this.isConnecting = false;
        }
      }
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = tokenUtils.getToken();

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl('/hubs/location', {
          accessTokenFactory: () => tokenUtils.getToken() || '',
          skipNegotiation: false,
          // 暂时强制 LongPolling，避免代理链 WS 升级问题
          transport: signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryCount) => {
            if (retryCount === 0) return 1000;
            if (retryCount === 1) return 2000;
            if (retryCount === 2) return 4000;
            if (retryCount === 3) return 8000;
            if (retryCount === 4) return 16000;
            return 30000;
          },
        })
        .withHubProtocol(new signalR.JsonHubProtocol())
        .configureLogging(signalR.LogLevel.None)
        .build();

      // 监听位置更新响应
      this.connection.on('LocationUpdated', () => {
        // 位置更新响应处理
      });

      // 确保连接处于 Disconnected 状态后再启动
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
      }
    } catch (error) {
      this.connection = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 上报当前位置
   * @param force 是否强制上报（忽略时间间隔限制）
   */
  static async reportLocation(force = false): Promise<void> {
    // 检查是否有 token
    if (!tokenUtils.hasToken()) {
      return;
    }

    // 检查是否正在上报
    if (this.isReporting) {
      return;
    }

    // 检查时间间隔（除非强制上报）
    const now = Date.now();
    if (!force && now - this.lastReportTime < this.REPORT_INTERVAL) {
      return;
    }

    // 检查浏览器是否支持地理位置 API
    if (!isGeolocationSupported()) {
      return;
    }

    this.isReporting = true;

    try {
      // 初始化连接
      await this.initializeConnection();

      if (!this.connection) {
        throw new Error('SignalR 连接未建立');
      }

      // 获取当前位置
      const position = await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });

      // 通过 SignalR 上报位置
      await this.connection.invoke('ReportLocationAsync', {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        heading: position.heading,
        speed: position.speed,
        timestamp: position.timestamp,
      });

      this.lastReportTime = now;
    } catch (error: any) {
      // 静默处理错误
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 定期上报位置（每 5 分钟）
   */
  static async startPeriodicReporting(): Promise<void> {
    // 立即上报一次
    await this.reportLocation(true).catch(() => {
      // 静默失败
    });

    // 设置定期上报
    setInterval(() => {
      this.reportLocation().catch(() => {
        // 静默失败
      });
    }, this.REPORT_INTERVAL);
  }

  /**
   * 停止定期上报
   */
  static async stopPeriodicReporting(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.connection = null;
      } catch (error) {
        // 静默处理错误
      }
    }
  }
}

export default LocationServiceSignalR;

