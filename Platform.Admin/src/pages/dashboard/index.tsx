import React, { useRef, useState, useEffect, useCallback } from 'react';
import { request, useIntl, history } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Grid } from 'antd';
import { Drawer } from 'antd';
import { PageContainer, ModalForm, ProDescriptions, ProTable, ProColumns, ActionType, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { PlusOutlined, CopyOutlined, ShareAltOutlined, DeleteOutlined, EditOutlined, EyeOutlined, DashboardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

const { useBreakpoint } = Grid;

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layoutType: string;
  theme: string;
  isPublic: boolean;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardStatistics {
  totalDashboards: number;
  publicDashboards: number;
  privateDashboards: number;
  totalCards: number;
  recentCreatedCount: number;
}

const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Dashboard>>>('/apiservice/api/dashboard/list', { params }),
  get: (id: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/dashboard/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Dashboard>) => request<ApiResponse<Dashboard>>('/apiservice/api/dashboard', { method: 'POST', data }),
  update: (id: string, data: Partial<Dashboard>) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`, { method: 'PUT', data }),
  copy: (id: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}/copy`, { method: 'POST' }),
  share: (id: string) => request<ApiResponse<{ token: string; shareUrl: string }>>(`/apiservice/api/dashboard/${id}/share`, { method: 'POST' }),
  statistics: () => request<ApiResponse<DashboardStatistics>>('/apiservice/api/dashboard/statistics'),
};

const DashboardListPage: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [state, setState] = useState({
    statistics: null as DashboardStatistics | null,
    editingDashboard: null as Dashboard | null,
    formVisible: false,
    detailVisible: false,
    viewingId: '',
    detailLoading: false,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);

  const handleView = (id: string) => {
    history.push(`/dashboard/view/${id}`);
  };

  const handleEdit = (id: string) => {
    history.push(`/dashboard/${id}`);
  };

  const handleCopy = async (id: string) => {
    try {
      const res = await api.copy(id);
      if (res.success) {
        actionRef.current?.reload();
        loadStatistics();
      }
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleShare = async (id: string) => {
    try {
      const res = await api.share(id);
      if (res.success && res.data) {
        navigator.clipboard.writeText(window.location.origin + res.data.shareUrl);
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(id);
      if (res.success) {
        actionRef.current?.reload();
        loadStatistics();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const columns: ProColumns<Dashboard>[] = [
    {
      title: intl.formatMessage({ id: 'pages.dashboard.name' }),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.isPublic && <Tag color="blue">{intl.formatMessage({ id: 'pages.dashboard.public' })}</Tag>}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.description' }),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.layoutType' }),
      dataIndex: 'layoutType',
      key: 'layoutType',
      valueType: 'select',
      valueEnum: {
        grid: { text: intl.formatMessage({ id: 'pages.dashboard.layoutGrid' }), status: 'Default' },
        waterfall: { text: intl.formatMessage({ id: 'pages.dashboard.layoutWaterfall' }), status: 'Processing' },
        free: { text: intl.formatMessage({ id: 'pages.dashboard.layoutFree' }), status: 'Success' },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.theme' }),
      dataIndex: 'theme',
      key: 'theme',
      valueType: 'select',
      valueEnum: {
        light: { text: intl.formatMessage({ id: 'pages.dashboard.themeLight' }), status: 'Default' },
        dark: { text: intl.formatMessage({ id: 'pages.dashboard.themeDark' }), status: 'Processing' },
        custom: { text: intl.formatMessage({ id: 'pages.dashboard.themeCustom' }), status: 'Success' },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      valueType: 'dateTime',
      search: false,
      render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 280,
      render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleView(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.view' })}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.edit' })}
          </Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.copy' })}
          </Button>
          <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => handleShare(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.share' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'pages.dashboard.confirmDelete' })}
            onConfirm={() => handleDelete(r.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'pages.dashboard.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleFinish = async (values: Record<string, any>) => {
    const data = {
      name: values.name,
      description: values.description,
      layoutType: values.layoutType,
      theme: values.theme,
      isPublic: values.isPublic === 'true',
    };
    const res = state.editingDashboard ? await api.update(state.editingDashboard.id, data) : await api.create(data);
    if (res.success) {
      set({ formVisible: false, editingDashboard: null });
      actionRef.current?.reload();
      loadStatistics();
    }
    return res.success;
  };

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space><DashboardOutlined />{intl.formatMessage({ id: 'pages.dashboard.title' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.dashboard.totalDashboards' })} {state.statistics?.totalDashboards || 0}</Tag>
              <Tag color="green">{intl.formatMessage({ id: 'pages.dashboard.publicDashboards' })} {state.statistics?.publicDashboards || 0}</Tag>
              <Tag color="orange">{intl.formatMessage({ id: 'pages.dashboard.privateDashboards' })} {state.statistics?.privateDashboards || 0}</Tag>
              <Tag color="purple">{intl.formatMessage({ id: 'pages.dashboard.totalCards' })} {state.statistics?.totalCards || 0}</Tag>
              <Tag color="cyan">{intl.formatMessage({ id: 'pages.dashboard.recentCreated' })} {state.statistics?.recentCreatedCount || 0}</Tag>
            </Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, sort, filter });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns}
        rowKey="id"
        search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingDashboard: null, formVisible: true })}>
            {intl.formatMessage({ id: 'pages.dashboard.create' })}
          </Button>,
        ]}
      />

      <ModalForm
        key={state.editingDashboard?.id || 'create'}
        title={state.editingDashboard ? intl.formatMessage({ id: 'pages.dashboard.edit' }) : intl.formatMessage({ id: 'pages.dashboard.create' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingDashboard: null }); }}
        initialValues={state.editingDashboard ? {
          name: state.editingDashboard.name,
          description: state.editingDashboard.description,
          layoutType: state.editingDashboard.layoutType,
          theme: state.editingDashboard.theme,
          isPublic: state.editingDashboard.isPublic ? 'true' : 'false',
        } : undefined}
        onFinish={handleFinish}
        autoFocusFirstInput
        width={600}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'pages.dashboard.name' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.dashboard.nameRequired' }) }]}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'pages.dashboard.description' })}
          fieldProps={{ rows: 3 }}
        />
        <ProFormSelect
          name="layoutType"
          label={intl.formatMessage({ id: 'pages.dashboard.layoutType' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.layoutGrid' }), value: 'grid' },
            { label: intl.formatMessage({ id: 'pages.dashboard.layoutWaterfall' }), value: 'waterfall' },
            { label: intl.formatMessage({ id: 'pages.dashboard.layoutFree' }), value: 'free' },
          ]}
          initialValue="grid"
        />
        <ProFormSelect
          name="theme"
          label={intl.formatMessage({ id: 'pages.dashboard.theme' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.themeLight' }), value: 'light' },
            { label: intl.formatMessage({ id: 'pages.dashboard.themeDark' }), value: 'dark' },
            { label: intl.formatMessage({ id: 'pages.dashboard.themeCustom' }), value: 'custom' },
          ]}
          initialValue="light"
        />
        <ProFormSelect
          name="isPublic"
          label={intl.formatMessage({ id: 'pages.dashboard.visibility' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.private' }), value: 'false' },
            { label: intl.formatMessage({ id: 'pages.dashboard.public' }), value: 'true' },
          ]}
          initialValue="false"
        />
      </ModalForm>
    </PageContainer>
  );
};

export default DashboardListPage;
