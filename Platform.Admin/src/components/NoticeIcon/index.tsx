import { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from 'antd';
import HeaderDropdown from '@/components/HeaderDropdown';
import { BellOutlined } from '@ant-design/icons';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import UnifiedNotificationList from '@/components/UnifiedNotificationCenter/UnifiedNotificationList';
import { getUnreadStatistics, UnreadCountStatistics } from '@/services/unified-notification/api';
import headerStyles from '@/components/RightContent/index.less';
import { tokenUtils } from '@/utils/token';
import { getApiBaseUrl } from '@/utils/request';

function getReconnectDelay(attempts: number): number {
  if (attempts === 0) return 1000;
  if (attempts === 1) return 2000;
  if (attempts === 2) return 4000;
  if (attempts === 3) return 8000;
  if (attempts === 4) return 16000;
  return 30000;
}

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadStatistics();
      if (res?.success && res.data) {
        setUnreadCount(res.data.total || 0);
      }
    } catch {
      // 静默失败
    }
  }, []);

  const connectSse = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN ||
        eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const token = tokenUtils.getToken();
    if (!token) return;

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/notification/sse?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!isMountedRef.current) {
        eventSource.close();
        return;
      }
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = () => {
      if (!isMountedRef.current) return;

      if (eventSource.readyState === EventSource.CLOSED) {
        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectSse();
          }
        }, delay);
      }
    };

    eventSource.addEventListener('NotificationUpdated', (event: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data: UnreadCountStatistics = event.data ? JSON.parse(event.data) : null;
        if (data) {
          setUnreadCount(data.total || 0);
        }
      } catch {
        // 忽略解析错误
      }
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    fetchUnreadCount();
    connectSse();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fetchUnreadCount, connectSse]);

  const popoverContent = (
    <div style={{ width: 420 }}>
      <UnifiedNotificationList
        pageSize={5}
        showPagination={false}
        maxHeight={400}
        onItemClick={() => setPopoverOpen(false)}
      />
      <div
        style={{
          textAlign: 'center',
          padding: '12px 0 4px',
          borderTop: '1px solid #f0f0f0',
          marginTop: 8,
        }}
      >
        <a
          onClick={() => {
            setPopoverOpen(false);
            setVisible(true);
          }}
        >
          查看全部通知
        </a>
      </div>
    </div>
  );

  return (
    <>
      <HeaderDropdown
        dropdownRender={() => (
          <div>
            {popoverContent}
          </div>
        )}
        trigger={['hover']}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomRight"
      >
        <span className={headerStyles.headerActionButton} onClick={() => setVisible(true)}>
          <Badge count={unreadCount} overflowCount={99}>
            <BellOutlined />
          </Badge>
        </span>
      </HeaderDropdown>

      <UnifiedNotificationCenter open={visible} onClose={() => setVisible(false)} />
    </>
  );
}