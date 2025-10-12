import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotices } from '@/services/notice';
import type { NoticeIconItem } from '@/services/notice';

const POLL_INTERVAL = 30000; // 30秒轮询一次

export function useNoticePolling() {
  const [notices, setNotices] = useState<NoticeIconItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNotices();
      if (response && response.success && response.data) {
        setNotices(response.data);
        setUnreadCount(response.data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    // 立即执行一次
    fetchNotices();
    
    // 设置定时轮询
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(fetchNotices, POLL_INTERVAL);
  }, [fetchNotices]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return {
    notices,
    loading,
    unreadCount,
    refetch: fetchNotices,
    startPolling,
    stopPolling,
  };
}

