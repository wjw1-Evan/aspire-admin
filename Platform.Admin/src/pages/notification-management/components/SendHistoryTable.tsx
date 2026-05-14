import { BellOutlined, EyeOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { useIntl } from '@umijs/max';
import { Button, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import React, { useRef } from 'react';
import type { NotificationSendRecordDto } from '@/services/notification-manage/api';
import { notificationManageApi } from '@/services/notification-manage/api';

interface Props {
  onViewDetail: (id: string) => void;
  refreshKey?: number;
  toolbar?: React.ReactNode;
  search?: string;
  headerStats?: React.ReactNode;
}

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

const SendHistoryTable: React.FC<Props> = ({ onViewDetail, refreshKey, toolbar, search, headerStats }) => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(undefined);

  React.useEffect(() => {
    actionRef.current?.reload();
    void refreshKey;
  }, [refreshKey]);

  const columns: ProColumns<NotificationSendRecordDto>[] = [
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.title' }),
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.category' }),
      dataIndex: 'category',
      width: 80,
      render: (_, record) => {
        const tag = categoryTagMap[record.category] || { label: record.category, color: 'default' };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.level' }),
      dataIndex: 'level',
      width: 80,
      render: (_, record) => {
        const tag = levelTagMap[record.level] || { label: record.level, color: 'default' };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.targetType' }),
      dataIndex: 'targetType',
      width: 100,
      render: (_, record) =>
        record.targetType === 'All'
          ? intl.formatMessage({ id: 'pages.notificationManagement.targetType.allLabel' })
          : intl.formatMessage({ id: 'pages.notificationManagement.targetType.specificLabel' }),
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.recipientCount' }),
      dataIndex: 'recipientCount',
      width: 80,
      align: 'center',
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.successCount' }),
      dataIndex: 'successCount',
      width: 60,
      align: 'center',
      render: (_, record) => <span style={{ color: 'var(--ant-color-success)' }}>{record.successCount}</span>,
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.failCount' }),
      dataIndex: 'failCount',
      width: 60,
      align: 'center',
      render: (_, record) => (record.failCount > 0 ? <span style={{ color: 'var(--ant-color-error)' }}>{record.failCount}</span> : '-'),
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.senderName' }),
      dataIndex: 'senderName',
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.status' }),
      dataIndex: 'status',
      width: 100,
      render: (_, record) => {
        const tag = statusTagMap[record.status] || { label: record.status, color: 'default' };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.createdAt' }),
      dataIndex: 'createdAt',
      width: 170,
      valueType: 'dateTime',
      render: (_, record) =>
        record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.notificationManagement.columns.actions' }),
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => onViewDetail(record.id)}>
          {intl.formatMessage({ id: 'pages.notificationManagement.viewDetail' })}
        </Button>
      ),
    },
  ];

  return (
    <ProTable<NotificationSendRecordDto>
      rowKey="id"
      actionRef={actionRef}
      headerTitle={
        <Space>
          <BellOutlined />
          {intl.formatMessage({ id: 'menu.notification-management' })}
          {headerStats}
        </Space>
      }
      columns={columns}
      request={async (params) => {
        const res = await notificationManageApi.getHistory({ ...params, search });
        return {
          data: res.data?.queryable || [],
          total: res.data?.rowCount || 0,
          success: res.success,
        };
      }}
      search={false}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      scroll={{ x: 1100 }}
      toolBarRender={toolbar ? () => [toolbar] : false}
    />
  );
};

export default SendHistoryTable;
