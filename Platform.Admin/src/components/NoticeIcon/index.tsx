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
  
  // 使用 ref 存储清理函数引用和挂载状态，确保异步函数可以访问到最新的值
  const cleanupRef = useRef<{
    offCreated: (() => void) | null;
    offRead: (() => void) | null;
  }>({
    offCreated: null,
    offRead: null,
  });
  // 使用 ref 存储挂载状态，确保异步函数可以访问到最新的值
  const isMountedRef = useRef(true);

  // 初次加载拉取一次未读数，并建立 SignalR 连接
  useEffect(() => {
    let initTimer: NodeJS.Timeout | null = null;
    isMountedRef.current = true;

    // 延迟建立连接，让页面先渲染，不阻塞页面加载
    initTimer = setTimeout(() => {
      const init = async () => {
        // 检查组件是否已卸载（使用 ref 确保访问到最新值）
        if (!isMountedRef.current) return;

        try {
          const res = await getUnreadStatistics();
          // 在异步操作后再次检查组件是否已卸载
          if (!isMountedRef.current) return;
          if (res?.success && res.data) {
            setUnreadCount(res.data.total || 0);
          }
        } catch {}
        
        // 非阻塞方式建立连接，不等待连接完成
        // 注意：start() 是异步的，但不等待它完成
        notificationClient.start().catch(() => {
          // 连接失败由自动重连机制处理
        });

        // 在注册事件监听器之前再次检查组件是否已卸载
        // 这是关键检查：防止在异步操作期间组件卸载后仍然注册监听器
        if (!isMountedRef.current) return;

        // 新通知：未读数 +1（仅当 notice.read === false）
        // 立即存储清理函数引用到 ref，确保清理函数可以访问
        cleanupRef.current.offCreated = notificationClient.on('NotificationCreated', (notice: any) => {
          // 在事件处理器中也检查挂载状态
          if (isMountedRef.current && !notice?.read) {
            setUnreadCount((c) => c + 1);
          }
        });
        // 已读：当前用户标记已读则 -1
        cleanupRef.current.offRead = notificationClient.on('NotificationRead', (_payload: any) => {
          // 在事件处理器中也检查挂载状态
          if (isMountedRef.current) {
            setUnreadCount((c) => (c > 0 ? c - 1 : 0));
          }
        });
      };

      init();
    }, 500); // 延迟 500ms，让页面先渲染

    // useEffect 清理函数：清理定时器和事件监听器
    return () => {
      // 首先设置挂载标志为 false，防止后续异步操作注册新的监听器
      isMountedRef.current = false;
      
      // 清理定时器
      if (initTimer) {
        clearTimeout(initTimer);
      }
      
      // 清理事件监听器（使用 ref 确保能访问到最新的引用）
      // 即使异步函数还在执行，这里也能清理已注册的监听器
      if (cleanupRef.current.offCreated) {
        cleanupRef.current.offCreated();
        cleanupRef.current.offCreated = null;
      }
      if (cleanupRef.current.offRead) {
        cleanupRef.current.offRead();
        cleanupRef.current.offRead = null;
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
