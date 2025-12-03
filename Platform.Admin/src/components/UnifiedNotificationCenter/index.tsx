import { useEffect, useState } from 'react';
import { Drawer, List, Button, Tag, Space, Empty, Spin, Badge } from 'antd';
import { BellOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useIntl } from '@umijs/max';
import {
  getUnifiedNotifications,
  markAsRead,
  getUnreadStatistics,
  type UnifiedNotificationItem,
} from '@/services/unified-notification/api';
import { notificationClient } from '@/services/signalr/notificationClient';
import styles from './index.less';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface UnifiedNotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const UnifiedNotificationCenter: React.FC<UnifiedNotificationCenterProps> = ({
  visible,
  onClose,
}) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UnifiedNotificationItem[]>([]);
  const [unreadTotal, setUnreadTotal] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const filterType = 'all';
  const sortBy = 'datetime';

  const t = (id: string, def: string) => intl.formatMessage({ id, defaultMessage: def });

  // 获取未读统计（仅 total）
  const fetchUnreadStats = async () => {
    try {
      const response = await getUnreadStatistics();
      if (response.success && response.data) {
        setUnreadTotal(response.data.total ?? 0);
      }
    } catch {
      // 静默失败
    }
  };

  // 获取通知列表
  const fetchUnifiedNotifications = async () => {
    setLoading(true);
    try {
      const response = await getUnifiedNotifications(page, pageSize, filterType, sortBy);
      if (response.success && response.data) {
        setNotifications(response.data.items);
        setTotal(response.data.total);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    fetchUnreadStats();
    fetchUnifiedNotifications();

    // 订阅 SignalR 推送
    const bind = async () => {
      await notificationClient.start();
      const offCreated = notificationClient.on('NotificationCreated', (notice: any) => {
        // 追加到列表首位
        setNotifications((prev) => [
          {
            id: notice.id,
            title: notice.title,
            description: notice.description,
            avatar: notice.avatar,
            extra: notice.extra,
            status: notice.status,
            datetime: notice.datetime,
            type: notice.type,
            read: notice.read,
            clickClose: notice.clickClose,
            taskId: notice.taskId,
            taskPriority: notice.taskPriority,
            taskStatus: notice.taskStatus,
            isSystemMessage: notice.isSystemMessage,
            messagePriority: notice.messagePriority,
            actionType: notice.actionType,
            relatedUserIds: notice.relatedUserIds,
          },
          ...prev,
        ]);
        setTotal((t) => t + 1);
        if (!notice?.read) setUnreadTotal((c) => c + 1);
      });

      const offRead = notificationClient.on('NotificationRead', (payload: any) => {
        const id = payload?.id;
        if (!id) return;
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadTotal((c) => (c > 0 ? c - 1 : 0));
      });

      return () => {
        offCreated();
        offRead();
      };
    };

    const cleanerPromise = bind();
    return () => {
      cleanerPromise.then((cleanup: any) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [visible, page, pageSize]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      fetchUnifiedNotifications();
      fetchUnreadStats();
    } catch {
      // 静默失败
    }
  };

  const getPriorityTag = (priority?: number) => {
    const map: Record<number, { label: string; color: string }> = {
      0: { label: t('pages.unifiedNotificationCenter.priority.low', '低'), color: 'blue' },
      1: { label: t('pages.unifiedNotificationCenter.priority.medium', '中'), color: 'orange' },
      2: { label: t('pages.unifiedNotificationCenter.priority.high', '高'), color: 'red' },
      3: { label: t('pages.unifiedNotificationCenter.priority.urgent', '紧急'), color: 'volcano' },
    };
    if (priority === undefined || priority === null) return null;
    return <Tag color={map[priority]?.color}>{map[priority]?.label}</Tag>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Task':
        return <FileTextOutlined />;
      case 'System':
        return <AlertOutlined />;
      default:
        return <BellOutlined />;
    }
  };

  const renderItem = (item: UnifiedNotificationItem) => (
    <List.Item
      key={item.id}
      className={!item.read ? styles.unread : ''}
      actions={[
        !item.read && (
          <Button type="text" size="small" onClick={() => handleMarkAsRead(item.id)}>
            {t('pages.unifiedNotificationCenter.markAsRead', '标记已读')}
          </Button>
        ),
      ]}
    >
      <List.Item.Meta
        avatar={getTypeIcon(item.type)}
        title={
          <Space>
            <span>{item.title}</span>
            {!item.read && <Badge status="processing" />}
            {item.taskPriority !== undefined && getPriorityTag(item.taskPriority)}
          </Space>
        }
        description={
          <div>
            <p>{item.description}</p>
            <small>{dayjs(item.datetime).fromNow()}</small>
          </div>
        }
      />
    </List.Item>
  );

  return (
    <Drawer
      title={t('pages.unifiedNotificationCenter.title', '通知中心')}
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <span>
            {t('pages.unifiedNotificationCenter.all', '全部')}
          </span>
          <Badge count={unreadTotal} size="small" />
        </Space>
      </div>
      <Spin spinning={loading}>
        <List
          dataSource={notifications}
          renderItem={renderItem}
          locale={{ emptyText: <Empty description={t('pages.unifiedNotificationCenter.noNotifications', '暂无通知')} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Spin>
    </Drawer>
  );
};

export default UnifiedNotificationCenter;
