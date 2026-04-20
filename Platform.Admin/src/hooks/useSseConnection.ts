/**
 * SSE 连接管理 Hook
 * 提供统一的 SSE 连接生命周期管理（单例模式）
 * 支持 HMR 热更新后自动重连
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { tokenUtils } from '@/utils/token';
import { getApiBaseUrl } from '@/utils/request';
import { notification } from 'antd';
import { NotificationCategory, NotificationStatistics, AppNotification } from '@/services/notification/api';

// 全局单例 EventSource（所有组件共享）
let globalEventSource: EventSource | null = null;
let globalConnectionId: string | null = null;
let globalIsConnected = false;
let globalEventHandlers: Map<string, Set<(data: any) => void>> = new Map();
let globalAutoConnectAttempted = false;

// 全局状态（供所有 hook 实例共享）
const globalNotificationState: NotificationState = {
  unreadCount: 0,
  statistics: { System: 0, Work: 0, Social: 0, Security: 0, Total: 0 },
};

// HMR 检测：使用 sessionStorage 标记来跨 HMR 持久化状态
const HMR_SESSION_KEY = 'sse_hmr_refresh_' + (window.location.pathname || '');
let lastHmrTime = 0;
try {
  lastHmrTime = parseInt(sessionStorage.getItem(HMR_SESSION_KEY) || '0', 10);
} catch (e) { }

// 检查是否刚发生 HMR（当前时间与 sessionStorage 时间接近）
const isAfterHmr = Date.now() - lastHmrTime < 2000;
if (isAfterHmr) {
  // 刚发生 HMR，需要重连
  globalAutoConnectAttempted = false;
  globalIsConnected = false;
  globalEventSource = null;
  globalConnectionId = null;
  // 重置通知状态
  globalNotificationState.unreadCount = 0;
  globalNotificationState.statistics = { System: 0, Work: 0, Social: 0, Security: 0, Total: 0 };
}

function notifyAllListeners() {
  globalEventHandlers.forEach((handlers) => {
    handlers.forEach((handler) => handler(null));
  });
}

interface UseSseConnectionOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
  enableNotifications?: boolean;
}

export interface NotificationState {
  unreadCount: number;
  statistics: NotificationStatistics;
}

interface UseSseConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  on: <T = any>(eventName: string, handler: (data: T) => void) => () => void;
  off: (eventName: string) => void;
  notificationState: NotificationState;
}

/**
 * SSE 连接管理 Hook
 * @param options 连接选项
 * @returns 连接管理接口
 */
export function useSseConnection(
  options: UseSseConnectionOptions
): UseSseConnectionReturn {
  const {
    onConnected,
    onDisconnected,
    onError,
    autoConnect = true,
    enableNotifications = false,
  } = options;

  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(globalConnectionId);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(globalEventHandlers);
  const isMountedRef = useRef(true);

  // 检查是否已存在全局连接
  const eventSourceRef = useRef<EventSource | null>(globalEventSource);
  const [notificationState, setNotificationState] = useState<NotificationState>(globalNotificationState);

  // 计算重连延迟（指数退避）
  const getReconnectDelay = useCallback((attempts: number): number => {
    if (attempts === 0) return 1000;
    if (attempts === 1) return 2000;
    if (attempts === 2) return 4000;
    if (attempts === 3) return 8000;
    if (attempts === 4) return 16000;
    return 30000; // 最大 30 秒
  }, []);

// 连接（单例模式）
  const connect = useCallback(async () => {
    // 检查全局是否已连接
    if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
      eventSourceRef.current = globalEventSource;
      return;
    }

    if (globalEventSource && globalEventSource.readyState === EventSource.CONNECTING) {
      eventSourceRef.current = globalEventSource;
      return;
    }

    // 关闭旧连接
    if (globalEventSource) {
      globalEventSource.close();
    }

    // 重置全局状态
    globalEventSource = null;
    globalConnectionId = null;
    globalIsConnected = false;

    setIsConnecting(true);
    reconnectAttemptsRef.current = 0;

    let statusCheckTimer: NodeJS.Timeout | null = null;

    try {
      const token = tokenUtils.getToken();
      if (!token) {
        const error = new Error('未找到认证令牌');
        throw error;
      }

      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/apiservice/api/stream/sse?token=${encodeURIComponent(token)}`;

      // 创建 EventSource
      let eventSource: EventSource;
      try {
        eventSource = new EventSource(url);
      } catch (createError) {
        console.error('[SSE] EventSource 创建失败:', createError);
        throw new Error(`EventSource 创建失败: ${createError}`);
      }
      eventSourceRef.current = eventSource;

      // 处理 connected 事件，获取 connectionId（必须在 onopen 之前注册）
      eventSource.addEventListener('connected', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.connectionId) {
              setConnectionId(data.connectionId);
              globalConnectionId = data.connectionId;
            }
          } catch (e) {
            onConnected?.();
          }
        });

      // 添加连接超时检查（5秒）
      statusCheckTimer = setTimeout(() => {
        if (eventSourceRef.current === eventSource && eventSource.readyState === EventSource.CONNECTING) {
          setIsConnecting(false);
          setIsConnected(false);
          eventSource.close();
          eventSourceRef.current = null;
          const err = new Error('SSE 连接超时');
          onError?.(err);
        }
      }, 5000);

// 连接打开
      eventSource.onopen = () => {
        if (statusCheckTimer) clearTimeout(statusCheckTimer);
        if (!isMountedRef.current) {
          eventSource.close();
          return;
        }

        setIsConnected(true);
        globalIsConnected = true;
        setIsConnecting(false);

        // 保存全局 EventSource
        globalEventSource = eventSource;
      };

      // 监听通知相关事件（仅当 enableNotifications 为 true 时）
      if (enableNotifications) {
        eventSource.addEventListener('connected', (event: MessageEvent) => {
          try {
            const data = event.data ? JSON.parse(event.data) : null;
            if (data?.connectionId) {
              setConnectionId(data.connectionId);
            }
          } catch (e) { }
        });

        eventSource.addEventListener('notification', (event: MessageEvent) => {
          try {
            const data = event.data ? JSON.parse(event.data) : null;
            if (!data?.notification) return;
            console.info('[SSE] 收到新通知推送:', data.notification);
            const newNotif = data.notification as AppNotification;
            // 弹出全局 Toast（统计更新由 stats 事件统一处理）
            notification[newNotif.level.toLowerCase() as 'info' | 'success' | 'warning' | 'error']({
              message: newNotif.title,
              description: newNotif.content,
              placement: 'bottomRight',
            });
          } catch (e) {
            console.error('Parse notification failed', e);
          }
        });

        eventSource.addEventListener('stats', (event: MessageEvent) => {
          try {
            const data = event.data ? JSON.parse(event.data) : null;
            const rawStats = data?.statistics ?? data?.Statistics;
            if (rawStats) {
              const newState: NotificationState = {
                statistics: { ...rawStats },
                unreadCount: rawStats.Total ?? 0,
              };
              Object.assign(globalNotificationState, newState);
              setNotificationState(() => newState);
            }
          } catch (e) { console.error('[SSE] stats 解析失败:', e); }
        });
      }

      // 连接错误
      eventSource.onerror = (error) => {
        // 静默处理，仅在需要调试时启用
        // console.error('[SSE] onerror, readyState:', eventSource.readyState);
        if (statusCheckTimer) clearTimeout(statusCheckTimer);
        if (!isMountedRef.current) {
          return;
        }

        setIsConnected(false);
        setIsConnecting(false);

        // 重置全局状态，触发重连
        globalEventSource = null;
        globalIsConnected = false;

        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect().catch((err) => {
              onError?.(err instanceof Error ? err : new Error(String(err)));
            });
          }
        }, delay);
      };

      // 监听自定义事件并分发到注册的处理器
      const eventNames = [
        'ReceiveMessage',
        'MessageChunk',
        'MessageComplete',
        'SessionUpdated',
        'MessageDeleted',
        'SessionRead',
        'agent_update',
        'agent_track',
        'agent_complete',
        'agent_failed'
      ];
      eventNames.forEach(eventName => {
        eventSource.addEventListener(eventName, (event: MessageEvent) => {
          const handlers = eventHandlersRef.current.get(eventName);
          if (handlers) {
            try {
              const data = event.data ? JSON.parse(event.data) : null;
              handlers.forEach((handler) => {
                try {
                  handler(data);
                } catch (e) {
                  // 忽略处理器错误
                }
              });
            } catch (e) {
              // 忽略解析错误
            }
          }
        });
      });

      // 监听默认的 'message' 事件 (没有任何 event 头的 data)
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = event.data ? JSON.parse(event.data) : null;
          // 如果 data 中有 type，则尝试寻找特定 type 的 handler，否则调用 'message' handler
          const handlers = (data?.type && eventHandlersRef.current.get(data.type)) || eventHandlersRef.current.get('message');
          handlers?.forEach((handler: (data: any) => void) => handler(data));
        } catch (e) { }
      };
    } catch (error) {
      setIsConnecting(false);
      setIsConnected(false);
      if (statusCheckTimer) clearTimeout(statusCheckTimer);
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err;
    }
  }, [onConnected, onError, getReconnectDelay]);

  // 断开连接（全局）
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 关闭全局连接
    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = null;
    }

    globalIsConnected = false;
    globalConnectionId = null;

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionId(null);
    onDisconnected?.();
  }, [onDisconnected]);

  // 监听事件，返回清理函数
  const on = useCallback(<T = any,>(eventName: string, handler: (data: T) => void) => {
    if (!eventHandlersRef.current.has(eventName)) {
      eventHandlersRef.current.set(eventName, new Set());
    }
    eventHandlersRef.current.get(eventName)!.add(handler as (data: any) => void);

    // 返回清理函数
    return () => {
      const handlers = eventHandlersRef.current.get(eventName);
      if (handlers) {
        handlers.delete(handler as (data: any) => void);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventName);
        }
      }
    };
  }, []);

  // 取消监听事件（移除所有处理器）
  const off = useCallback((eventName: string) => {
    eventHandlersRef.current.delete(eventName);
  }, []);

  // 自动连接（仅第一个组件尝试连接）
  useEffect(() => {
    isMountedRef.current = true;

    if (autoConnect && !globalAutoConnectAttempted) {
      globalAutoConnectAttempted = true;

      // 延迟连接，避免阻塞渲染
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          connect().catch(() => {
            // 错误已通过 onError 回调处理
          });
        }
      }, 300);

      return () => {
        clearTimeout(timer);
      };
    }

    return () => { }; // Return empty cleanup function when autoConnect is false
  }, [autoConnect, connect]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      eventHandlersRef.current.clear();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionId,
    connect,
    disconnect,
    on,
    off,
    notificationState,
  };
}
