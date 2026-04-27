import React, { useRef, useState, useEffect, useCallback } from 'react';
import { request, useIntl, history } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Grid, message, Card, Row, Col, Empty, Result, Spin } from 'antd';
import { Drawer } from 'antd';
import { PageContainer, ProCard, ModalForm, ProDescriptions, ProTable, ProColumns, ActionType, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { PlusOutlined, CopyOutlined, ShareAltOutlined, DeleteOutlined, EditOutlined, EyeOutlined, DashboardOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';
import { getErrorMessage } from '@/utils/getErrorMessage';

const { useBreakpoint } = Grid;

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layoutType: string;
  theme: string;
  isPublic: boolean;
  userId: string;
  cards: DashboardCard[];
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardCard {
  id: string;
  cardType: string;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
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
    designVisible: false,
    designingId: '',
    viewingId: '',
    detailLoading: false,
    search: '' as string,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);

  const handleView = (id: string) => {
    set({ viewingId: id, detailVisible: true });
  };

  const handleDesign = (id: string) => {
    set({ designingId: id, designVisible: true });
  };

  const closeDesign = () => {
    set({ designingId: '', designVisible: false });
    loadStatistics();
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await api.get(id);
      if (res.success && res.data) {
        set({ editingDashboard: res.data, formVisible: true });
      }
    } catch (error) {
      message.error(getErrorMessage(error as any, 'pages.dashboard.loadFailed'));
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
      message.error(getErrorMessage(error as any, 'pages.dashboard.copyFailed'));
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
      message.error(getErrorMessage(error as any, 'pages.dashboard.shareFailed'));
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
      message.error(getErrorMessage(error as any, 'pages.dashboard.deleteFailed'));
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
      width: 180,
      render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleView(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.view' })}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.edit' })}
          </Button>
          <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => handleDesign(r.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.design' })}
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
      message.error(getErrorMessage(error as any, 'pages.dashboard.operationFailed'));
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
          request={async (params: any, sort: any, filter: any) => {
            const res = await api.list({ ...params, search: state.search, sort, filter });
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

        <Drawer title={intl.formatMessage({ id: 'pages.dashboard.detail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
          <DetailContent id={state.viewingId} isMobile={isMobile} />
        </Drawer>

        <Drawer title={intl.formatMessage({ id: 'pages.dashboard.design' })} size="100%" open={state.designVisible} onClose={closeDesign}>
          {state.designingId && <DashboardDesigner id={state.designingId} onClose={closeDesign} />}
        </Drawer>
      </ProCard>
    </PageContainer>
  );
};

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

  if (loading) return null;
  if (!dashboard) return null;

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
    </ProDescriptions>
  );
};

const DashboardDesigner: React.FC<{ id: string; onClose: () => void }> = ({ id }) => {
  const intl = useIntl();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardFormVisible, setCardFormVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<DashboardCard | null>(null);

  const api = {
    get: (id: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`),
    addCard: (dashboardId: string, data: Partial<DashboardCard>) => request<ApiResponse<DashboardCard>>(`/apiservice/api/dashboard/${dashboardId}/cards`, { method: 'POST', data }),
    deleteCard: (cardId: string) => request<ApiResponse<void>>(`/apiservice/api/dashboard/cards/${cardId}`, { method: 'DELETE' }),
  };

  useEffect(() => { loadDashboard(); }, [id]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(id);
      if (res.success && res.data) setDashboard(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddCard = async (values: Record<string, any>) => {
    if (!dashboard) return false;
    try {
      const res = await api.addCard(dashboard.id, values);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.addCardSuccess' }));
        setCardFormVisible(false);
        loadDashboard();
      }
      return res.success;
    } catch { return false; }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const res = await api.deleteCard(cardId);
      if (res.success) message.success(intl.formatMessage({ id: 'pages.dashboard.deleteCardSuccess' }));
      loadDashboard();
    } catch {}
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin /></div>;
  if (!dashboard) return <Result status="404" title={intl.formatMessage({ id: 'pages.dashboard.notFound' })} />;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCardFormVisible(true)}>{intl.formatMessage({ id: 'pages.dashboard.addCard' })}</Button>
        </Space>
      </div>
      <Row gutter={16}>
        {dashboard.cards.length === 0 ? (
          <Col span={24}><Empty description={intl.formatMessage({ id: 'pages.dashboard.noCards' })} /></Col>
        ) : (
          dashboard.cards.map(card => (
            <Col key={card.id} span={card.width} style={{ marginBottom: 16 }}>
              <Card title={card.title} extra={
                <Button type="link" size="small" danger onClick={() => handleDeleteCard(card.id)}>{intl.formatMessage({ id: 'pages.dashboard.delete' })}</Button>
              } style={{ height: card.height }}>
                <Empty description={intl.formatMessage({ id: 'pages.dashboard.cardPlaceholder' })} />
              </Card>
            </Col>
          ))
        )}
      </Row>
      <ModalForm title={intl.formatMessage({ id: 'pages.dashboard.addCard' })} open={cardFormVisible} onOpenChange={setCardFormVisible} onFinish={handleAddCard} width={600}>
        <ProFormText name="title" label={intl.formatMessage({ id: 'pages.dashboard.cardTitle' })} rules={[{ required: true }]} />
        <ProFormSelect name="cardType" label={intl.formatMessage({ id: 'pages.dashboard.cardType' })} options={[
          { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeStatistic' }), value: 'statistic' },
          { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeChart' }), value: 'chart' },
          { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeTable' }), value: 'table' },
        ]} rules={[{ required: true }]} />
      </ModalForm>
    </div>
  );
};

export default DashboardListPage;
