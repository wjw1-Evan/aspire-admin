import React, { useRef, useState, useEffect, useCallback } from 'react';
import { request, useIntl } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Grid, message, Input } from 'antd';
import { Drawer } from 'antd';
import { PageContainer, ProCard, ModalForm, ProDescriptions, ProTable, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { PlusOutlined, CopyOutlined, ShareAltOutlined, DeleteOutlined, EditOutlined, EyeOutlined, DashboardOutlined, SearchOutlined, FullscreenOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ApiResponse, PagedResult } from '@/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import DashboardDesigner from './components/DashboardDesigner';
import DashboardPreview from './components/DashboardPreview';

const { useBreakpoint } = Grid;

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layoutType: string;
  theme: string;
  isPublic: boolean;
  userId: string;
  cards: { id: string; cardType: string; title: string; positionX: number; positionY: number; width: number; height: number }[];
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
  list: (params: Record<string, unknown>) => request<ApiResponse<PagedResult<Dashboard>>>('/apiservice/api/dashboard/list', { params }),
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
    designVisible: false,
    previewVisible: false,
    designingId: '',
    previewingId: '',
    viewingId: '',
    search: '' as string,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);

  const handleView = (id: string) => set({ viewingId: id, detailVisible: true });

  const handleDesign = (id: string) => set({ designingId: id, designVisible: true });

  const handlePreview = (id: string) => set({ previewingId: id, previewVisible: true });

  const closeDesign = () => {
    set({ designingId: '', designVisible: false });
    loadStatistics();
    actionRef.current?.reload();
  };

  const closePreview = () => set({ previewingId: '', previewVisible: false });

  const handleEdit = async (id: string) => {
    try {
      const res = await api.get(id);
      if (res.success && res.data) set({ editingDashboard: res.data, formVisible: true });
    } catch (error) {
      message.error(getErrorMessage(error as { errorCode?: string; message?: string }, 'pages.dashboard.loadFailed'));
    }
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
      message.error(getErrorMessage(error as { errorCode?: string; message?: string }, 'pages.dashboard.copyFailed'));
    }
  };

  const handleShare = async (id: string) => {
    try {
      const res = await api.share(id);
      if (res.success && res.data) {
        await navigator.clipboard.writeText(window.location.origin + res.data.shareUrl);
        message.success(intl.formatMessage({ id: 'pages.dashboard.shareSuccess' }));
      }
    } catch (error) {
      message.error(getErrorMessage(error as { errorCode?: string; message?: string }, 'pages.dashboard.shareFailed'));
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
      message.error(getErrorMessage(error as { errorCode?: string; message?: string }, 'pages.dashboard.deleteFailed'));
    }
  };

  const columns: ProColumns<Dashboard>[] = [
    {
      title: intl.formatMessage({ id: 'pages.dashboard.name' }),
      dataIndex: 'name', key: 'name', sorter: true,
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.isPublic && <Tag color="blue">{intl.formatMessage({ id: 'pages.dashboard.public' })}</Tag>}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.description' }),
      dataIndex: 'description', key: 'description', ellipsis: true, search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.layoutType' }),
      dataIndex: 'layoutType', key: 'layoutType', valueType: 'select',
      valueEnum: {
        grid: { text: intl.formatMessage({ id: 'pages.dashboard.layoutGrid' }), status: 'Default' },
        waterfall: { text: intl.formatMessage({ id: 'pages.dashboard.layoutWaterfall' }), status: 'Processing' },
        free: { text: intl.formatMessage({ id: 'pages.dashboard.layoutFree' }), status: 'Success' },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.theme' }),
      dataIndex: 'theme', key: 'theme', valueType: 'select',
      valueEnum: {
        light: { text: intl.formatMessage({ id: 'pages.dashboard.themeLight' }), status: 'Default' },
        dark: { text: intl.formatMessage({ id: 'pages.dashboard.themeDark' }), status: 'Processing' },
        custom: { text: intl.formatMessage({ id: 'pages.dashboard.themeCustom' }), status: 'Success' },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.createdAt' }),
      dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime', search: false,
      render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.dashboard.action' }),
      key: 'action', valueType: 'option', fixed: 'right', width: isMobile ? 120 : 280,
      render: (_, r) => (
        <Space size={4} wrap>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleView(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.view' })}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.edit' })}
          </Button>
          <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => handleDesign(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.design' })}
          </Button>
          <Button type="link" size="small" icon={<FullscreenOutlined />} onClick={() => handlePreview(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.preview' })}
          </Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.copy' })}
          </Button>
          <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => handleShare(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.share' })}
          </Button>
          <Popconfirm title={intl.formatMessage({ id: 'pages.dashboard.confirmDelete' })} onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'pages.dashboard.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleFinish = async (values: Record<string, string>) => {
    try {
      const data = {
        name: values.name,
        description: values.description,
        layoutType: values.layoutType,
        theme: values.theme,
        isPublic: values.isPublic === 'true',
      };
      const res = state.editingDashboard ? await api.update(state.editingDashboard.id, data) : await api.create(data);
      if (res.success) {
        message.success(state.editingDashboard ? intl.formatMessage({ id: 'pages.dashboard.updateSuccess' }) : intl.formatMessage({ id: 'pages.dashboard.createSuccess' }));
        set({ formVisible: false, editingDashboard: null });
        actionRef.current?.reload();
        loadStatistics();
      }
      return res.success;
    } catch (error) {
      message.error(getErrorMessage(error as { errorCode?: string; message?: string }, 'pages.dashboard.operationFailed'));
      return false;
    }
  };

  return (
    <PageContainer>
      <ProCard>
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
          request={async (params: Record<string, unknown>, sort: Record<string, unknown>, filter: Record<string, unknown>) => {
            const res = await api.list({ ...params, search: state.search, sort, filter });
            return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
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
              onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
              style={{ width: 260, marginRight: 8 }}
              prefix={<SearchOutlined />}
            />,
            <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingDashboard: null, formVisible: true })}>
              {intl.formatMessage({ id: 'pages.dashboard.create' })}
            </Button>,
          ]}
        />

        {/* 创建/编辑看板弹窗 */}
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
          <ProFormText name="name" label={intl.formatMessage({ id: 'pages.dashboard.name' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.dashboard.nameRequired' }) }]} />
          <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.dashboard.description' })} fieldProps={{ rows: 3 }} />
          <ProFormSelect name="layoutType" label={intl.formatMessage({ id: 'pages.dashboard.layoutType' })}
            options={[
              { label: intl.formatMessage({ id: 'pages.dashboard.layoutGrid' }), value: 'grid' },
              { label: intl.formatMessage({ id: 'pages.dashboard.layoutWaterfall' }), value: 'waterfall' },
              { label: intl.formatMessage({ id: 'pages.dashboard.layoutFree' }), value: 'free' },
            ]} initialValue="grid" />
          <ProFormSelect name="theme" label={intl.formatMessage({ id: 'pages.dashboard.theme' })}
            options={[
              { label: intl.formatMessage({ id: 'pages.dashboard.themeLight' }), value: 'light' },
              { label: intl.formatMessage({ id: 'pages.dashboard.themeDark' }), value: 'dark' },
              { label: intl.formatMessage({ id: 'pages.dashboard.themeCustom' }), value: 'custom' },
            ]} initialValue="dark" />
          <ProFormSelect name="isPublic" label={intl.formatMessage({ id: 'pages.dashboard.visibility' })}
            options={[
              { label: intl.formatMessage({ id: 'pages.dashboard.private' }), value: 'false' },
              { label: intl.formatMessage({ id: 'pages.dashboard.public' }), value: 'true' },
            ]} initialValue="false" />
        </ModalForm>

        {/* 详情抽屉 */}
        <Drawer title={intl.formatMessage({ id: 'pages.dashboard.detail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
          <DetailContent id={state.viewingId} isMobile={isMobile} />
        </Drawer>

        {/* 设计器全屏抽屉 */}
        <Drawer
          title={null}
          closable
          placement="right"
          size="100%"
          open={state.designVisible}
          onClose={closeDesign}
          styles={{ body: { padding: 0 } }}
        >
          {state.designingId && (
            <DashboardDesigner
              dashboardId={state.designingId}
              onPreview={() => {
                // 从设计模式切换到预览模式
                set({ previewingId: state.designingId, previewVisible: true });
              }}
              onClose={closeDesign}
            />
          )}
        </Drawer>

        {/* 大屏预览全屏抽屉 */}
        <Drawer
          title={null}
          closable
          placement="right"
          size="100%"
          open={state.previewVisible}
          onClose={closePreview}
          styles={{ body: { padding: 0 } }}
        >
          {state.previewingId && (
            <DashboardPreview
              dashboardId={state.previewingId}
              onEdit={() => {
                // 从预览切换到设计
                closePreview();
                handleDesign(state.previewingId);
              }}
              onClose={closePreview}
            />
          )}
        </Drawer>
      </ProCard>
    </PageContainer>
  );
};

/** 看板详情 */
const DetailContent: React.FC<{ id: string; isMobile: boolean }> = ({ id, isMobile }) => {
  const intl = useIntl();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(id).then(r => {
        if (r.success && r.data) setDashboard(r.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading || !dashboard) return null;

  return (
    <ProDescriptions column={isMobile ? 1 : 2} bordered size="small">
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.name' })} span={2}><strong>{dashboard.name}</strong></ProDescriptions.Item>
      {dashboard.description && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.description' })} span={2}><div style={{ whiteSpace: 'pre-wrap' }}>{dashboard.description}</div></ProDescriptions.Item>}
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.layoutType' })}>
        {intl.formatMessage({ id: `pages.dashboard.layout${dashboard.layoutType.charAt(0).toUpperCase() + dashboard.layoutType.slice(1)}` })}
      </ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.theme' })}>
        {intl.formatMessage({ id: `pages.dashboard.theme${dashboard.theme.charAt(0).toUpperCase() + dashboard.theme.slice(1)}` })}
      </ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.visibility' })}>
        <Tag color={dashboard.isPublic ? 'blue' : 'orange'}>
          {intl.formatMessage({ id: dashboard.isPublic ? 'pages.dashboard.public' : 'pages.dashboard.private' })}
        </Tag>
      </ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.createdAt' })}>
        {dayjs(dashboard.createdAt).format('YYYY-MM-DD HH:mm')}
      </ProDescriptions.Item>
      {dashboard.updatedAt && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.updatedAt' })}>
        {dayjs(dashboard.updatedAt).format('YYYY-MM-DD HH:mm')}
      </ProDescriptions.Item>}
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.dashboard.totalCards' })} span={2}>
        {dashboard.cards?.length || 0} {intl.formatMessage({ id: 'pages.dashboard.totalCards' })}
      </ProDescriptions.Item>
    </ProDescriptions>
  );
};

export default DashboardListPage;
