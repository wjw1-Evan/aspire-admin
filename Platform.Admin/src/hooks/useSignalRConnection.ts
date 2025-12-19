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
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => {
        return tokenUtils.getToken() || '';
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
    .configureLogging(signalR.LogLevel.None)
    .build();

  // 连接状态变化处理（不输出日志）
  connection.onreconnecting(() => {
    // 重新连接中，由自动重连机制处理
  });

  connection.onreconnected(() => {
    // 重新连接成功
  });

  connection.onclose(() => {
    // 连接关闭处理
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
  // 用于跟踪是否正在协商，防止在协商期间停止连接
  const isNegotiatingRef = useRef(false);

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
          isNegotiatingRef.current = true;
          await connectionRef.current.start();
          isNegotiatingRef.current = false;
          // 启动成功后检查状态
          if (connectionRef.current.state === signalR.HubConnectionState.Connected) {
            setIsConnected(true);
            setIsConnecting(false);
            onConnected?.();
          } else {
            setIsConnecting(false);
          }
          return;
        } catch (error) {
          isNegotiatingRef.current = false;
          const err = error instanceof Error ? error : new Error(String(error));
          setIsConnecting(false);
          setIsConnected(false);
          onError?.(err);
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
      // 在启动前再次检查状态，避免竞态条件
      const currentState = connectionRef.current.state;
      if (currentState === signalR.HubConnectionState.Disconnected) {
        try {
          isNegotiatingRef.current = true;
          await connectionRef.current.start();
          isNegotiatingRef.current = false;
          // 启动成功后再次检查状态，确保连接成功
          if (connectionRef.current.state === signalR.HubConnectionState.Connected) {
            setIsConnected(true);
            setIsConnecting(false);
            onConnected?.();
          }
        } catch (startError) {
          isNegotiatingRef.current = false;
          // 如果启动失败，确保状态正确
          setIsConnecting(false);
          setIsConnected(false);
          throw startError;
        }
      } else if (currentState === signalR.HubConnectionState.Connected) {
        // 如果已经连接，直接更新状态
        setIsConnected(true);
        setIsConnecting(false);
      } else {
        // 其他状态（Connecting/Reconnecting），等待自动完成
        setIsConnecting(true);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setIsConnecting(false);
      onError?.(err);
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

  // 自动连接（延迟建立，不阻塞页面渲染）
  useEffect(() => {
    let isMounted = true;
    let connectPromise: Promise<void> | null = null;
    let connectTimer: NodeJS.Timeout | null = null;

    if (autoConnect) {
      // 检查是否已经有连接或正在连接
      if (connectionRef.current) {
        const state = connectionRef.current.state;
        if (state === signalR.HubConnectionState.Connected ||
            state === signalR.HubConnectionState.Connecting ||
            state === signalR.HubConnectionState.Reconnecting) {
          // 已经连接或正在连接，不需要再次连接
          return;
        }
      }

      // 延迟建立连接，让页面先渲染（延迟 300-800ms，避免多个连接同时建立）
      const delay = Math.random() * 500 + 300; // 300-800ms 随机延迟
      connectTimer = setTimeout(() => {
        if (isMounted) {
          connectPromise = connect().catch((error) => {
            // 如果组件已卸载或正在协商时被停止，忽略错误
            // 错误已通过 onError 回调处理
          });
        }
      }, delay);
    }

    return () => {
      isMounted = false;
      if (connectTimer) {
        clearTimeout(connectTimer);
      }
      // 如果连接正在进行，取消它（但不在协商阶段强制停止）
      if (connectPromise && connectionRef.current && isNegotiatingRef.current) {
        // 标记为不需要连接，让协商自然失败
        isNegotiatingRef.current = false;
      }
    };
  }, [autoConnect, connect]);

  // 组件卸载时清理连接
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        const state = connectionRef.current.state;
        
        // 如果正在协商，标记为不再需要连接，让协商自然失败或完成后再清理
        if (isNegotiatingRef.current || state === signalR.HubConnectionState.Connecting) {
          // 设置标志，让连接知道组件已卸载
          isNegotiatingRef.current = false;
          // 不立即停止，让协商自然完成或失败
          // 如果协商成功，连接会在下次检查时被清理
          // 如果协商失败，连接会自动进入 Disconnected 状态
          return;
        }
        
        // 只有在连接已建立时才停止，避免在协商或连接中停止
        if (state === signalR.HubConnectionState.Connected) {
          connectionRef.current.stop().catch(() => {
            // 忽略清理错误，这是正常的清理行为
          });
        }
        // 如果状态是 Disconnected，不需要停止
        // 如果状态是 Reconnecting，让自动重连机制处理，不要强制停止
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

