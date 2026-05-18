import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { sseService } from '../services/sseService';
import { authService } from '../services/authService';
import { NotificationStatistics } from '../types/notification';

interface NotificationContextType {
  unreadCount: number;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refresh: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const res = await notificationService.getStatistics();
    if (res.success && res.data) {
      setUnreadCount(res.data.UnreadTotal);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const authenticated = await authService.isAuthenticated();
      if (!authenticated) return;

      await refresh();

      sseService.setBaseHandlers({
        onStats: (stats: unknown) => {
          const s = stats as Partial<NotificationStatistics>;
          if (s && typeof s.UnreadTotal === 'number') {
            setUnreadCount(s.UnreadTotal);
          }
        },
        onConnected: () => {},
        onError: () => {},
      });

      sseService.ensureConnected();
    };

    init();

    const onAuth = (authenticated: boolean) => {
      if (authenticated) {
        refresh();
        sseService.ensureConnected();
      }
    };
    authService.addAuthListener(onAuth);

    return () => {
      authService.removeAuthListener(onAuth);
      sseService.disconnect();
    };
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
