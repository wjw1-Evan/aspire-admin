import React, { useState, useMemo } from 'react';
import { Badge, Tabs, Spin, Popover } from 'antd';
import { BellOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNoticePolling } from '@/hooks/useNoticePolling';
import { markNoticeAsRead, markAllAsRead, clearReadNotices } from '@/services/notice';
import NoticeList from './NoticeList';
import styles from './index.less';

export default function NoticeIcon() {
  const [visible, setVisible] = useState(false);
  const { notices, loading, unreadCount, refetch } = useNoticePolling();

  // 按类型分组
  const { notifications, messages, events } = useMemo(() => {
    return {
      notifications: notices.filter(n => n.type === 'notification'),
      messages: notices.filter(n => n.type === 'message'),
      events: notices.filter(n => n.type === 'event'),
    };
  }, [notices]);

  const handleItemClick = async (item: any) => {
    if (!item.read) {
      try {
        await markNoticeAsRead(item.id);
        refetch();
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }
    // 处理点击逻辑（如跳转）
  };

  const handleClearAll = async (type: string) => {
    try {
      const typeNotices = notices.filter(n => n.type === type);
      const readIds = typeNotices.filter(n => n.read).map(n => n.id);
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
      const typeNotices = notices.filter(n => n.type === type);
      const unreadIds = typeNotices.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await markAllAsRead(unreadIds);
        refetch();
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  const tabs = [
    {
      key: 'notification',
      label: `通知 (${notifications.filter(n => !n.read).length})`,
      children: (
        <NoticeList
          data={notifications}
          onClick={handleItemClick}
          onClear={() => handleClearAll('notification')}
          onMarkAllRead={() => handleMarkAllRead('notification')}
          emptyText="暂无通知"
        />
      ),
    },
    {
      key: 'message',
      label: `消息 (${messages.filter(n => !n.read).length})`,
      children: (
        <NoticeList
          data={messages}
          onClick={handleItemClick}
          onClear={() => handleClearAll('message')}
          onMarkAllRead={() => handleMarkAllRead('message')}
          emptyText="暂无消息"
        />
      ),
    },
    {
      key: 'event',
      label: `待办 (${events.filter(n => !n.read).length})`,
      children: (
        <NoticeList
          data={events}
          onClick={handleItemClick}
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
  );
}

