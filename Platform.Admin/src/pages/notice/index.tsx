import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { useIntl } from '@umijs/max';
import { Badge, Button, Card, Divider, Drawer, Empty, message, Skeleton, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { AppNotification, getNotifications, markAllAsRead, markAsRead } from '@/services/notification/api';

const { Text, Title, Paragraph } = Typography;

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

const levelColorMap: Record<string, string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
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

  const [detailNotification, setDetailNotification] = useState<AppNotification | null>(null);

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

  const handleOpenDetail = async (notification: AppNotification) => {
    setDetailNotification(notification);
    if (notification.status === 'Unread') {
      try {
        await markAsRead(notification.id);
        setNotices((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, status: 'Read' } : n)),
        );
        setDetailNotification((prev) => (prev?.id === notification.id ? { ...prev, status: 'Read' } : prev));
      } catch {
        /* silently ignore */
      }
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
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenDetail(item)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 16,
                  backgroundColor: isUnread ? 'var(--ant-color-primary-bg)' : 'var(--ant-color-fill-tertiary)',
                  borderRadius: 8,
                  border: 'none',
                  borderLeft: `4px solid ${isUnread ? 'var(--ant-color-primary)' : 'var(--ant-color-border-secondary)'}`,
                  marginBottom: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--ant-box-shadow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Space align="start" style={{ width: '100%' }}>
                  {getIcon(item.category)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space>
                      <Title level={5} style={{ margin: 0 }}>
                        {isUnread && <Badge status="processing" style={{ marginRight: 8 }} />}
                        {item.title}
                      </Title>
                      <Tag color={tagInfo.color}>{tagInfo.label}</Tag>
                    </Space>
                    <Divider style={{ margin: '8px 0' }} />
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      <Text type="secondary">{item.content}</Text>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''}
                      </Text>
                    </div>
                  </div>
                </Space>
              </button>
            );
          })
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'pages.notice.empty' })} />
        )}
      </Card>

      <Drawer
        title={
          <Space>
            <NotificationOutlined />
            {detailNotification?.title || ''}
          </Space>
        }
        placement="right"
        open={!!detailNotification}
        onClose={() => setDetailNotification(null)}
        width={560}
      >
        {detailNotification && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {detailNotification.actionUrl && (
              <Button type="link" icon={<InfoCircleOutlined />} href={detailNotification.actionUrl} target="_blank">
                {detailNotification.actionUrl}
              </Button>
            )}

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                分类
              </Text>
              <br />
              <Tag color={getTagInfo(detailNotification.category).color}>
                {getTagInfo(detailNotification.category).label}
              </Tag>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                级别
              </Text>
              <br />
              <Tag color={levelColorMap[detailNotification.level] || 'default'}>
                {detailNotification.level}
              </Tag>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                接收时间
              </Text>
              <br />
              <Text>
                {detailNotification.createdAt
                  ? dayjs(detailNotification.createdAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Text>
            </div>

            {detailNotification.readAt && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已读时间
                </Text>
                <br />
                <Text>
                  {dayjs(detailNotification.readAt).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </div>
            )}

            <Divider style={{ margin: 0 }} />

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                内容
              </Text>
              <Paragraph
                style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: 'var(--ant-color-fill-tertiary)',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {detailNotification.content || '-'}
              </Paragraph>
            </div>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default NoticePage;
