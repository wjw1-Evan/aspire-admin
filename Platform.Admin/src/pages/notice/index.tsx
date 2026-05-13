import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { useIntl } from '@umijs/max';
import { Badge, Button, Card, Divider, Empty, message, Skeleton, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { AppNotification, getNotifications, markAllAsRead } from '@/services/notification/api';

const { Text, Title } = Typography;

const typeMap: Record<string, { label: string; color: string }> = {
  System: { label: '系统', color: 'success' },
  Work: { label: '工作', color: 'blue' },
  Social: { label: '社交', color: 'purple' },
  Security: { label: '安全', color: 'warning' },
};

const typeIconMap: Record<string, React.ReactNode> = {
  System: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  Warning: <WarningOutlined style={{ color: '#faad14' }} />,
  Info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
};

const getIcon = (category: string) => {
  return typeIconMap[category] || <NotificationOutlined style={{ color: '#722ed1' }} />;
};

const getTagInfo = (category: string) => {
  return typeMap[category] || { label: '信息', color: 'default' };
};

const NoticePage: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<AppNotification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notices.filter((n) => n.status === 'Unread').length;

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ page: 1, pageSize: 50 });
      if (res.success && res.data) {
        setNotices(res.data.queryable || []);
      }
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotices((prev) => prev.map((n) => ({ ...n, status: 'Read' })));
      message.success(intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsReadSuccess' }));
    } catch {
      message.error(intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsReadFailed' }));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <PageContainer>
      <Card
        title={
          <Space>
            <NotificationOutlined />
            {intl.formatMessage({ id: 'menu.notice' })}
          </Space>
        }
        extra={
          <Space>
            {unreadCount > 0 && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleMarkAllAsRead} loading={markingAll}>
                {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAllAsRead' })}
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={fetchNotices}>
              {intl.formatMessage({ id: 'pages.common.refresh' })}
            </Button>
          </Space>
        }
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : notices.length > 0 ? (
          notices.map((item) => {
            const tagInfo = getTagInfo(item.category);
            const isUnread = item.status === 'Unread';
            return (
              <div
                key={item.id}
                style={{
                  padding: 16,
                  backgroundColor: isUnread ? '#e6f7ff' : '#fafafa',
                  borderRadius: 8,
                  borderLeft: `4px solid ${isUnread ? '#1890ff' : '#d9d9d9'}`,
                  marginBottom: 8,
                }}
              >
                <Space align="start" style={{ width: '100%' }}>
                  {getIcon(item.category)}
                  <div style={{ flex: 1 }}>
                    <Space>
                      <Title level={5} style={{ margin: 0 }}>
                        {isUnread && <Badge status="processing" style={{ marginRight: 8 }} />}
                        {item.title}
                      </Title>
                      <Tag color={tagInfo.color}>{tagInfo.label}</Tag>
                    </Space>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary">{item.content}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''}
                      </Text>
                    </div>
                  </div>
                </Space>
              </div>
            );
          })
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'pages.notice.empty' })} />
        )}
      </Card>
    </PageContainer>
  );
};

export default NoticePage;
