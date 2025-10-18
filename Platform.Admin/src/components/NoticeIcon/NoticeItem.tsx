import React from 'react';
import { List, Avatar, Tag, Typography, Badge, Button, Tooltip } from 'antd';
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
    <List.Item
      className={`${styles.noticeItem} ${!item.read ? styles.unread : ''}`}
      onClick={handleClick}
      actions={[
        item.read ? (
          <Tooltip title="标记为未读" key="unread">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleMarkAsUnread}
            />
          </Tooltip>
        ) : (
          <Tooltip title="标记为已读" key="read">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={handleMarkAsRead}
            />
          </Tooltip>
        ),
      ]}
    >
      <List.Item.Meta
        avatar={
          item.avatar ? (
            <Avatar src={item.avatar} />
          ) : (
            <Avatar icon={typeIcons[item.type as keyof typeof typeIcons]} />
          )
        }
        title={
          <div className={styles.noticeTitle}>
            <span>{item.title}</span>
            {!item.read && <Badge status="processing" />}
          </div>
        }
        description={
          <div className={styles.noticeDescription}>
            {item.description && (
              <Text type="secondary">{item.description}</Text>
            )}
            <Text type="secondary" className={styles.noticeTime}>
              {dayjs(item.datetime).fromNow()}
            </Text>
          </div>
        }
      />
      {item.extra && (
        <div className={styles.noticeExtra}>
          {item.status && <Tag color="blue">{item.status}</Tag>}
          {item.extra}
        </div>
      )}
    </List.Item>
  );
}
