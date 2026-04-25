import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { ProColumns } from '@ant-design/pro-table';
import { PageContainer, ProDescriptions, ProCard } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Button, Tag, Space, Grid, App, Modal, Spin, Input, Popconfirm } from 'antd';
import { Drawer } from 'antd';
const { useBreakpoint } = Grid;
import { ProTable, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

// ==================== Types ====================
/**
 * 实体类型定义
 * 根据实际业务修改此接口
 */
interface Entity {
  id: string;
  name: string;
  // 添加其他字段...
  createdAt: string;
  updatedAt?: string;
}

/**
 * 统计信息类型定义
 * 根据实际业务修改此接口
 */
interface Statistics {
  total: number;
  // 添加其他统计字段...
}

/**
 * 表单值类型定义
 * 根据实际业务修改此接口
 */
interface FormValues {
  name: string;
  // 添加其他表单字段...
}

// ==================== API ====================
/**
 * API 对象定义
 * 根据实际业务修改此对象
 */
const api = {
  list: (params: any) =>
    request<ApiResponse<PagedResult<Entity>>>('/apiservice/api/xxx/list', { params }),
  get: (id: string) =>
    request<ApiResponse<Entity>>(`/apiservice/api/xxx/${id}`),
  create: (data: Partial<FormValues>) =>
    request<ApiResponse<Entity>>('/apiservice/api/xxx', { method: 'POST', data }),
  update: (id: string, data: Partial<FormValues>) =>
    request<ApiResponse<Entity>>(`/apiservice/api/xxx/${id}`, { method: 'PUT', data }),
  delete: (id: string) =>
    request<ApiResponse<void>>(`/apiservice/api/xxx/${id}`, { method: 'DELETE' }),
  statistics: () =>
    request<ApiResponse<Statistics>>('/apiservice/api/xxx/statistics'),
};

// ==================== Detail Component ====================
/**
 * 详情组件
 * 使用 Drawer + ProDescriptions 展示详情
 */
const DetailContent: React.FC<{ id: string; isMobile: boolean }> = ({ id, isMobile }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Entity | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(id).then(r => {
        if (r.success && r.data) {
          setData(r.data);
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [id]);

  if (!data) return null;

  return (
    <Spin spinning={loading}>
      <ProCard title={intl.formatMessage({ id: 'pages.xxx.detail.basicInfo' })} style={{ marginBottom: 16 }}>
        <ProDescriptions column={isMobile ? 1 : 2} size="small">
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.xxx.table.name' })} span={2}>
            {data.name}
          </ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.xxx.table.createdAt' })}>
            {dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.xxx.table.updatedAt' })}>
            {data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </ProDescriptions.Item>
        </ProDescriptions>
      </ProCard>
    </Spin>
  );
};

// ==================== Main Component ====================
/**
 * 主组件
 * 统一的标准页面结构
 */
const XxxManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ==================== State ====================
  const [state, setState] = useState({
    statistics: null as Statistics | null,
    formVisible: false,
    detailVisible: false,
    editingEntity: null as Entity | null,
    viewingId: null as string | null,
    search: '',
  });

  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  // ==================== Load Statistics ====================
  const loadStatistics = useCallback(() => {
    api.statistics().then(r => {
      if (r.success && r.data) {
        set({ statistics: r.data });
      }
    });
  }, [set]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // ==================== Columns ====================
  const columns: ProColumns<Entity>[] = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.xxx.table.name' }),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (_, r) => (
        <a onClick={() => set({ viewingId: r.id, detailVisible: true })}>{r.name}</a>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.xxx.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      valueType: 'dateTime',
      render: (_, r) => dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_, r) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => set({ editingEntity: r, formVisible: true })}
          >
            {intl.formatMessage({ id: 'pages.action.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'pages.xxx.message.confirmDelete', defaultMessage: '确定删除？' })}
            onConfirm={async () => {
              const res = await api.delete(r.id);
              if (res.success) {
                message.success(intl.formatMessage({ id: 'pages.xxx.message.deleteSuccess' }));
                actionRef.current?.reload();
                loadStatistics();
              }
            }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'pages.action.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [intl, message, set, loadStatistics]);

  // ==================== Handle Finish ====================
  const handleFinish = async (values: FormValues) => {
    const res = state.editingEntity
      ? await api.update(state.editingEntity.id, values)
      : await api.create(values);

    if (res.success) {
      message.success(
        intl.formatMessage({
          id: state.editingEntity ? 'pages.xxx.message.updateSuccess' : 'pages.xxx.message.createSuccess',
        })
      );
      set({ formVisible: false, editingEntity: null });
      actionRef.current?.reload();
      loadStatistics();
    }
    return res.success;
  };

  // ==================== Render ====================
  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, search: state.search, sort, filter });
          return {
            data: res.data?.queryable || [],
            total: res.data?.rowCount || 0,
            success: res.success,
          };
        }}
        columns={columns}
        rowKey="id"
        search={false}
        scroll={{ x: 'max-content' }}
        headerTitle={
          <Space size={24}>
            <Space>
              {/* 添加图标 */}
              <span>{intl.formatMessage({ id: 'pages.xxx.title' })}</span>
            </Space>
            <Space size={12}>
              {/* 统计信息 */}
              <Tag color="blue">
                {intl.formatMessage({ id: 'pages.xxx.statistics.total' })} {state.statistics?.total || 0}
              </Tag>
            </Space>
          </Space>
        }
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => {
              set({ search: value });
              actionRef.current?.reload();
            }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => set({ editingEntity: null, formVisible: true })}
          >
            {intl.formatMessage({ id: 'pages.action.create' })}
          </Button>,
        ]}
      />

      {/* ModalForm 表单 */}
      <ModalForm
        key={state.editingEntity?.id || 'create'}
        title={state.editingEntity ? intl.formatMessage({ id: 'pages.xxx.form.edit' }) : intl.formatMessage({ id: 'pages.xxx.form.create' })}
        open={state.formVisible}
        onOpenChange={(open) => {
          if (!open) {
            set({ formVisible: false, editingEntity: null });
          }
        }}
        initialValues={state.editingEntity || undefined}
        onFinish={handleFinish}
        autoFocusFirstInput
        width={600}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.xxx.form.name' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.xxx.form.nameRequired' }) }]}
        />
        {/* 添加其他表单字段... */}
      </ModalForm>

      {/* 详情抽屉 */}
      <Drawer
        title={intl.formatMessage({ id: 'pages.xxx.detail.title' })}
        placement="right"
        open={state.detailVisible}
        onClose={() => set({ detailVisible: false, viewingId: null })}
        size="large"
        destroyOnClose
      >
        {state.viewingId && <DetailContent id={state.viewingId} isMobile={isMobile} />}
      </Drawer>
    </PageContainer>
  );
};

export default XxxManagement;
