import React, { useEffect, useState, useCallback, useRef } from 'react';
import { history } from '@umijs/max';
import { Space, Typography, Button, message, Tag, Popconfirm, Row, Col, Statistic, Card } from 'antd';
import { PlusOutlined, CopyOutlined, ShareAltOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { ProCard, ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { getIntl } from '@umijs/max';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import type { ApiResponse, PagedResult } from '@/types';

const { Title } = Typography;

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

const DashboardListPage: React.FC = () => {
  const intl = getIntl();
  const actionRef = useRef<ActionType>(null!);

  const [state, setState] = useState({
    formVisible: false,
    editingDashboard: null as Dashboard | null,
    statistics: null as DashboardStatistics | null,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const res = await request<ApiResponse<DashboardStatistics>>('/apiservice/api/dashboard/statistics');
      if (res.success && res.data) {
        set({ statistics: res.data });
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  const api = {
    list: (params: any) => request<ApiResponse<PagedResult<Dashboard>>>('/apiservice/api/dashboard/list', { params }),
    get: (id: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`),
    create: (data: Partial<Dashboard>) => request<ApiResponse<Dashboard>>('/apiservice/api/dashboard', { method: 'POST', data }),
    update: (id: string, data: Partial<Dashboard>) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/dashboard/${id}`, { method: 'DELETE' }),
    copy: (id: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}/copy`, { method: 'POST' }),
    share: (id: string) => request<ApiResponse<{ token: string; shareUrl: string }>>(`/apiservice/api/dashboard/${id}/share`, { method: 'POST' }),
  };

  const handleFinish = async (values: Record<string, any>) => {
    const res = state.editingDashboard
      ? await api.update(state.editingDashboard.id, values)
      : await api.create(values);
    if (res.success) {
      set({ formVisible: false, editingDashboard: null });
      actionRef.current?.reload();
      loadStatistics();
      message.success(state.editingDashboard ? intl.formatMessage({ id: 'pages.dashboard.updateSuccess' }) : intl.formatMessage({ id: 'pages.dashboard.createSuccess' }));
    }
    return res.success;
  };

  const handleCopy = async (id: string) => {
    try {
      const res = await api.copy(id);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.copySuccess' }));
        actionRef.current?.reload();
        loadStatistics();
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.copyFailed' }));
    }
  };

  const handleShare = async (id: string) => {
    try {
      const res = await api.share(id);
      if (res.success && res.data) {
        navigator.clipboard.writeText(window.location.origin + res.data.shareUrl);
        message.success(intl.formatMessage({ id: 'pages.dashboard.shareSuccess' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.shareFailed' }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(id);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.deleteSuccess' }));
        actionRef.current?.reload();
        loadStatistics();
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.deleteFailed' }));
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
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.action' }),
      key: 'action',
      valueType: 'option',
      fixed: 'right',
      width: 280,
      render: (_, record) => (
        <Space size={4}>
          <Button
            variant="link"
            color="cyan"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => history.push(`/dashboard/view/${record.id}`)}
          >
            {intl.formatMessage({ id: 'pages.dashboard.view' })}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => set({ editingDashboard: record, formVisible: true })}
          >
            {intl.formatMessage({ id: 'pages.dashboard.edit' })}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record.id)}
          >
            {intl.formatMessage({ id: 'pages.dashboard.copy' })}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ShareAltOutlined />}
            onClick={() => handleShare(record.id)}
          >
            {intl.formatMessage({ id: 'pages.dashboard.share' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'pages.dashboard.confirmDelete' })}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'pages.dashboard.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProCard>
      <Title level={4} style={{ marginBottom: 16 }}>
        {intl.formatMessage({ id: 'pages.dashboard.title' })}
      </Title>

      {state.statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={intl.formatMessage({ id: 'pages.dashboard.totalDashboards' })}
                value={state.statistics.totalDashboards}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={intl.formatMessage({ id: 'pages.dashboard.publicDashboards' })}
                value={state.statistics.publicDashboards}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={intl.formatMessage({ id: 'pages.dashboard.totalCards' })}
                value={state.statistics.totalCards}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={intl.formatMessage({ id: 'pages.dashboard.recentCreated' })}
                value={state.statistics.recentCreatedCount}
              />
            </Card>
          </Col>
        </Row>
      )}

      <ProTable<Dashboard>
        columns={columns}
        actionRef={actionRef}
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, sort, filter });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => set({ formVisible: true, editingDashboard: null })}
          >
            {intl.formatMessage({ id: 'pages.dashboard.create' })}
          </Button>,
        ]}
      />

      <ModalForm
        key={state.editingDashboard?.id || 'create'}
        title={state.editingDashboard ? intl.formatMessage({ id: 'pages.dashboard.edit' }) : intl.formatMessage({ id: 'pages.dashboard.create' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingDashboard: null }); }}
        initialValues={state.editingDashboard || undefined}
        onFinish={handleFinish}
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
          transform={(value) => ({ isPublic: value === 'true' })}
        />
      </ModalForm>
    </ProCard>
  );
};

export default DashboardListPage;
