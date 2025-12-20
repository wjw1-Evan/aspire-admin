import { useEffect, useState } from 'react';
import { Badge } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import { getUnreadStatistics } from '@/services/unified-notification/api';
import styles from './index.less';

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取未读数
  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadStatistics();
      if (res?.success && res.data) {
        setUnreadCount(res.data.total || 0);
      }
    } catch {
      // 静默失败
    }
  };

  // 初次加载和定时轮询未读数（每 10 秒）
  useEffect(() => {
    // 立即获取一次
    fetchUnreadCount();

    // 设置定时器，每 10 秒轮询一次
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 10000);

    // 清理定时器
    return () => {
      clearInterval(intervalId);
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
