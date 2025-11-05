import React, { useState, useMemo } from 'react';
import { Badge, Tabs, Spin, Popover, message } from 'antd';
import { BellOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNoticePolling } from '@/hooks/useNoticePolling';
import {
  markNoticeAsRead,
  markNoticeAsUnread,
  markAllAsRead,
  clearReadNotices,
} from '@/services/notice';
import type { NoticeIconItem } from '@/services/notice';
import NoticeList from './NoticeList';
import NoticeDetailModal from './NoticeDetailModal';
import styles from './index.less';

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeIconItem | null>(
    null,
  );
  const { notices, loading, unreadCount, refetch } = useNoticePolling();

  // 按类型分组（大小写不敏感）
  const { notifications, messages, events } = useMemo(() => {
    return {
      notifications: notices.filter(
        (n) => n.type?.toLowerCase() === 'notification',
      ),
      messages: notices.filter((n) => n.type?.toLowerCase() === 'message'),
      events: notices.filter((n) => n.type?.toLowerCase() === 'event'),
    };
  }, [notices]);

  const handleItemClick = (item: NoticeIconItem) => {
    // 先关闭通知列表
    setVisible(false);

    // 延迟打开详情模态框，确保 Popover 完全关闭
    setTimeout(() => {
      setSelectedNotice(item);
      setDetailModalOpen(true);
    }, 100);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedNotice(null);
  };

  const handleMarkAsRead = async (item: any) => {
    try {
      await markNoticeAsRead(item.id);
      message.success('已标记为已读');

      // 如果是在详情模态框中操作，更新选中的通知状态
      if (selectedNotice?.id === item.id && selectedNotice) {
        setSelectedNotice({ 
          ...selectedNotice, 
          read: true,
          id: selectedNotice.id,
          title: selectedNotice.title,
        });
      }

      refetch();
    } catch (error) {
      console.error('标记已读失败:', error);
      message.error('操作失败，请重试');
    }
  };

  const handleMarkAsUnread = async (item: any) => {
    try {
      await markNoticeAsUnread(item.id);
      message.success('已标记为未读');

      // 如果是在详情模态框中操作，更新选中的通知状态
      if (selectedNotice?.id === item.id && selectedNotice) {
        setSelectedNotice({ 
          ...selectedNotice, 
          read: false,
          id: selectedNotice.id,
          title: selectedNotice.title,
        });
      }

      refetch();
    } catch (error) {
      console.error('标记未读失败:', error);
      message.error('操作失败，请重试');
    }
  };

  const handleClearAll = async (type: string) => {
    try {
      const typeNotices = notices.filter((n) => n.type === type);
      const readIds = typeNotices.filter((n) => n.read).map((n) => n.id);
      if (readIds.length > 0) {
        await clearReadNotices();
        refetch();
      }
    } catch (error) {
      console.error('清空已读失败:', error);
    }
  };

  const handleMarkAllRead = async (type: string) => {
    try {
      const typeNotices = notices.filter((n) => n.type?.toLowerCase() === type);
      const unreadIds = typeNotices.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await markAllAsRead(unreadIds);
        message.success('已全部标记为已读');
        refetch();
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
      message.error('标记失败，请重试');
    }
  };

  const tabs = [
    {
      key: 'notification',
      label: `通知 (${notifications.filter((n) => !n.read).length})`,
      children: (
        <NoticeList
          data={notifications}
          onClick={handleItemClick}
          onMarkAsRead={handleMarkAsRead}
          onMarkAsUnread={handleMarkAsUnread}
          onClear={() => handleClearAll('notification')}
          onMarkAllRead={() => handleMarkAllRead('notification')}
          emptyText="暂无通知"
        />
      ),
    },
    {
      key: 'message',
      label: `消息 (${messages.filter((n) => !n.read).length})`,
      children: (
        <NoticeList
          data={messages}
          onClick={handleItemClick}
          onMarkAsRead={handleMarkAsRead}
          onMarkAsUnread={handleMarkAsUnread}
          onClear={() => handleClearAll('message')}
          onMarkAllRead={() => handleMarkAllRead('message')}
          emptyText="暂无消息"
        />
      ),
    },
    {
      key: 'event',
      label: `待办 (${events.filter((n) => !n.read).length})`,
      children: (
        <NoticeList
          data={events}
          onClick={handleItemClick}
          onMarkAsRead={handleMarkAsRead}
          onMarkAsUnread={handleMarkAsUnread}
          onClear={() => handleClearAll('event')}
          onMarkAllRead={() => handleMarkAllRead('event')}
          emptyText="暂无待办"
        />
      ),
    },
  ];

  const noticeContent = (
    <div className={styles.noticePopover}>
      <Spin spinning={loading} indicator={<LoadingOutlined />}>
        <Tabs items={tabs} />
      </Spin>
    </div>
  );

  return (
    <>
      <Popover
        content={noticeContent}
        placement="bottomRight"
        trigger="click"
        open={visible}
        onOpenChange={setVisible}
      >
        <span className={styles.noticeButton}>
          <Badge count={unreadCount} overflowCount={99}>
            <BellOutlined style={{ fontSize: 18 }} />
          </Badge>
        </span>
      </Popover>

      <NoticeDetailModal
        open={detailModalOpen}
        notice={selectedNotice}
        onClose={handleCloseDetail}
        onMarkAsRead={handleMarkAsRead}
        onMarkAsUnread={handleMarkAsUnread}
      />
    </>
  );
}
