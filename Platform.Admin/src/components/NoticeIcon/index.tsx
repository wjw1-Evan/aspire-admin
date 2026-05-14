import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useIntl, useNavigate } from '@umijs/max';
import { Badge, Button, Empty, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import HeaderDropdown from '@/components/HeaderDropdown';
import { useHeaderStyles } from '@/components/RightContent/styles';
import { useSseConnection } from '@/hooks/useSseConnection';
import {
  AppNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  NotificationCategory,
  NotificationLevel,
} from '@/services/notification/api';
import { useNoticeStyles } from './styles';

dayjs.extend(relativeTime);

const { Text } = Typography;

const LevelIcon: React.FC<{ level: NotificationLevel }> = ({ level }) => {
  switch (level) {
    case NotificationLevel.Success:
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case NotificationLevel.Warning:
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case NotificationLevel.Error:
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    default:
      return <InfoCircleOutlined style={{ color: '#1677ff' }} />;
  }
};

const PAGE_SIZE = 20;

const NoticeIcon: React.FC = () => {
  const { styles: noticeStyles } = useNoticeStyles();
  const { styles: headerBtnStyles } = useHeaderStyles();
  const intl = useIntl();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const sseResult = useSseConnection({ enableNotifications: true });
  const notificationState = sseResult.notificationState;
  const { statistics, unreadCount } = notificationState;
  const badgeCount = unreadCount;

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, _setActiveTab] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const total = statistics.Total;
  const isInitialLoad = useRef(true);

  const loadNotifications = useCallback(
    async (page: number, reset: boolean = false) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const params: any = { page, pageSize: PAGE_SIZE };
        if (activeTab !== 'all') params.search = activeTab;
        if (showUnreadOnly) params.filter = { status: 'Unread' };
        const res = await getNotifications(params);
        if (res.success && res.data) {
          const newList = res.data.queryable || [];
          if (reset) {
            setNotifications(newList);
          } else {
            setNotifications((prev) => [...prev, ...newList]);
          }
          setHasMore(newList.length === PAGE_SIZE);
          setCurrentPage(page);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isInitialLoad.current = false;
      }
    },
    [activeTab, showUnreadOnly],
  );

  useEffect(() => {
    if (popoverOpen) {
      loadNotifications(1, true);
    }
  }, [popoverOpen, loadNotifications]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < 50 && !loadingMore && hasMore && !loading) {
        loadNotifications(currentPage + 1);
      }
    },
    [loadingMore, hasMore, loading, currentPage, loadNotifications],
  );

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'Read' } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsUnread = async (e: React.MouseEvent, id: string) => {
    if (e) e.stopPropagation();
    try {
      await markAsUnread(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'Unread' } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async (category?: NotificationCategory) => {
    setLoading(true);
    try {
      await markAllAsRead(category);
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'Read' })));
      setShowUnreadOnly(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const notificationList = (
    <div className={noticeStyles.notificationPanel}>
      <div className={noticeStyles.notificationHeader}>
        <Text strong style={{ fontSize: 16 }}>
          {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.title' })}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {unreadCount > 0 && (
            <Button
              type={showUnreadOnly ? 'primary' : 'default'}
              size="small"
              style={{ marginRight: 4 }}
              onClick={() => {
                setShowUnreadOnly(!showUnreadOnly);
                isInitialLoad.current = true;
              }}
            >
              {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.unread' })}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={() => handleMarkAllAsRead()} icon={<CheckCircleOutlined />}>
              {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAllAsRead' })}
            </Button>
          )}
        </div>
      </div>
      <div className={noticeStyles.notificationStats}>
        <span style={{ color: '#1677ff' }}>
          {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.unreadCount' }, { count: unreadCount })}
        </span>
        <span style={{ color: '#52c41a' }}>
          {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.readCount' }, { count: total - unreadCount })}
        </span>
        <span>{intl.formatMessage({ id: 'pages.unifiedNotificationCenter.totalCount' }, { count: total })}</span>
      </div>

      <div className={noticeStyles.notificationList} ref={listRef} onScroll={handleScroll}>
        {loading && notifications.length === 0 ? (
          <div className={noticeStyles.emptyState}>
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        ) : notifications.length > 0 ? (
          <>
            {notifications.map((item) => (
              <div
                key={item.id}
                className={noticeStyles.notificationItem}
                style={{ opacity: item.status === 'Read' || item.status === 'read' ? 0.6 : 1 }}
                onClick={(e) => {
                  if (item.actionUrl) {
                    const separator = item.actionUrl.includes('?') ? '&' : '?';
                    navigate(`${item.actionUrl}${separator}_t=${Date.now()}`);
                    setPopoverOpen(false);
                  } else if (item.status === 'Unread' || item.status === 'unread') {
                    handleMarkAsRead(e, item.id);
                  }
                }}
              >
                <div
                  className={`${noticeStyles.levelIndicator} ${noticeStyles[item.level.toLowerCase() as keyof typeof noticeStyles]}`}
                />
                <div style={{ marginTop: 4 }}>
                  <LevelIcon level={item.level} />
                </div>
                <div className={noticeStyles.notificationContent}>
                  <div className={noticeStyles.notificationTitle}>
                    {item.title}
                    <span style={{ float: 'right', fontWeight: 'normal', fontSize: 10, color: '#999' }}>
                      {dayjs(item.createdAt).fromNow()}
                    </span>
                  </div>
                  <div className={noticeStyles.notificationDesc}>{item.content}</div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={item.status === 'Unread' || item.status === 'unread' ? 'blue' : 'default'}>
                      {item.category}
                    </Tag>
                    {item.status === 'Read' || item.status === 'read' ? (
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0, fontSize: 12 }}
                        onClick={(e) => handleMarkAsUnread(e, item.id)}
                      >
                        {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsUnread' })}
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0, fontSize: 12 }}
                        onClick={(e) => handleMarkAsRead(e, item.id)}
                      >
                        {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsRead' })}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="notificationLoadMore">
              {loadingMore && <Spin indicator={<LoadingOutlined spin />} />}
              {!hasMore && notifications.length > 0 && (
                <div style={{ color: 'rgba(0,0,0,0.25)', fontSize: 12 }}>
                  {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.noMore' })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={noticeStyles.emptyState}>
            <Empty description={intl.formatMessage({ id: 'pages.unifiedNotificationCenter.noNewNotifications' })} />
          </div>
        )}
      </div>
      <Button
        type="link"
        block
        className={noticeStyles.notificationFooter}
        onClick={() => {
          navigate('/notice');
          setPopoverOpen(false);
        }}
      >
        {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.viewAll' })}
      </Button>
    </div>
  );

  return (
    <HeaderDropdown
      dropdownRender={() => notificationList}
      trigger={['click']}
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottomRight"
    >
      <span className={headerBtnStyles.headerActionButton}>
        <Badge count={badgeCount} overflowCount={99} size="small" style={{ boxShadow: '0 0 0 1px #fff' }}>
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
      </span>
    </HeaderDropdown>
  );
};

export default NoticeIcon;
