import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Badge, Tabs, Button, List, Space, Empty, Spin, Tag, Typography } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import HeaderDropdown from '@/components/HeaderDropdown';
import { useSseConnection } from '@/hooks/useSseConnection';
import { NotificationCategory, NotificationLevel, NotificationStatus, markAsRead, markAsUnread, markAllAsRead, getNotifications, AppNotification } from '@/services/notification/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import styles from './index.less';
import headerStyles from '@/components/RightContent/index.less';

dayjs.extend(relativeTime);

const { Text } = Typography;

const LevelIcon: React.FC<{ level: NotificationLevel }> = ({ level }) => {
  switch (level) {
    case NotificationLevel.Success: return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case NotificationLevel.Warning: return <WarningOutlined style={{ color: '#faad14' }} />;
    case NotificationLevel.Error: return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    default: return <InfoCircleOutlined style={{ color: '#1677ff' }} />;
  }
};

const PAGE_SIZE = 20;

const NoticeIcon: React.FC = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const sseResult = useSseConnection({ enableNotifications: true });
  const notificationState = sseResult.notificationState;
  const { statistics, unreadCount } = notificationState;
  const badgeCount = unreadCount;

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const loadNotifications = useCallback(async (page: number, reset: boolean = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params: any = { page, pageSize: PAGE_SIZE };
      if (activeTab !== 'all') params.search = activeTab;
      if (showUnreadOnly) params.filter = JSON.stringify({ status: [NotificationStatus.Unread] });
      const res = await getNotifications(params);
      if (res.success && res.data) {
        const newList = res.data.queryable || [];
        if (reset) {
          setNotifications(newList);
        } else {
          setNotifications(prev => [...prev, ...newList]);
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
  }, [activeTab, showUnreadOnly]);

  useEffect(() => {
    if (popoverOpen) {
      loadNotifications(1, true);
    }
  }, [popoverOpen, loadNotifications]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    if (scrollHeight - scrollTop - clientHeight < 50 && !loadingMore && hasMore && !loading) {
      loadNotifications(currentPage + 1);
    }
  }, [loadingMore, hasMore, loading, currentPage, loadNotifications]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read' } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsUnread = async (e: React.MouseEvent, id: string) => {
    if (e) e.stopPropagation();
    try {
      await markAsUnread(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Unread' } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async (category?: NotificationCategory) => {
    setLoading(true);
    try {
      await markAllAsRead(category);
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' })));
      setShowUnreadOnly(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const notificationList = (
    <div className={styles.notificationPanel}>
      <div className={styles.notificationHeader}>
        <Text strong>通知中心</Text>
        <Space>
          <Button 
            type={showUnreadOnly ? 'primary' : 'default'} 
            size="small" 
            onClick={() => { setShowUnreadOnly(!showUnreadOnly); isInitialLoad.current = true; }}
          >
            未读
          </Button>
          <Button 
            type="link" 
            size="small" 
            onClick={() => handleMarkAllAsRead()}
            icon={<CheckCircleOutlined />}
          >
            全部已读
          </Button>
        </Space>
      </div>
      
      <div className={styles.notificationList} ref={listRef} onScroll={handleScroll}>
        {loading && notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        ) : notifications.length > 0 ? (
          <>
            <List
              dataSource={notifications}
              renderItem={(item) => (
                <div 
                  className={styles.notificationItem}
                  style={{ opacity: item.status === 'Read' || item.status === 'read' ? 0.6 : 1 }}
                  onClick={(e) => {
                    if (item.status === 'Unread' || item.status === 'unread') {
                      handleMarkAsRead(e, item.id);
                    }
                  }}
                >
                  <div className={`${styles.levelIndicator} ${styles[item.level.toLowerCase()]}`} />
                  <div style={{ marginTop: 4 }}>
                    <LevelIcon level={item.level} />
                  </div>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {item.title}
                      <span style={{ float: 'right', fontWeight: 'normal', fontSize: 10, color: '#999' }}>
                        {dayjs(item.createdAt).fromNow()}
                      </span>
                    </div>
                    <div className={styles.notificationDesc}>{item.content}</div>
<div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color={item.status === 'Unread' || item.status === 'unread' ? 'blue' : 'default'}>{item.category}</Tag>
                      {item.status === 'Read' || item.status === 'read' ? (
                        <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={(e) => handleMarkAsUnread(e, item.id)}>标记为未读</Button>
                      ) : (
                        <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={(e) => handleMarkAsRead(e, item.id)}>标为已读</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
            <div className="notificationLoadMore">
              {loadingMore && <Spin indicator={<LoadingOutlined spin />} />}
              {!hasMore && notifications.length > 0 && <div style={{ color: 'rgba(0,0,0,0.25)', fontSize: 12 }}>没有更多了</div>}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <Empty description="暂无新通知" />
          </div>
        )}
      </div>


    </div>
  );

  return (
    <HeaderDropdown
      key={badgeCount}
      dropdownRender={() => notificationList}
      trigger={['click']}
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottomRight"
    >
      <span className={headerStyles.headerActionButton} key={badgeCount}>
        <Badge 
          count={badgeCount} 
          overflowCount={99} 
          size="small"
          style={{ boxShadow: '0 0 0 1px #fff' }}
        >
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
      </span>
    </HeaderDropdown>
  );
};

export default NoticeIcon;