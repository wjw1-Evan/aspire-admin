/**
 * SignalR 连接管理 Hook
 * 提供统一的 SignalR 连接生命周期管理
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { tokenUtils } from '@/utils/token';

interface UseSignalRConnectionOptions {
  hubUrl: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

interface UseSignalRConnectionReturn {
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  on: <T = any>(methodName: string, newMethod: (...args: T[]) => void) => void;
  off: (methodName: string) => void;
  invoke: <T = any>(methodName: string, ...args: any[]) => Promise<T>;
}

/**
 * 创建 SignalR 连接
 */
function createConnection(hubUrl: string): signalR.HubConnection {
  const token = tokenUtils.getToken();

  if (process.env.NODE_ENV === 'development') {
    console.log('[SignalR] 创建连接:', {
      hubUrl,
      hasToken: !!token,
      tokenLength: token?.length,
    });
  }

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => {
        const currentToken = tokenUtils.getToken();
        if (process.env.NODE_ENV === 'development') {
          console.log('[SignalR] accessTokenFactory 被调用，token 长度:', currentToken?.length);
        }
        return currentToken || '';
      },
      skipNegotiation: false,
      // 强制使用 LongPolling，避免代理链 WS 升级问题（待代理稳定后可改回 WebSockets | LongPolling）
      transport: signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        // 指数退避策略：1s, 2s, 4s, 8s, 16s, 30s, 30s...
        const retryCount = retryContext.previousRetryCount ?? 0;
        if (retryCount === 0) {
          return 1000;
        }
        if (retryCount === 1) {
          return 2000;
        }
        if (retryCount === 2) {
          return 4000;
        }
        if (retryCount === 3) {
          return 8000;
        }
        if (retryCount === 4) {
          return 16000;
        }
        return 30000;
      },
    })
    .withHubProtocol(new signalR.JsonHubProtocol())
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // 添加连接状态变化的日志
  connection.onreconnecting((error) => {
    console.warn('[SignalR] 重新连接中...', error?.message);
  });

  connection.onreconnected(() => {
    console.log('[SignalR] ✅ 重新连接成功');
  });

  connection.onclose((error) => {
    // 正常关闭时 error 为 undefined，异常关闭时 error 有值
    if (error) {
      // 异常关闭：网络错误、服务器关闭等
      console.warn('[SignalR] 连接异常关闭:', error.message || '未知错误');
    } else {
      // 正常关闭：主动断开连接
      if (process.env.NODE_ENV === 'development') {
        console.log('[SignalR] 连接正常关闭');
      }
    }
  });

  return connection;
}

/**
 * SignalR 连接管理 Hook
 * @param options 连接选项
 * @returns 连接管理接口
 */
export function useSignalRConnection(
  options: UseSignalRConnectionOptions
): UseSignalRConnectionReturn {
  const {
    hubUrl,
    onConnected,
    onDisconnected,
    onError,
    autoConnect = true,
  } = options;

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // 连接
  const connect = useCallback(async () => {
    // 检查连接状态，避免重复连接
    if (connectionRef.current) {
      const state = connectionRef.current.state;
      
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
        try {
          setIsConnecting(true);
          await connectionRef.current.start();
          setIsConnected(true);
          setIsConnecting(false);
          onConnected?.();
          return;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          setIsConnecting(false);
          onError?.(err);
          console.error('SignalR 重新连接失败:', err);
          throw err;
        }
      }
    }

    try {
      setIsConnecting(true);

      // 创建新连接
      if (!connectionRef.current) {
        connectionRef.current = createConnection(hubUrl);

        // 连接成功
        connectionRef.current.on('connected', () => {
          setIsConnected(true);
          setIsConnecting(false);
          onConnected?.();
        });

        // 连接断开
        connectionRef.current.onclose(() => {
          setIsConnected(false);
          setIsConnecting(false);
          onDisconnected?.();
        });

        // 重新连接
        connectionRef.current.onreconnected(() => {
          setIsConnected(true);
          setIsConnecting(false);
          onConnected?.();
        });

        // 重新连接中
        connectionRef.current.onreconnecting(() => {
          setIsConnecting(true);
        });
      }

      // 确保连接处于 Disconnected 状态后再启动
      if (connectionRef.current.state === signalR.HubConnectionState.Disconnected) {
        await connectionRef.current.start();
        setIsConnected(true);
        setIsConnecting(false);
        onConnected?.();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setIsConnecting(false);
      onError?.(err);
      
      // 详细的错误日志
      if (process.env.NODE_ENV === 'development') {
        console.error('[SignalR] ❌ 连接失败:', {
          message: err.message,
          stack: err.stack,
          hubUrl,
          hasToken: !!tokenUtils.getToken(),
        });
      } else {
        console.error('SignalR 连接失败:', err.message);
      }
      
      throw err;
    }
  }, [hubUrl, onConnected, onDisconnected, onError]);

  // 断开连接
  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.stop();
        setIsConnected(false);
        onDisconnected?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        console.error('SignalR 断开连接失败:', err);
      }
    }
  }, [onDisconnected, onError]);

  // 监听事件
  const on = useCallback(
    <T = any,>(methodName: string, newMethod: (...args: T[]) => void) => {
      if (connectionRef.current) {
        connectionRef.current.on(methodName, newMethod);
      }
    },
    []
  );

  // 取消监听事件
  const off = useCallback((methodName: string) => {
    if (connectionRef.current) {
      connectionRef.current.off(methodName);
    }
  }, []);

  // 调用服务器方法
  const invoke = useCallback(
    async <T = any,>(methodName: string, ...args: any[]): Promise<T> => {
      if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR 连接未建立');
      }
      return connectionRef.current.invoke<T>(methodName, ...args);
    },
    []
  );

  // 自动连接
  useEffect(() => {
    let isMounted = true;

    if (autoConnect) {
      connect().catch((error) => {
        if (isMounted) {
          console.error('自动连接失败:', error);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [autoConnect, connect]);

  // 组件卸载时清理连接
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().catch((error) => {
          console.error('清理 SignalR 连接失败:', error);
        });
      }
    };
  }, []);

  return {
    connection: connectionRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    on,
    off,
    invoke,
  };
}

