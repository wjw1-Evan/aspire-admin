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
    let initTimer: NodeJS.Timeout | null = null;
    let offCreated: (() => void) | null = null;
    let offRead: (() => void) | null = null;
    let isMounted = true;

    // 延迟建立连接，让页面先渲染，不阻塞页面加载
    initTimer = setTimeout(() => {
      const init = async () => {
        // 检查组件是否已卸载
        if (!isMounted) return;

        try {
          const res = await getUnreadStatistics();
          if (res?.success && res.data && isMounted) {
            setUnreadCount(res.data.total || 0);
          }
        } catch {}
        
        // 非阻塞方式建立连接，不等待连接完成
        notificationClient.start().catch(() => {
          // 连接失败由自动重连机制处理
        });

        // 检查组件是否已卸载（可能在异步操作期间卸载）
        if (!isMounted) return;

        // 新通知：未读数 +1（仅当 notice.read === false）
        offCreated = notificationClient.on('NotificationCreated', (notice: any) => {
          if (isMounted && !notice?.read) {
            setUnreadCount((c) => c + 1);
          }
        });
        // 已读：当前用户标记已读则 -1
        offRead = notificationClient.on('NotificationRead', (_payload: any) => {
          if (isMounted) {
            setUnreadCount((c) => (c > 0 ? c - 1 : 0));
          }
        });
      };

      init();
    }, 500); // 延迟 500ms，让页面先渲染

    // useEffect 清理函数：清理定时器和事件监听器
    return () => {
      isMounted = false;
      // 清理定时器
      if (initTimer) {
        clearTimeout(initTimer);
      }
      // 清理事件监听器
      if (offCreated) {
        offCreated();
      }
      if (offRead) {
        offRead();
      }
    };
  }, []);

  return (
    <>
      <span className={styles.noticeButton} onClick={() => setVisible(true)}>
        <Badge count={unreadCount} overflowCount={99}>
          <BellOutlined />
        </Badge>
      </span>

      <UnifiedNotificationCenter
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
