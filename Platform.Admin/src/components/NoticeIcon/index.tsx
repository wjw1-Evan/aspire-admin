import { useEffect, useState, useRef } from 'react';
import { Badge } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import { getUnreadStatistics } from '@/services/unified-notification/api';
import styles from './index.less';

const POLL_INTERVAL = 30000; // 30秒轮询一次

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUnread = async () => {
    try {
      const res = await getUnreadStatistics();
      if (res?.success && res.data) {
        setUnreadCount(res.data.total || 0);
      }
    } catch (e) {
      // 静默失败
    }
  };

  useEffect(() => {
    fetchUnread();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <>
      <span className={styles.noticeButton} onClick={() => setVisible(true)}>
        <Badge count={unreadCount} overflowCount={99}>
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
      </span>

      <UnifiedNotificationCenter
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
