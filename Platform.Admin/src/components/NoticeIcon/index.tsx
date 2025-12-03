import { useEffect, useState, useRef } from 'react';
import { Badge } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import { getUnreadStatistics } from '@/services/unified-notification/api';
import { notificationClient } from '@/services/signalr/notificationClient';
import styles from './index.less';

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 初次加载拉取一次未读数，并建立 SignalR 连接
  useEffect(() => {
    const init = async () => {
      try {
        const res = await getUnreadStatistics();
        if (res?.success && res.data) setUnreadCount(res.data.total || 0);
      } catch {}
      await notificationClient.start();

      // 新通知：未读数 +1（仅当 notice.read === false）
      const offCreated = notificationClient.on('NotificationCreated', (notice: any) => {
        if (!notice?.read) setUnreadCount((c) => c + 1);
      });
      // 已读：当前用户标记已读则 -1
      const offRead = notificationClient.on('NotificationRead', (_payload: any) => {
        setUnreadCount((c) => (c > 0 ? c - 1 : 0));
      });

      return () => {
        offCreated();
        offRead();
      };
    };

    const cleanupPromise = init();
    return () => {
      // 移除事件绑定（连接由单例保持，可不主动 stop）
      cleanupPromise.then((cleanup: any) => {
        if (typeof cleanup === 'function') cleanup();
      });
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
