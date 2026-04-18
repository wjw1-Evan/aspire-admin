import React, { useState, useCallback, useMemo } from 'react';
import { Badge, Tabs, Button, List, Space, Empty, Spin, Tag, Typography } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import HeaderDropdown from '@/components/HeaderDropdown';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { NotificationCategory, NotificationLevel, markAsRead, markAllAsRead, AppNotification } from '@/services/notification/api';
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
  const { statistics, unreadCount, latestNotifications, refreshStats } = useNotificationStream();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      refreshStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async (category?: NotificationCategory) => {
    setLoading(true);
    try {
      await markAllAsRead(category);
      refreshStats();
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
                onClick={() => handleMarkAsRead(item.id)}
              >
                <div className={`${styles.levelIndicator} ${styles[item.level.toLowerCase()]}`} />
                <div style={{ marginTop: 4 }}>
                  <LevelIcon level={item.level} />
                </div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationTitle}>
                    {item.title}
                    <span style={{ float: 'right', fontWeight: 'normal', fontSize: 10, color: '#999' }}>
                      {dayjs(item.datetime).fromNow()}
                    </span>
                  </div>
                  <div className={styles.notificationDesc}>{item.content}</div>
                  <div style={{ marginTop: 4 }}>
                    <Tag size="small" color="blue">{item.category}</Tag>
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
      dropdownRender={() => notificationList}
      trigger={['click']}
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottomRight"
    >
      <span className={headerStyles.headerActionButton}>
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