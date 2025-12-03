import { useEffect, useState, type MouseEvent } from 'react';
import { Drawer, List, Tag, Space, Empty, Spin, Badge, Avatar, Tooltip } from 'antd';
import { BellOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useIntl, history } from '@umijs/max';
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

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'Task':
        return { icon: <FileTextOutlined />, color: '#1890ff' };
      case 'System':
        return { icon: <AlertOutlined />, color: '#faad14' };
      default:
        return { icon: <BellOutlined />, color: '#52c41a' };
    }
  };

  const getTargetPath = (item: UnifiedNotificationItem) => {
    // 依据通知类型和携带的业务ID，跳转到对应页面
    if (item.type === 'Task' && item.taskId) {
      return `/task-management?taskId=${encodeURIComponent(item.taskId)}`;
    }
    // TODO: 可扩展更多类型的跳转映射，如用户、消息、系统设置等
    return '/';
  };

  const handleItemClick = async (item: UnifiedNotificationItem) => {
    try {
      if (!item.read) {
        await markAsRead(item.id);
        setNotifications((prev) => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
        setUnreadTotal(c => (c > 0 ? c - 1 : 0));
      }
    } catch {
      // 静默失败，不阻塞跳转
    } finally {
      const basePath = getTargetPath(item);
      const loc = history?.location as { pathname?: string; search?: string } | undefined;
      const current = `${loc?.pathname ?? ''}${loc?.search ?? ''}`;
      // 若与当前地址完全一致，附加一次性参数强制触发路由变化
      const target = current === basePath
        ? `${basePath}${basePath.includes('?') ? '&' : '?'}nt=${Date.now()}`
        : basePath;
      history.push(target);
      onClose?.();
    }
  };

  const renderItem = (item: UnifiedNotificationItem) => (
    <List.Item
      key={item.id}
      className={`${styles.notificationItem} ${!item.read ? styles.unread : ''}`}
      onClick={() => handleItemClick(item)}
    >
      <List.Item.Meta
        avatar={(() => {
          const meta = getTypeMeta(item.type);
          const avatar = (
            <Avatar style={{ backgroundColor: meta.color }} icon={meta.icon} />
          );
          return (
            <Tooltip title={item.type}>
              {item.read ? (
                avatar
              ) : (
                <Badge dot offset={[-2, 2]}>
                  {avatar}
                </Badge>
              )}
            </Tooltip>
          );
        })()}
        title={
          <div className={styles.itemHeader}>
              <div className={styles.itemHeaderLeft}>
                <Space>
                  <span className={styles.title}>{item.title}</span>
                  {!item.read && <Badge status="processing" />}
                  {item.taskPriority !== undefined && getPriorityTag(item.taskPriority)}
                </Space>
              </div>
              <div className={styles.itemHeaderRight}>
                <Tooltip title={dayjs(item.datetime).format('YYYY-MM-DD HH:mm:ss')}>
                  <small className={styles.time}>{dayjs(item.datetime).fromNow()}</small>
                </Tooltip>
              </div>
            </div>
        }
        description={
          <div className={styles.itemDesc}>
            <p>{item.description}</p>
          </div>
        }
      />
    </List.Item>
  );

  return (
    <Drawer
      title={<Space size="small"><span>{t('pages.unifiedNotificationCenter.title', '通知中心')}</span><Badge count={unreadTotal} size="small" /></Space>}
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      styles={{ body: { padding: 8, background: '#fafafa' } }}
    >
      <Spin spinning={loading}>
        <List
          dataSource={notifications}
          renderItem={renderItem}
          split={false}
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
