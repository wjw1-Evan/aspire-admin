import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Card,
  Tag,
  Typography,
  Button,
  Empty,
  Badge,
  Space,
  Divider,
  Skeleton,
} from 'antd';
import {
  NotificationOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'announcement' | 'warning' | 'info';
  isRead: boolean;
  createdAt: string;
}

const NoticePage: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      setTimeout(() => {
        setNotices([
          {
            id: '1',
            title: '系统维护通知',
            content: '系统将于今晚 22:00-24:00 进行例行维护，期间部分功能可能无法使用。',
            type: 'system',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: '功能更新公告',
            content: '新增菜单管理功能，管理员可以查看系统菜单结构。',
            type: 'announcement',
            isRead: false,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
        setLoading(false);
      }, 500);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <NotificationOutlined style={{ color: '#722ed1' }} />;
    }
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'success';
      case 'warning':
        return 'warning';
      case 'info':
        return 'blue';
      default:
        return 'purple';
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
          <Button icon={<ReloadOutlined />} onClick={fetchNotices}>
            {intl.formatMessage({ id: 'pages.common.refresh' })}
          </Button>
        }
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : notices.length > 0 ? (
          notices.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    backgroundColor: item.isRead ? '#fafafa' : '#e6f7ff',
                    borderRadius: 8,
                    borderLeft: `4px solid ${
                      item.isRead ? '#d9d9d9' : '#1890ff'
                    }`,
                  }}
                >
                  <Space align="start" style={{ width: '100%' }}>
                    {getIcon(item.type)}
                    <div style={{ flex: 1 }}>
                      <Space>
                        <Title level={5} style={{ margin: 0 }}>
                          {!item.isRead && (
                            <Badge status="processing" style={{ marginRight: 8 }} />
                          )}
                          {item.title}
                        </Title>
                        <Tag color={getTagColor(item.type)}>
                          {item.type === 'system'
                            ? '系统'
                            : item.type === 'announcement'
                            ? '公告'
                            : item.type === 'warning'
                            ? '警告'
                            : '信息'}
                        </Tag>
                      </Space>
                      <Divider style={{ margin: '8px 0' }} />
                      <Text type="secondary">{item.content}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </div>
              ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={intl.formatMessage({ id: 'pages.notice.empty' })}
          />
        )}
      </Card>
    </PageContainer>
  );
};

export default NoticePage;
