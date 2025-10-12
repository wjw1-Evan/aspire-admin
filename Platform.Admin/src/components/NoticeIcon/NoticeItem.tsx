import React from 'react';
import { List, Avatar, Tag, Typography, Badge } from 'antd';
import { NotificationOutlined, MessageOutlined, CalendarOutlined } from '@ant-design/icons';
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
}

export default function NoticeItem({ item, onClick }: NoticeItemProps) {
  return (
    <List.Item
      className={`${styles.noticeItem} ${!item.read ? styles.unread : ''}`}
      onClick={onClick}
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
            {item.description && <Text type="secondary">{item.description}</Text>}
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

