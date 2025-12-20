import React from 'react';
import { Avatar, Tag, Typography, Badge, Button, Tooltip, Flex, Space } from 'antd';
import { getUserAvatar } from '@/utils/avatar';
import {
  NotificationOutlined,
  MessageOutlined,
  CalendarOutlined,
  EyeOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import styles from './index.less';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

const typeIcons = {
  notification: <NotificationOutlined />,
  message: <MessageOutlined />,
  event: <CalendarOutlined />,
};

interface NoticeItemProps {
  readonly item: any;
  readonly onClick?: () => void;
  readonly onMarkAsRead?: (item: any) => void;
  readonly onMarkAsUnread?: (item: any) => void;
}

export default function NoticeItem({
  item,
  onClick,
  onMarkAsRead,
  onMarkAsUnread,
}: NoticeItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮，不触发整个 item 的 onClick
    if ((e.target as HTMLElement).closest('.ant-btn')) {
      return;
    }
    onClick?.();
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.(item);
  };

  const handleMarkAsUnread = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsUnread?.(item);
  };

  return (
    <div
      className={`${styles.noticeItem} ${!item.read ? styles.unread : ''}`}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
      }}
    >
      <Flex gap={12} align="flex-start" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <Avatar 
            src={getUserAvatar(item.avatar)} 
            icon={typeIcons[item.type as keyof typeof typeIcons]}
          />
        </div>
        <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.noticeTitle}>
            <span>{item.title}</span>
            {!item.read && <Badge status="processing" />}
          </div>
          <div className={styles.noticeDescription}>
            {item.description && (
              <Text type="secondary">{item.description}</Text>
            )}
            <Text type="secondary" className={styles.noticeTime}>
              {dayjs(item.datetime).fromNow()}
            </Text>
          </div>
          {item.extra && (
            <div className={styles.noticeExtra}>
              {item.status && <Tag color="blue">{item.status}</Tag>}
              {item.extra}
            </div>
          )}
        </Flex>
      </Flex>
      <div style={{ flexShrink: 0, marginLeft: 8 }}>
        {item.read ? (
          <Tooltip title="标记为未读">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleMarkAsUnread}
            />
          </Tooltip>
        ) : (
          <Tooltip title="标记为已读">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={handleMarkAsRead}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}
