import React, { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
import { useIntl } from '@umijs/max';
import { Button, Tag, Space, Form, Input } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  getXiaokeConfigs,
  deleteXiaokeConfig,
  setDefaultXiaokeConfig,
  type XiaokeConfig,
} from '@/services/xiaoke/api';
import ConfigForm from './ConfigForm';
import dayjs from 'dayjs';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import type { PageParams } from '@/types';

const ConfigManagement: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [formVisible, setFormVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<XiaokeConfig | null>(null);
  const [searchText, setSearchText] = useState('');

  const handleCreate = useCallback(() => {
    setEditingConfig(null);
    setFormVisible(true);
  }, []);

  const handleEdit = useCallback((record: XiaokeConfig) => {
    setEditingConfig(record);
    setFormVisible(true);
  }, []);

  const handleDelete = useCallback((record: XiaokeConfig) => {
    confirm({
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.modal.confirmDelete' }),
      content: intl.formatMessage(
        { id: 'pages.xiaokeManagement.config.modal.confirmDeleteContent' },
        { name: record.name },
      ),
      onOk: async () => {
        try {
          const response = await deleteXiaokeConfig(record.id);
          if (response.success) {
            message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteSuccess' }));
            actionRef.current?.reload();
          } else {
            message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
        }
      },
    });
  }, [intl, message, confirm]);

  const handleSetDefault = useCallback(async (record: XiaokeConfig) => {
    try {
      const response = await setDefaultXiaokeConfig(record.id);
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultSuccess' }));
        actionRef.current?.reload();
      } else {
        message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
    }
  }, [intl, message]);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
    actionRef.current?.reload();
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
  }, []);

  const columns: ProColumns<XiaokeConfig>[] = [
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.model' }),
      dataIndex: 'model',
      key: 'model',
      width: 150,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.temperature' }),
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      sorter: true,
      render: (dom: any) => dom?.toFixed(1),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.maxTokens' }),
      dataIndex: 'maxTokens',
      key: 'maxTokens',
      width: 120,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.status' }),
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      sorter: true,
      render: (dom: any, record: XiaokeConfig) => (
        <Tag color={record.isEnabled ? 'success' : 'default'}>
          {record.isEnabled
            ? intl.formatMessage({ id: 'pages.xiaokeManagement.config.status.enabled' })
            : intl.formatMessage({ id: 'pages.xiaokeManagement.config.status.disabled' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.isDefault' }),
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 100,
      sorter: true,
      render: (dom: any, record: XiaokeConfig) => (
        <Tag color={record.isDefault ? 'blue' : 'default'}>
          {record.isDefault
            ? intl.formatMessage({ id: 'pages.xiaokeManagement.config.isDefault.yes' })
            : intl.formatMessage({ id: 'pages.xiaokeManagement.config.isDefault.no' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      render: (dom: any) => dayjs(dom).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.action' }),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_: any, record: XiaokeConfig) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.action.edit' })}
          </Button>
          {!record.isDefault && (
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleSetDefault(record)}
            >
              {intl.formatMessage({ id: 'pages.xiaokeManagement.config.setDefault' })}
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            {intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<XiaokeConfig>
        headerTitle={intl.formatMessage({ id: 'pages.xiaokeManagement.config.title', defaultMessage: '小科配置管理' })}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any) => {
          const { current, pageSize, sortBy, sortOrder } = params;
          const response = await getXiaokeConfigs({
            page: current,
            pageSize,
            search: searchText,
            sortBy,
            sortOrder,
          } as PageParams);
          if (response.success && response.data) {
            return { data: response.data.queryable || [], total: response.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => { setSearchText(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {intl.formatMessage({ id: 'pages.xiaokeManagement.config.createConfig', defaultMessage: '新建配置' })}
          </Button>,
        ]}
      />

      <ConfigForm
        config={editingConfig}
        open={formVisible}
        onOpenChange={(open) => { if (!open) handleCloseForm(); }}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};

export default ConfigManagement;
