import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components/es/descriptions';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { useIntl } from '@umijs/max';
import { Badge, Button, Drawer, Grid, Input, message, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppNotification,
  getNotificationStatistics,
  getNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
} from '@/services/notification/api';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const categoryColorMap: Record<string, string> = {
  System: 'success',
  Work: 'blue',
  Social: 'purple',
  Security: 'warning',
};

const levelColorMap: Record<string, string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
};

const levelIconMap: Record<string, React.ReactNode> = {
  info: <InfoCircleOutlined style={{ color: '#1677ff' }} />,
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  warning: <WarningOutlined style={{ color: '#faad14' }} />,
  error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
};

interface Stats {
  unread: number;
  total: number;
}

const NoticePage: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [state, setState] = useState({
    detailVisible: false,
    viewingNotification: null as AppNotification | null,
    search: '' as string,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial })), []);

  const [statistics, setStatistics] = useState<Stats>({ unread: 0, total: 0 });

  const loadStatistics = useCallback(() => {
    getNotificationStatistics().then((res) => {
      if (res.success && res.data) {
        setStatistics({
          unread: res.data.UnreadTotal || 0,
          total: res.data.Total || 0,
        });
      }
    });
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      actionRef.current?.reload();
      loadStatistics();
    } catch {
      /* silently ignore */
    }
  };

  const handleView = (record: AppNotification) => {
    set({ viewingNotification: record, detailVisible: true });
    if (record.status === 'unread') {
      markAsRead(record.id).then(() => {
        actionRef.current?.reload();
        loadStatistics();
      });
    }
  };

  const columns: ProColumns<AppNotification>[] = [
    {
      title: intl.formatMessage({ id: 'pages.notice.table.title' }),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (_, record) => (
        <Space>
          {record.status === 'unread' && <Badge status="processing" />}
          <a onClick={() => handleView(record)}>{record.title}</a>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.notice.table.category' }),
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (_, record) => (
        <Tag color={categoryColorMap[record.category] || 'default'}>{record.category}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.notice.table.level' }),
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <span style={{ color: levelColorMap[record.level] }}>
            {levelIconMap[record.level]}
          </span>
          <Text type="secondary">{record.level}</Text>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.notice.table.time' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      valueType: 'dateTime',
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 160,
render: (_, record) => (
         <Space size={4}>
           {record.status === 'unread' ? (
             <Button
               type="link"
               size="small"
               icon={<CheckCircleOutlined />}
               onClick={async (e) => {
                 e.stopPropagation();
                 e.nativeEvent.stopImmediatePropagation();
                 const res = await markAsRead(record.id);
                 if (res.success) {
                   message.success(intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsReadSuccess' }));
                   set((prev) => ({
                     ...prev,
                     viewingNotification: prev.viewingNotification?.id === record.id
                       ? { ...prev.viewingNotification!, status: 'read' }
                       : prev.viewingNotification,
                   }));
                 }
                 actionRef.current?.reload();
                 loadStatistics();
               }}
             >
               {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsRead' })}
             </Button>
           ) : (
             <Button
               type="link"
               size="small"
               icon={<InfoCircleOutlined />}
               onClick={async (e) => {
                 e.stopPropagation();
                 e.nativeEvent.stopImmediatePropagation();
                 const res = await markAsUnread(record.id);
                 if (res.success) {
                   message.success(intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsUnread' }));
                   set((prev) => ({
                     ...prev,
                     viewingNotification: prev.viewingNotification?.id === record.id
                       ? { ...prev.viewingNotification!, status: 'unread' }
                       : prev.viewingNotification,
                   }));
                 }
                 actionRef.current?.reload();
                 loadStatistics();
               }}
             >
               {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsUnread' })}
             </Button>
           )}
         </Space>
       ),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
headerTitle={
           <Space size={24}>
             <Space>
               <BellOutlined />
               {intl.formatMessage({ id: 'pages.notice.title' })}
             </Space>
             <Space size={12}>
               <Tag color="blue">
                 {intl.formatMessage({ id: 'pages.notice.stat.unread' })}: {statistics.unread}
               </Tag>
               <Tag>
                 {intl.formatMessage({ id: 'pages.notice.stat.total' })}: {statistics.total}
               </Tag>
             </Space>
           </Space>
         }
         request={async (params) => {
           const res = await getNotifications({
             current: params.current,
             pageSize: params.pageSize,
             search: state.search,
           });
           const data = res.data;
           return { data: data?.queryable || [], total: data?.rowCount || 0, success: res.success };
         }}
         columns={columns}
         rowKey="id"
         search={false}
         scroll={{ x: 'max-content' }}
         toolBarRender={() => [
           <Input.Search
             key="search"
             placeholder={intl.formatMessage({ id: 'pages.common.search' })}
             allowClear
             value={state.search}
             onChange={(e) => set({ search: e.target.value })}
             onSearch={() => actionRef.current?.reload()}
             style={{ width: 260, marginRight: 8 }}
             prefix={<SearchOutlined />}
           />,
           <Button key="markAllRead" icon={<CheckCircleOutlined />} onClick={handleMarkAllAsRead}>
             {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAllAsRead' })}
           </Button>,
         ]}
         onRow={(record) => ({
           onClick: (e) => {
             const target = e.target as HTMLElement;
             if (target.closest('.ant-btn')) return;
             handleView(record);
           },
           style: { cursor: 'pointer', fontWeight: record.status === 'unread' ? 600 : 'normal' },
         })}
       />

      <Drawer
        title={
          <Space>
            <BellOutlined />
            {intl.formatMessage({ id: 'pages.notice.detail.title' })}
          </Space>
        }
        placement="right"
        open={state.detailVisible}
        onClose={() => set({ detailVisible: false, viewingNotification: null })}
        width={560}
        extra={
          state.viewingNotification ? (
            <Space>
              {state.viewingNotification.status === 'unread' ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={async () => {
                    await markAsRead(state.viewingNotification!.id);
                    actionRef.current?.reload();
                    loadStatistics();
                    set({
                      viewingNotification: {
                        ...state.viewingNotification!,
                        status: 'read',
                      },
                    });
                  }}
                >
                  {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsRead' })}
                </Button>
              ) : (
                <Button
                  size="small"
                  icon={<InfoCircleOutlined />}
                  onClick={async () => {
                    await markAsUnread(state.viewingNotification!.id);
                    actionRef.current?.reload();
                    loadStatistics();
                    set({
                      viewingNotification: {
                        ...state.viewingNotification!,
                        status: 'unread',
                      },
                    });
                  }}
                >
                  {intl.formatMessage({ id: 'pages.unifiedNotificationCenter.markAsUnread' })}
                </Button>
              )}
            </Space>
          ) : null
        }
      >
        {state.viewingNotification && (
          <DetailContent notification={state.viewingNotification} isMobile={isMobile} />
        )}
      </Drawer>
    </PageContainer>
  );
};

const DetailContent: React.FC<{ notification: AppNotification; isMobile: boolean }> = ({
  notification,
  isMobile,
}) => {
  const intl = useIntl();

  return (
    <ProDescriptions column={isMobile ? 1 : 2} bordered size="small">
      <ProDescriptions.Item
        label={intl.formatMessage({ id: 'pages.notice.table.title' })}
        span={2}
      >
<Space>
           {notification.status === 'unread' && <Badge status="processing" />}
           <strong style={{ fontSize: 16 }}>{notification.title}</strong>
         </Space>
       </ProDescriptions.Item>
       <ProDescriptions.Item
         label={intl.formatMessage({ id: 'pages.notice.detail.status' })}
         span={isMobile ? 1 : 2}
       >
        <Tag color={notification.status === 'unread' ? 'processing' : 'success'}>
          {intl.formatMessage({
            id:
              notification.status === 'unread'
                ? 'pages.notice.detail.status.unread'
                : 'pages.notice.detail.status.read',
          })}
        </Tag>
      </ProDescriptions.Item>
      <ProDescriptions.Item
         label={intl.formatMessage({ id: 'pages.notice.table.category' })}
        span={isMobile ? 1 : 2}
      >
        <Tag color={categoryColorMap[notification.category] || 'default'}>
          {notification.category}
        </Tag>
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={intl.formatMessage({ id: 'pages.notice.table.level' })}
        span={isMobile ? 1 : 2}
      >
        <Space size={4}>
          <span style={{ color: levelColorMap[notification.level] }}>
            {levelIconMap[notification.level]}
          </span>
          <Text>{notification.level}</Text>
        </Space>
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={intl.formatMessage({ id: 'pages.notice.detail.receivedAt' })}
        span={isMobile ? 1 : 2}
      >
        {notification.createdAt
          ? dayjs(notification.createdAt).format('YYYY-MM-DD HH:mm:ss')
          : '-'}
      </ProDescriptions.Item>
      {notification.readAt && (
        <ProDescriptions.Item
          label={intl.formatMessage({ id: 'pages.notice.detail.readAt' })}
          span={isMobile ? 1 : 2}
        >
          {dayjs(notification.readAt).format('YYYY-MM-DD HH:mm:ss')}
        </ProDescriptions.Item>
      )}
      {notification.actionUrl && (
        <ProDescriptions.Item
          label={intl.formatMessage({ id: 'pages.notice.detail.actionUrl' })}
          span={2}
        >
          <a href={notification.actionUrl} target="_blank" rel="noopener noreferrer">
            {notification.actionUrl}
          </a>
        </ProDescriptions.Item>
      )}
      <ProDescriptions.Item
        label={intl.formatMessage({ id: 'pages.notice.detail.content' })}
        span={2}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{notification.content || '-'}</div>
      </ProDescriptions.Item>
    </ProDescriptions>
  );
};

export default NoticePage;