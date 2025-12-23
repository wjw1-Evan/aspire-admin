import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import DataTable from '@/components/DataTable';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Tag, Space, message, Modal, Switch } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  getXiaokeConfigs,
  deleteXiaokeConfig,
  setDefaultXiaokeConfig,
  type XiaokeConfig,
} from '@/services/xiaoke/api';
import ConfigForm from './ConfigForm';
import dayjs from 'dayjs';

export interface ConfigManagementRef {
  reload: () => void;
  handleCreate: () => void;
}

const ConfigManagement = forwardRef<ConfigManagementRef>((props, ref) => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<XiaokeConfig | null>(null);

  // 获取配置列表
  const fetchConfigs = useCallback(
    async (params: any, _sort?: Record<string, any>) => {
      try {
        const response = await getXiaokeConfigs({
          page: params.current || 1,
          pageSize: params.pageSize || 10,
          name: params.name,
          isEnabled: params.isEnabled,
          sorter: params.sorter,
        });

        if (response.success && response.data) {
          return {
            data: response.data.data,
            success: true,
            total: response.data.total,
          };
        }

        return {
          data: [],
          success: false,
          total: 0,
        };
      } catch (error) {
        console.error('获取配置列表失败:', error);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    },
    [],
  );

  // 处理创建
  const handleCreate = useCallback(() => {
    setEditingConfig(null);
    setFormVisible(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((record: XiaokeConfig) => {
    setEditingConfig(record);
    setFormVisible(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback((record: XiaokeConfig) => {
    Modal.confirm({
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
            actionRef.current?.reload?.();
          } else {
            message.error(response.errorMessage || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
        }
      },
    });
  }, [intl]);

  // 处理设置默认配置
  const handleSetDefault = useCallback(async (record: XiaokeConfig) => {
    try {
      const response = await setDefaultXiaokeConfig(record.id);
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultSuccess' }));
        actionRef.current?.reload?.();
      } else {
        message.error(response.errorMessage || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
    }
  }, [intl]);

  // 处理表单成功
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
    // 创建成功后重置到第一页并重新加载，确保新创建的记录显示出来
    actionRef.current?.reloadAndReset?.();
  }, []);

  // 处理关闭表单
  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      actionRef.current?.reload?.();
    },
    handleCreate,
  }), [handleCreate]);

  const columns: ProColumns<XiaokeConfig> = [
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.model' }),
      dataIndex: 'model',
      key: 'model',
      width: 150,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.temperature' }),
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      render: (value: number) => value.toFixed(1),
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.maxTokens' }),
      dataIndex: 'maxTokens',
      key: 'maxTokens',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.status' }),
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'default'}>
          {value
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
      render: (value: boolean, record: XiaokeConfig) => (
        <Tag color={value ? 'blue' : 'default'}>
          {value
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
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
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
      <DataTable<XiaokeConfig>
        actionRef={actionRef}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        request={fetchConfigs}
        columns={columns}
        search={false}
        pagination={{
          pageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 配置表单弹窗 */}
      {formVisible && (
        <Modal
          title={editingConfig
            ? intl.formatMessage({ id: 'pages.xiaokeManagement.config.editConfig' })
            : intl.formatMessage({ id: 'pages.xiaokeManagement.config.createConfig' })}
          open={formVisible}
          onCancel={handleCloseForm}
          footer={null}
          width={800}
          destroyOnClose
        >
          <ConfigForm config={editingConfig} onSuccess={handleFormSuccess} onCancel={handleCloseForm} />
        </Modal>
      )}
    </>
  );
});

ConfigManagement.displayName = 'ConfigManagement';

export default ConfigManagement;
