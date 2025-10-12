import React from 'react';
import { List, Button, Space } from 'antd';
import { DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import NoticeItem from './NoticeItem';
import styles from './index.less';

interface NoticeListProps {
  readonly data: any[];
  readonly onClick?: (item: any) => void;
  readonly onMarkAsRead?: (item: any) => void;
  readonly onMarkAsUnread?: (item: any) => void;
  readonly onClear?: () => void;
  readonly onMarkAllRead?: () => void;
  readonly emptyText?: string;
}

export default function NoticeList({
  data,
  onClick,
  onMarkAsRead,
  onMarkAsUnread,
  onClear,
  onMarkAllRead,
  emptyText = '暂无数据',
}: NoticeListProps) {
  const hasUnread = data.some(item => !item.read);
  const hasRead = data.some(item => item.read);

  return (
    <div className={styles.noticeList}>
      <List
        dataSource={data}
        renderItem={(item) => (
          <NoticeItem 
            item={item} 
            onClick={() => onClick?.(item)}
            onMarkAsRead={onMarkAsRead}
            onMarkAsUnread={onMarkAsUnread}
          />
        )}
        locale={{ emptyText }}
      />
      {data.length > 0 && (
        <div className={styles.noticeActions}>
          <Space>
            {hasUnread && (
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={onMarkAllRead}
              >
                全部已读
              </Button>
            )}
            {hasRead && (
              <Button
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                onClick={onClear}
                danger
              >
                清空已读
              </Button>
            )}
          </Space>
        </div>
      )}
    </div>
  );
}

