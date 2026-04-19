import React, { useState, useCallback, useMemo } from 'react';
import { Badge, Tabs, Button, List, Space, Empty, Spin, Tag, Typography } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import HeaderDropdown from '@/components/HeaderDropdown';
import { useSseConnection } from '@/hooks/useSseConnection';
import { NotificationCategory, NotificationLevel, NotificationStatus, markAsRead, markAsUnread, markAllAsRead, AppNotification } from '@/services/notification/api';
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

const NoticeIcon: React.FC = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const sseResult = useSseConnection({ enableNotifications: true });
  const notificationState = sseResult.notificationState;
  const { statistics, unreadCount, latestNotifications } = notificationState;
  
  console.log('[NoticeIcon] 渲染, unreadCount:', unreadCount, 'statistics:', statistics, 'latestNotifications:', latestNotifications?.length);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsUnread = async (e: React.MouseEvent, id: string) => {
    if (e) e.stopPropagation();
    try {
      await markAsUnread(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async (category?: NotificationCategory) => {
    setLoading(true);
    try {
      await markAllAsRead(category);
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
            type="link" 
            size="small" 
            onClick={() => handleMarkAllAsRead()}
            icon={<CheckCircleOutlined />}
          >
            全部已读
          </Button>
        </Space>
      </div>
      
      <div className={styles.notificationList}>
        {latestNotifications.length > 0 ? (
          <List
            dataSource={latestNotifications}
            renderItem={(item) => (
              <div 
                className={styles.notificationItem}
                style={{ opacity: item.status === NotificationStatus.Read ? 0.6 : 1 }}
                onClick={(e) => {
                  if (item.status === NotificationStatus.Unread) {
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
                    <Tag color={item.status === NotificationStatus.Unread ? 'blue' : 'default'}>{item.category}</Tag>
                    {item.status === NotificationStatus.Read ? (
                      <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={(e) => handleMarkAsUnread(e, item.id)}>标记为未读</Button>
                    ) : (
                      <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={(e) => handleMarkAsRead(e, item.id)}>标为已读</Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        ) : (
          <div className={styles.emptyState}>
            <Empty description="暂无新通知" />
          </div>
        )}
      </div>

      <div className={styles.notificationFooter}>
        <Button type="link" block onClick={() => { /* Navigate to full page */ }}>
          查看所有
        </Button>
      </div>
    </div>
  );

  return (
    <HeaderDropdown
      key={unreadCount}
      dropdownRender={() => notificationList}
      trigger={['click']}
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottomRight"
    >
      <span className={headerStyles.headerActionButton} key={unreadCount}>
        <Badge 
          count={unreadCount} 
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