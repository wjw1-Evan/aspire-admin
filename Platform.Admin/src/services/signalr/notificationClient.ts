import * as signalR from '@microsoft/signalr';
import { tokenUtils } from '@/utils/token';

/**
 * Notification SignalR client (singleton)
 */
class NotificationClient {
  private connection: signalR.HubConnection | null = null;
  private started = false;
  private subscribers: Record<string, Set<(...args: any[]) => void>> = {
    NotificationCreated: new Set(),
    NotificationRead: new Set(),
  };

  public on(event: 'NotificationCreated' | 'NotificationRead', handler: (...args: any[]) => void) {
    this.subscribers[event].add(handler);
    if (this.connection) {
      this.connection.on(event, handler);
    }
    return () => this.off(event, handler);
  }

  public off(event: 'NotificationCreated' | 'NotificationRead', handler: (...args: any[]) => void) {
    this.subscribers[event].delete(handler);
    if (this.connection) {
      this.connection.off(event, handler);
    }
  }

  /** 建立连接（幂等） */
  public async start(): Promise<void> {
    if (this.started) return;
    // 通过 Umi 代理：/api -> 网关 /apiservice => ApiService /hubs/notification
    const hubUrl = '/hubs/notification';

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => tokenUtils.getToken() || '',
        transport: signalR.HttpTransportType.LongPolling,
        skipNegotiation: false,
      })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => 2000 })
      .configureLogging(signalR.LogLevel.None)
      .build();

    // 绑定已注册的订阅者
    for (const event of Object.keys(this.subscribers)) {
      for (const handler of this.subscribers[event as keyof typeof this.subscribers]) {
        this.connection.on(event, handler as any);
      }
    }

    try {
      await this.connection.start();
      this.started = true;
    } catch (err) {
      // 首次失败延迟重试一次
      setTimeout(() => this.connection?.start().then(() => (this.started = true)).catch(() => {}), 2000);
    }
  }

  public async stop(): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.stop();
    } catch {}
    this.started = false;
  }
}

export const notificationClient = new NotificationClient();

