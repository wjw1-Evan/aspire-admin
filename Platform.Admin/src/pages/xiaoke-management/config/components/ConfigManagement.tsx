import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useIntl } from '@umijs/max';
import { Button, Tag, Space, Modal, Card, Form, Input, Select, Grid, Table } from 'antd';
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
import type { PageParams } from '@/types/page-params';

export interface ConfigManagementRef {
  reload: () => void;
  handleCreate: () => void;
}

const ConfigManagement = forwardRef<ConfigManagementRef>((props, ref) => {
  const intl = useIntl();
  const message = useMessage();
  const { confirm } = useModal();
  const tableRef = useRef<HTMLDivElement>(null);
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<{ page: number; name?: string; isEnabled?: boolean | undefined; }>(
    { page: 1, name: undefined, isEnabled: undefined }
  );
  const [formVisible, setFormVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<XiaokeConfig | null>(null);
  const [data, setData] = useState<XiaokeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({
    name: undefined,
    isEnabled: undefined,
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const response = await getXiaokeConfigs({
        page: currentParams.page,
        pageSize: currentParams.pageSize,
        name: currentParams.name,
        isEnabled: currentParams.isEnabled,
      });

      if (response.success && response.data) {
        setData(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data!.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('获取配置列表失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback((values: any) => {
    const newParams = {
      ...searchParamsRef.current,
      ...values,
      page: 1,
    };
    searchParamsRef.current = newParams;
    fetchData();
  }, [fetchData]);

  const handleReset = useCallback(() => {
    searchForm.resetFields();
    searchParamsRef.current = { page: 1, name: undefined, isEnabled: undefined };
    fetchData();
  }, [searchForm, fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;

    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
    };
    fetchData();
  }, [fetchData]);

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
            fetchData();
          } else {
            message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
          }
        } catch (error: any) {
          message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.deleteFailed' }));
        }
      },
    });
  }, [intl, fetchData]);

  const handleSetDefault = useCallback(async (record: XiaokeConfig) => {
    try {
      const response = await setDefaultXiaokeConfig(record.id);
      if (response.success) {
        message.success(intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultSuccess' }));
        fetchData();
      } else {
        message.error(response.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
      }
    } catch (error: any) {
      message.error(error.message || intl.formatMessage({ id: 'pages.xiaokeManagement.config.message.setDefaultFailed' }));
    }
  }, [intl, fetchData]);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
    fetchData();
  }, [fetchData]);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditingConfig(null);
  }, []);

  useImperativeHandle(ref, () => ({
    reload: () => {
      fetchData();
    },
    handleCreate,
  }), [handleCreate, fetchData]);

  const columns: ColumnsType<XiaokeConfig> = [
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
      render: (value: number) => value.toFixed(1),
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
      sorter: true,
      render: (value: boolean) => (
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
      sorter: true,
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

      <Table<XiaokeConfig>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
      />

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