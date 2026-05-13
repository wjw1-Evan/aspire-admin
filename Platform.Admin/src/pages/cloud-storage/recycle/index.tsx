import { ClearOutlined, DeleteOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { request, useIntl } from '@umijs/max';
import { App, Button, Form, Input, Modal, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useRef, useState } from 'react';
import { ApiResponse, PagedResult } from '@/types';

dayjs.extend(relativeTime);

interface RecycleItem {
  id: string;
  name: string;
  originalPath?: string;
  size: number;
  isFolder: boolean;
  extension?: string;
  deletedAt: string;
  deletedByName?: string;
  daysUntilPermanentDelete: number;
  createdAt: string;
  createdByName?: string;
  description?: string;
  tags?: string[];
  type?: string | number;
}
interface RecycleStatistics {
  totalItems: number;
  totalSize: number;
  oldestItem?: string;
  newestItem?: string;
}

const api = {
  list: (params: any) =>
    request<ApiResponse<PagedResult<RecycleItem>>>('/apiservice/api/cloud-storage/recycle', { params }),
  restore: (id: string, data: { itemId: string; newParentId?: string }) =>
    request<ApiResponse<void>>(`/apiservice/api/cloud-storage/recycle-bin/${id}/restore`, { method: 'POST', data }),
  permanentDelete: (id: string) =>
    request<ApiResponse<void>>(`/apiservice/api/cloud-storage/recycle-bin/${id}`, { method: 'DELETE' }),
  empty: () =>
    request<ApiResponse<{ deletedCount: number; freedSpace: number }>>(
      '/apiservice/api/cloud-storage/recycle-bin/empty',
      { method: 'DELETE' },
    ),
  statistics: () => request<ApiResponse<RecycleStatistics>>('/apiservice/api/cloud-storage/recycle/statistics'),
};

const CloudStorageRecyclePage: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const columns: ProColumns<RecycleItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.fileName' }),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.originalPath' }),
      dataIndex: 'originalPath',
      key: 'originalPath',
      ellipsis: true,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.cloud-storage.files.fileSize' }),
      dataIndex: 'size',
      key: 'size',
      valueType: 'digit',
      sorter: true,
      renderText: (size: number, r: RecycleItem) => (r.isFolder ? '-' : formatFileSize(size)),
    },
    {
      title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.deleteTime' }),
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.deletedBy' }),
      dataIndex: 'deletedByName',
      key: 'deletedByName',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.expireStatus' }),
      key: 'expiry',
      render: (_, r: RecycleItem) => {
        if (r.daysUntilPermanentDelete <= 0)
          return (
            <span style={{ color: '#ff4d4f' }}>
              {intl.formatMessage({ id: 'pages.cloud-storage.recycle.expired' })}
            </span>
          );
        if (r.daysUntilPermanentDelete <= 7)
          return (
            <span style={{ color: '#fa8c16' }}>
              {r.daysUntilPermanentDelete}
              {intl.formatMessage({ id: 'pages.cloud-storage.recycle.daysUntilExpiry' })}
            </span>
          );
        return (
          <span style={{ color: '#52c41a' }}>
            {r.daysUntilPermanentDelete}
            {intl.formatMessage({ id: 'pages.cloud-storage.recycle.daysUntilExpiry' })}
          </span>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_, r: RecycleItem) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<UndoOutlined />}
            onClick={() => {
              form.setFieldsValue({ newName: r.name });
              Modal.confirm({
                title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.restoreFile' }),
                content: (
                  <Form form={form} layout="vertical">
                    <Form.Item
                      name="newName"
                      label={intl.formatMessage({ id: 'pages.cloud-storage.recycle.restoreFileLabel' })}
                    >
                      <Input
                        placeholder={intl.formatMessage({ id: 'pages.cloud-storage.recycle.fileNamePlaceholder' })}
                      />
                    </Form.Item>
                  </Form>
                ),
                onOk: async () => {
                  try {
                    await api.restore(r.id, { itemId: r.id });
                    message.success(intl.formatMessage({ id: 'pages.cloud-storage.recycle.message.restoreSuccess' }));
                    actionRef.current?.reload();
                  } catch {
                    message.error(intl.formatMessage({ id: 'pages.cloud-storage.recycle.message.restoreFailed' }));
                  }
                },
              });
            }}
          >
            恢复
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.confirmDelete' }),
                content: intl.formatMessage(
                  { id: 'pages.cloud-storage.recycle.confirmDeleteContent' },
                  { name: r.name },
                ),
                okText: intl.formatMessage({ id: 'pages.cloud-storage.recycle.confirmDeleteOk' }),
                okType: 'danger',
                onOk: async () => {
                  try {
                    await api.permanentDelete(r.id);
                    message.success(intl.formatMessage({ id: 'pages.cloud-storage.recycle.message.deleteSuccess' }));
                    actionRef.current?.reload();
                  } catch {
                    message.error(intl.formatMessage({ id: 'pages.cloud-storage.recycle.message.deleteFailed' }));
                  }
                },
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        headerTitle={
          <Space size={24}>
            <Space>
              <DeleteOutlined />
              {intl.formatMessage({ id: 'pages.cloud-storage.recycle.title' })}
            </Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.cloud-storage.recycle.tagTotal' }, { count: 0 })}</Tag>
              <Tag color="orange">
                {intl.formatMessage({ id: 'pages.cloud-storage.recycle.tagExpiring' }, { count: 0 })}
              </Tag>
              <Tag color="green">
                {intl.formatMessage({ id: 'pages.cloud-storage.recycle.tagRestorable' }, { count: 0 })}
              </Tag>
            </Space>
          </Space>
        }
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, search: searchText, sort, filter });
          if (res.success && res.data) {
            const list = (res.data.queryable || []).map((item: RecycleItem) => ({
              ...item,
              isFolder: item.isFolder ?? (item.type === 'folder' || item.type === 'Folder' || item.type === 1),
            }));
            return { data: list, total: res.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => {
              setSearchText(value);
              actionRef.current?.reload();
            }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button
            key="empty"
            danger
            type="primary"
            icon={<ClearOutlined />}
            onClick={() => {
              Modal.confirm({
                title: intl.formatMessage({ id: 'pages.cloud-storage.recycle.confirmEmpty' }),
                content: intl.formatMessage({ id: 'pages.cloud-storage.recycle.confirmEmptyContent' }),
                okText: intl.formatMessage({ id: 'pages.cloud-storage.recycle.confirmEmptyOk' }),
                okType: 'danger',
                onOk: async () => {
                  try {
                    const res = await api.empty();
                    if (res.success && res.data)
                      message.success(
                        intl.formatMessage(
                          { id: 'pages.cloud-storage.recycle.message.emptySuccess' },
                          { count: res.data.deletedCount },
                        ),
                      );
                    actionRef.current?.reload();
                  } catch {
                    message.error(intl.formatMessage({ id: 'pages.cloud-storage.recycle.message.emptyFailed' }));
                  }
                },
              });
            }}
          >
            {intl.formatMessage({ id: 'pages.cloud-storage.recycle.emptyRecycle' })}
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default CloudStorageRecyclePage;
