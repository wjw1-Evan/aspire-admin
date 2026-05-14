import {
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components/es/descriptions';
import { useIntl } from '@umijs/max';
import { Drawer, Progress, Space, Spin, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import type { NotificationSendDetailDto as DetailDto, RecipientReadStatusDto } from '@/services/notification-manage/api';
import { notificationManageApi } from '@/services/notification-manage/api';

const { Text, Paragraph } = Typography;

const categoryTagMap: Record<string, { label: string; color: string }> = {
  System: { label: '系统', color: 'success' },
  Work: { label: '工作', color: 'blue' },
  Social: { label: '社交', color: 'purple' },
  Security: { label: '安全', color: 'warning' },
};

const levelTagMap: Record<string, { label: string; color: string }> = {
  Info: { label: '信息', color: 'blue' },
  Success: { label: '成功', color: 'green' },
  Warning: { label: '警告', color: 'orange' },
  Error: { label: '错误', color: 'red' },
};

const statusTagMap: Record<string, { label: string; color: string }> = {
  Pending: { label: '待发送', color: 'default' },
  Sending: { label: '发送中', color: 'processing' },
  Sent: { label: '发送成功', color: 'success' },
  PartialFailed: { label: '部分失败', color: 'warning' },
  Failed: { label: '发送失败', color: 'error' },
};

interface Props {
  recordId: string | null;
  onClose: () => void;
}

const SendDetailDrawer: React.FC<Props> = ({ recordId, onClose }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DetailDto | null>(null);

  useEffect(() => {
    if (!recordId) return;
    setLoading(true);
    notificationManageApi
      .getDetail(recordId)
      .then((res) => {
        if (res.success && res.data) {
          setDetail(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, [recordId]);

  const readPercent = detail && detail.recipientCount > 0
    ? Math.round((detail.readCount / detail.recipientCount) * 100)
    : 0;

  const recipientColumns = [
    {
      title: intl.formatMessage({ id: 'pages.userManagement.username' }),
      dataIndex: 'userName',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'pages.userManagement.name' }),
      dataIndex: 'displayName',
      width: 120,
      render: (val: string | undefined) => val || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.status' }),
      width: 80,
      render: (_: React.ReactNode, record: RecipientReadStatusDto) =>
        record.isSent ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {intl.formatMessage({ id: 'pages.notificationManagement.status.sent' })}
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            {intl.formatMessage({ id: 'pages.notificationManagement.status.failed' })}
          </Tag>
        ),
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.readStatus' }),
      width: 100,
      render: (_: React.ReactNode, record: RecipientReadStatusDto) =>
        !record.isSent ? (
          <Text type="secondary">-</Text>
        ) : record.isRead ? (
          <Space>
            <CheckCircleFilled style={{ color: '#52c41a' }} />
            <Text type="success">{intl.formatMessage({ id: 'pages.notificationManagement.read' })}</Text>
          </Space>
        ) : (
          <Space>
            <MinusCircleOutlined style={{ color: '#d9d9d9' }} />
            <Text type="secondary">{intl.formatMessage({ id: 'pages.notificationManagement.unread' })}</Text>
          </Space>
        ),
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.readTime' }),
      dataIndex: 'readAt',
      width: 170,
      render: (val: string | undefined) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.errorMessage' }),
      dataIndex: 'errorMessage',
      width: 200,
      render: (val: string | undefined) => (val ? <Text type="danger">{val}</Text> : '-'),
    },
  ];

  const statusLabel = detail
    ? statusTagMap[detail.status]?.label || detail.status
    : '';

  return (
    <Drawer
      title={intl.formatMessage({ id: 'pages.notificationManagement.detailTitle' })}
      open={!!recordId}
      onClose={onClose}
      size="large"
      loading={loading}
    >
      {loading ? (
        <Spin />
      ) : detail ? (
        <>
          <ProDescriptions column={2} bordered size="small">
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.title' })} span={2}>
              {detail.title}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.category' })}>
              <Tag color={categoryTagMap[detail.category]?.color}>
                {categoryTagMap[detail.category]?.label || detail.category}
              </Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.level' })}>
              <Tag color={levelTagMap[detail.level]?.color}>
                {levelTagMap[detail.level]?.label || detail.level}
              </Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.columns.targetType' })}>
              {detail.targetType === 'All'
                ? intl.formatMessage({ id: 'pages.notificationManagement.targetType.allLabel' })
                : intl.formatMessage({ id: 'pages.notificationManagement.targetType.specificLabel' })}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.columns.status' })}>
              <Tag color={statusTagMap[detail.status]?.color}>{statusLabel}</Tag>
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.columns.recipientCount' })}>
              {detail.recipientCount}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.columns.senderName' })}>
              {detail.senderName}
            </ProDescriptions.Item>
            <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.columns.createdAt' })}>
              {detail.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </ProDescriptions.Item>
            {detail.actionUrl && (
              <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.notificationManagement.actionUrl' })} span={2}>
                {detail.actionUrl}
              </ProDescriptions.Item>
            )}
          </ProDescriptions>

          <div style={{ marginTop: 24 }}>
            <Text strong>{intl.formatMessage({ id: 'pages.notificationManagement.content' })}</Text>
            <Paragraph style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
              {detail.content}
            </Paragraph>
          </div>

          <div style={{ marginTop: 24 }}>
            <Text strong>
              {intl.formatMessage({ id: 'pages.notificationManagement.readStatistics' })}
            </Text>
            <div style={{ marginTop: 12, padding: 16, backgroundColor: '#fafafa', borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                <div>
                  <Text type="secondary">{intl.formatMessage({ id: 'pages.notificationManagement.totalCount' })}</Text>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{detail.recipientCount}</div>
                </div>
                <div>
                  <Text type="secondary">{intl.formatMessage({ id: 'pages.notificationManagement.readCount' })}</Text>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{detail.readCount}</div>
                </div>
                <div>
                  <Text type="secondary">{intl.formatMessage({ id: 'pages.notificationManagement.unreadCount' })}</Text>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#d9d9d9' }}>{detail.unreadCount}</div>
                </div>
              </div>
              <Progress percent={readPercent} strokeColor="#52c41a" />
            </div>
          </div>

          {detail.recipientStatus && detail.recipientStatus.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                {intl.formatMessage({ id: 'pages.notificationManagement.recipientStatus' })}
              </Text>
              <Table
                dataSource={detail.recipientStatus}
                columns={recipientColumns}
                rowKey="userId"
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
              />
            </div>
          )}
        </>
      ) : null}
    </Drawer>
  );
};

export default SendDetailDrawer;
