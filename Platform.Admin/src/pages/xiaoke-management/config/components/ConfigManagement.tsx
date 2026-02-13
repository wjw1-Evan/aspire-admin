import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import DataTable from '@/components/DataTable';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Tag, Space, Modal, Card, Form, Input, Select, Grid } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
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

export interface ConfigManagementRef {
  reload: () => void;
  handleCreate: () => void;
}

const ConfigManagement = forwardRef<ConfigManagementRef>((props, ref) => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const actionRef = useRef<ActionType>(null);
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<{ current: number; pageSize: number; name?: string; isEnabled?: boolean | undefined; }>(
    { current: 1, pageSize: 10, name: undefined, isEnabled: undefined }
  );
  const [formVisible, setFormVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<XiaokeConfig | null>(null);

  // 获取配置列表
  const fetchConfigs = useCallback(
    async (params: any, _sort?: Record<string, any>) => {
      try {
        const response = await getXiaokeConfigs({
          page: params.current || searchParams.current,
          pageSize: params.pageSize || searchParams.pageSize,
          name: searchParams.name,
          isEnabled: searchParams.isEnabled,
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
    [searchParams],
  );

  // 搜索
  const handleSearch = useCallback((values: any) => {
    const newParams = {
      current: 1,
      pageSize: searchParams.pageSize,
      name: values.name || undefined,
      isEnabled: values.isEnabled,
    };
    setSearchParams(newParams);
    actionRef.current?.reload?.();
  }, [searchParams.pageSize]);

  // 重置
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    const resetParams = { current: 1, pageSize: searchParams.pageSize, name: undefined, isEnabled: undefined };
    setSearchParams(resetParams);
    actionRef.current?.reload?.();
  }, [searchForm, searchParams.pageSize]);

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
            if (actionRef.current && actionRef.current.reload) {
              actionRef.current.reload();
            }
          } else {
            message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
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
        if (actionRef.current && actionRef.current.reload) {
          actionRef.current.reload();
        }
      } else {
        message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
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
    if (actionRef.current && actionRef.current.reloadAndReset) {
      actionRef.current.reloadAndReset();
    }
  }, []);

  // 处理关闭表单
  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      if (actionRef.current && actionRef.current.reload) {
        actionRef.current.reload();
      }
    },
    handleCreate,
  }), [handleCreate]);

  const columns: ColumnsType<XiaokeConfig> = [
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
      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout={isMobile ? 'vertical' : 'inline'}
          onFinish={handleSearch}
        >
          <Form.Item name="name" label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.name' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.form.namePlaceholder' })} allowClear style={{ width: isMobile ? '100%' : 240 }} />
          </Form.Item>
          <Form.Item name="isEnabled" label={intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.status' })}>
            <Select
              placeholder={intl.formatMessage({ id: 'pages.xiaokeManagement.config.table.status' })}
              allowClear
              style={{ width: isMobile ? '100%' : 160 }}
              options={[
                { label: intl.formatMessage({ id: 'pages.xiaokeManagement.config.status.enabled' }), value: true },
                { label: intl.formatMessage({ id: 'pages.xiaokeManagement.config.status.disabled' }), value: false },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button type="primary" htmlType="submit" style={isMobile ? { width: '100%' } : {}}>
                搜索
              </Button>
              <Button onClick={handleReset} style={isMobile ? { width: '100%' } : {}}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

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
          destroyOnHidden
        >
          <ConfigForm config={editingConfig} onSuccess={handleFormSuccess} onCancel={handleCloseForm} />
        </Modal>
      )}
    </>
  );
});

ConfigManagement.displayName = 'ConfigManagement';

export default ConfigManagement;
