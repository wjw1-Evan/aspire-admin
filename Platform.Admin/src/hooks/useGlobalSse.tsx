import React, { createContext, useContext } from 'react';
import { useSseConnection, NotificationState } from './useSseConnection';

interface GlobalSseContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  connectionId: string | null;
  notificationState: NotificationState;
  on: <T = any>(eventName: string, handler: (data: T) => void) => () => void;
  off: (eventName: string) => void;
}

const GlobalSseContext = createContext<GlobalSseContextValue | null>(null);

export const GlobalSseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sse = useSseConnection({
    autoConnect: true,
    enableNotifications: true,
    onError: (err) => console.warn('[GlobalSSE] 异常:', err),
  });

  return (
    <GlobalSseContext.Provider value={sse}>
      {children}
    </GlobalSseContext.Provider>
  );
};

export function useGlobalSse() {
  const context = useContext(GlobalSseContext);
  if (!context) {
    throw new Error('useGlobalSse 必须在 GlobalSseProvider 内使用');
  }
  return context;
}