/**
 * SSE 连接管理 Hook
 * 提供统一的 SSE 连接生命周期管理
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { tokenUtils } from '@/utils/token';
import { getApiBaseUrl } from '@/utils/request';

interface UseSseConnectionOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

interface UseSseConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  on: <T = any>(eventName: string, handler: (data: T) => void) => () => void;
  off: (eventName: string) => void;
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
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const isMountedRef = useRef(true);

  // 计算重连延迟（指数退避）
  const getReconnectDelay = useCallback((attempts: number): number => {
    if (attempts === 0) return 1000;
    if (attempts === 1) return 2000;
    if (attempts === 2) return 4000;
    if (attempts === 3) return 8000;
    if (attempts === 4) return 16000;
    return 30000; // 最大 30 秒
  }, []);

  // 连接
  const connect = useCallback(async () => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // 已经连接
    }

    if (eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      return; // 正在连接
    }

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

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
      const url = `${baseUrl}/api/chat/sse?token=${encodeURIComponent(token)}`;

      // 创建 EventSource
      let eventSource: EventSource;
      try {
        eventSource = new EventSource(url);
      } catch (createError) {
        throw new Error(`EventSource 创建失败: ${createError}`);
      }
      eventSourceRef.current = eventSource;

      // 处理 connected 事件，获取 connectionId（必须在 onopen 之前注册）
      eventSource.addEventListener('connected', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.connectionId) {
            setConnectionId(data.connectionId);
          }
        } catch (e) {
          // 忽略解析错误
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
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onConnected?.();
      };

      // 连接错误
      eventSource.onerror = (error) => {
        if (statusCheckTimer) clearTimeout(statusCheckTimer);
        if (!isMountedRef.current) {
          return;
        }

        setIsConnected(false);
        setIsConnecting(false);

        // 如果连接已关闭，尝试重连
        if (eventSource.readyState === EventSource.CLOSED) {
          const delay = getReconnectDelay(reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect().catch((err) => {
                onError?.(err instanceof Error ? err : new Error(String(err)));
              });
            }
          }, delay);
        } else {
          const err = new Error('SSE 连接错误');
          onError?.(err);
        }
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
        'agent_failed',
        'keepalive'
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

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

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

  // 自动连接
  useEffect(() => {
    isMountedRef.current = true;

    if (autoConnect) {
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
  };
}
