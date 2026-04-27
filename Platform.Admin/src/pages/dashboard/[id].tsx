import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, history } from '@umijs/max';
import { Space, Typography, Button, message, Spin, Result, Card, Row, Col, Empty, Grid } from 'antd';
import { PlusOutlined, SaveOutlined, ArrowLeftOutlined, SettingOutlined, DashboardOutlined } from '@ant-design/icons';
import { PageContainer, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProCard } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { getIntl } from '@umijs/max';
import type { ApiResponse } from '@/types';

const { useBreakpoint } = Grid;
const { Title } = Typography;

interface DashboardCard {
  id: string;
  cardType: string;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  dataSource: string;
  styleConfig: string;
  refreshInterval: number;
  lastRefreshAt?: string;
}

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

const api = {
  get: (id: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`),
  update: (id: string, data: Partial<Dashboard>) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/${id}`, { method: 'PUT', data }),
  addCard: (dashboardId: string, data: Partial<DashboardCard>) => request<ApiResponse<DashboardCard>>(`/apiservice/api/dashboard/${dashboardId}/cards`, { method: 'POST', data }),
  updateCard: (cardId: string, data: Partial<DashboardCard>) => request<ApiResponse<DashboardCard>>(`/apiservice/api/dashboard/cards/${cardId}`, { method: 'PUT', data }),
  deleteCard: (cardId: string) => request<ApiResponse<void>>(`/apiservice/api/dashboard/cards/${cardId}`, { method: 'DELETE' }),
};

const DashboardEditPage: React.FC = () => {
  const intl = getIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [state, setState] = useState({
    loading: true,
    dashboard: null as Dashboard | null,
    dashboardFormVisible: false,
    cardFormVisible: false,
    editingCard: null as DashboardCard | null,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    if (id) {
      loadDashboard();
    }
  }, [id]);

  const loadDashboard = async () => {
    if (!id) return;
    try {
      set({ loading: true });
      const res = await api.get(id);
      if (res.success && res.data) {
        set({ dashboard: res.data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('加载看板失败:', error);
      set({ loading: false });
    }
  };

  const handleUpdateDashboard = async (values: Record<string, any>) => {
    if (!state.dashboard) return false;
    const data = {
      name: values.name,
      description: values.description,
      layoutType: values.layoutType,
      theme: values.theme,
      isPublic: values.isPublic === 'true',
    };
    const res = await api.update(state.dashboard.id, data);
    if (res.success) {
      set({ dashboardFormVisible: false });
      loadDashboard();
    }
    return res.success;
  };

  const handleAddCard = async (values: Record<string, any>) => {
    if (!state.dashboard) return false;
    try {
      const res = await api.addCard(state.dashboard.id, values);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.addCardSuccess' }));
        set({ cardFormVisible: false, editingCard: null });
        loadDashboard();
      }
      return res.success;
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.addCardFailed' }));
      return false;
    }
  };

  const handleUpdateCard = async (values: Record<string, any>) => {
    if (!state.editingCard) return false;
    try {
      const res = await api.updateCard(state.editingCard.id, values);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.updateCardSuccess' }));
        set({ cardFormVisible: false, editingCard: null });
        loadDashboard();
      }
      return res.success;
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.updateCardFailed' }));
      return false;
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const res = await api.deleteCard(cardId);
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.dashboard.deleteCardSuccess' }));
        loadDashboard();
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.deleteCardFailed' }));
    }
  };

  const renderCard = (card: DashboardCard) => {
    return (
      <Card
        key={card.id}
        title={card.title}
        extra={
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => set({ editingCard: card, cardFormVisible: true })}
            >
              {intl.formatMessage({ id: 'pages.dashboard.settings' })}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleDeleteCard(card.id)}
            >
              {intl.formatMessage({ id: 'pages.dashboard.delete' })}
            </Button>
          </Space>
        }
        style={{ height: '100%' }}
      >
        <div style={{ height: card.height * 100 - 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description={intl.formatMessage({ id: 'pages.dashboard.cardPlaceholder' })} />
        </div>
      </Card>
    );
  };

  if (state.loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (!state.dashboard) {
    return (
      <PageContainer>
        <Result
          status="404"
          title={intl.formatMessage({ id: 'pages.dashboard.notFound' })}
          subTitle={intl.formatMessage({ id: 'pages.dashboard.notFoundDesc' })}
          extra={
            <Button type="primary" onClick={() => history.push('/dashboard')}>
              {intl.formatMessage({ id: 'pages.dashboard.backToList' })}
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/dashboard')}>
            {intl.formatMessage({ id: 'pages.dashboard.back' })}
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {state.dashboard.name}
          </Title>
        </Space>
        <Space>
          <Button
            icon={<SaveOutlined />}
            onClick={() => set({ dashboardFormVisible: true })}
          >
            {intl.formatMessage({ id: 'pages.dashboard.edit' })}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => set({ cardFormVisible: true, editingCard: null })}
          >
            {intl.formatMessage({ id: 'pages.dashboard.addCard' })}
          </Button>
        </Space>
      </div>

      {state.dashboard.description && (
        <div style={{ marginBottom: 16, color: '#666' }}>
          {state.dashboard.description}
        </div>
      )}

      {state.dashboard.cards.length === 0 ? (
        <Empty
          description={intl.formatMessage({ id: 'pages.dashboard.noCards' })}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => set({ cardFormVisible: true, editingCard: null })}
          >
            {intl.formatMessage({ id: 'pages.dashboard.addFirstCard' })}
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {state.dashboard.cards.map(card => (
            <Col key={card.id} xs={24} sm={12} md={8} lg={6}>
              {renderCard(card)}
            </Col>
          ))}
        </Row>
      )}

      <ModalForm
        key={state.dashboard?.id || 'edit'}
        title={intl.formatMessage({ id: 'pages.dashboard.edit' })}
        open={state.dashboardFormVisible}
        onOpenChange={(open) => { if (!open) set({ dashboardFormVisible: false }); }}
        initialValues={state.dashboard ? {
          name: state.dashboard.name,
          description: state.dashboard.description,
          layoutType: state.dashboard.layoutType,
          theme: state.dashboard.theme,
          isPublic: state.dashboard.isPublic ? 'true' : 'false',
        } : undefined}
        onFinish={handleUpdateDashboard}
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
        />
        <ProFormSelect
          name="theme"
          label={intl.formatMessage({ id: 'pages.dashboard.theme' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.themeLight' }), value: 'light' },
            { label: intl.formatMessage({ id: 'pages.dashboard.themeDark' }), value: 'dark' },
            { label: intl.formatMessage({ id: 'pages.dashboard.themeCustom' }), value: 'custom' },
          ]}
        />
        <ProFormSelect
          name="isPublic"
          label={intl.formatMessage({ id: 'pages.dashboard.visibility' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.private' }), value: 'false' },
            { label: intl.formatMessage({ id: 'pages.dashboard.public' }), value: 'true' },
          ]}
        />
      </ModalForm>

      <ModalForm
        key={state.editingCard?.id || 'create'}
        title={state.editingCard ? intl.formatMessage({ id: 'pages.dashboard.editCard' }) : intl.formatMessage({ id: 'pages.dashboard.addCard' })}
        open={state.cardFormVisible}
        onOpenChange={(open) => { if (!open) set({ cardFormVisible: false, editingCard: null }); }}
        initialValues={state.editingCard || {
          cardType: 'statistic',
          title: '',
          positionX: 0,
          positionY: 0,
          width: 4,
          height: 3,
          dataSource: '{}',
          styleConfig: '{}',
          refreshInterval: 300,
        }}
        onFinish={state.editingCard ? handleUpdateCard : handleAddCard}
        autoFocusFirstInput
        width={600}
      >
        <ProFormSelect
          name="cardType"
          label={intl.formatMessage({ id: 'pages.dashboard.cardType' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeStatistic' }), value: 'statistic' },
            { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeChart' }), value: 'chart' },
            { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeTable' }), value: 'table' },
            { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeProgress' }), value: 'progress' },
            { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeText' }), value: 'text' },
            { label: intl.formatMessage({ id: 'pages.dashboard.cardTypeImage' }), value: 'image' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'pages.dashboard.cardTitle' })}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          name="width"
          label={intl.formatMessage({ id: 'pages.dashboard.cardWidth' })}
          options={[
            { label: '4列', value: 4 },
            { label: '6列', value: 6 },
            { label: '8列', value: 8 },
            { label: '12列', value: 12 },
          ]}
          initialValue={4}
        />
        <ProFormSelect
          name="height"
          label={intl.formatMessage({ id: 'pages.dashboard.cardHeight' })}
          options={[
            { label: '3行', value: 3 },
            { label: '4行', value: 4 },
            { label: '5行', value: 5 },
            { label: '6行', value: 6 },
          ]}
          initialValue={3}
        />
        <ProFormSelect
          name="refreshInterval"
          label={intl.formatMessage({ id: 'pages.dashboard.refreshInterval' })}
          options={[
            { label: intl.formatMessage({ id: 'pages.dashboard.refresh1min' }), value: 60 },
            { label: intl.formatMessage({ id: 'pages.dashboard.refresh5min' }), value: 300 },
            { label: intl.formatMessage({ id: 'pages.dashboard.refresh15min' }), value: 900 },
            { label: intl.formatMessage({ id: 'pages.dashboard.refresh30min' }), value: 1800 },
            { label: intl.formatMessage({ id: 'pages.dashboard.refresh1hour' }), value: 3600 },
          ]}
          initialValue={300}
        />
        <ProFormTextArea
          name="dataSource"
          label={intl.formatMessage({ id: 'pages.dashboard.dataSource' })}
          fieldProps={{ rows: 6 }}
          placeholder={intl.formatMessage({ id: 'pages.dashboard.dataSourcePlaceholder' })}
          rules={[{ required: true }]}
        />
        <ProFormTextArea
          name="styleConfig"
          label={intl.formatMessage({ id: 'pages.dashboard.styleConfig' })}
          fieldProps={{ rows: 4 }}
          placeholder={intl.formatMessage({ id: 'pages.dashboard.styleConfigPlaceholder' })}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default DashboardEditPage;
