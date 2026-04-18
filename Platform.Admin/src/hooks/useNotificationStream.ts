import { useEffect, useRef, useCallback, useState } from 'react';
import { tokenUtils } from '@/utils/token';
import { getApiBaseUrl } from '@/utils/request';
import { NotificationCategory, NotificationStatistics, AppNotification } from '@/services/notification/api';
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
      console.info('[SSE] 通知流已连接');
      setIsConnected(true);
    };

    es.onerror = (err) => {
      console.error('[SSE] 通知流连接发生异常, 5秒后尝试重连:', err);
      setIsConnected(false);
      es.close();
      // 指数退避重连逻辑
      setTimeout(connect, 5000);
    };

    es.onmessage = (event) => {
      try {
        if (event.data === ': ping') {
           // 心跳包，静默处理
           return;
        }
        console.debug('[SSE] 收到原始数据包:', event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'Connected') {
          console.info('[SSE] 会话已就绪, 连接ID:', data.connectionId);
          setState(s => ({ 
             ...s, 
             statistics: data.statistics || s.statistics, 
             unreadCount: data.statistics?.Total ?? s.unreadCount,
             latestNotifications: data.latestNotifications || s.latestNotifications
          }));
        } else if (data.type === 'NewNotification') {
          console.info('[SSE] 收到新通知推送:', data.notification);
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
            unreadCount: data.statistics.Total ?? s.unreadCount,
            latestNotifications: data.latestNotifications || s.latestNotifications
          }));
        }
      } catch (e) {
        console.error('Parse SSE message failed', e);
      }
    };
  }, []);

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
  };
}

