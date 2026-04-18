import { useEffect, useRef, useCallback, useState } from 'react';
import { tokenUtils } from '@/utils/token';
import { getApiBaseUrl } from '@/utils/request';
import { NotificationCategory, NotificationStatistics, AppNotification, getNotificationStatistics } from '@/services/notification/api';
import { notification } from 'antd';

export interface NotificationState {
  unreadCount: number;
  statistics: NotificationStatistics;
  latestNotifications: AppNotification[];
}

export function useNotificationStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<NotificationState>({
    unreadCount: 0,
    statistics: { System: 0, Work: 0, Social: 0, Security: 0, Total: 0 },
    latestNotifications: [],
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getNotificationStatistics();
      if (res.success && res.data) {
        setState(s => ({ 
          ...s, 
          statistics: res.data!, 
          unreadCount: res.data!.Total 
        }));
      }
    } catch (e) {
      console.error('Failed to fetch notification stats', e);
    }
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = tokenUtils.getToken();
    if (!token) return;

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/apiservice/api/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      fetchStats();
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      // 指数退避重连逻辑
      setTimeout(connect, 5000);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'Connected') {
          console.log('Notification SSE Connected, connectionId:', data.connectionId);
          if (data.statistics) {
             setState(s => ({ ...s, statistics: data.statistics, unreadCount: data.statistics.Total }));
          }
        } else if (data.type === 'NewNotification') {
          const newNotif = data.notification as AppNotification;
          setState(s => ({
            ...s,
            unreadCount: s.unreadCount + 1,
            latestNotifications: [newNotif, ...s.latestNotifications].slice(0, 10),
            statistics: {
              ...s.statistics,
              [newNotif.category]: (s.statistics[newNotif.category] || 0) + 1,
              Total: s.statistics.Total + 1
            }
          }));

          // 弹出全局 Toast
          notification[newNotif.level.toLowerCase() as 'info' | 'success' | 'warning' | 'error']({
            message: newNotif.title,
            description: newNotif.content,
            placement: 'bottomRight',
          });
        } else if (data.type === 'StatsUpdate') {
          setState(s => ({
            ...s,
            statistics: data.statistics,
            unreadCount: data.statistics.Total
          }));
        }
      } catch (e) {
        console.error('Parse SSE message failed', e);
      }
    };
  }, [fetchStats]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    ...state,
    isConnected,
    refreshStats: fetchStats
  };
}
