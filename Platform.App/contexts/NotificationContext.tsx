import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { sseService } from '../services/sseService';
import { authService } from '../services/authService';

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
        onStats: (stats: any) => {
          if (stats && typeof stats.UnreadTotal === 'number') {
            setUnreadCount(stats.UnreadTotal);
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
