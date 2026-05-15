import { ReloadOutlined } from '@ant-design/icons';
import { request, useIntl, useParams } from '@umijs/max';
import { Button, Card, Col, Empty, Grid, Result, Row, Space, Spin, Typography, App } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import type { ApiResponse } from '@/types';
import { PageContainer } from '@ant-design/pro-components';


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

interface CardDataResponse {
  cardId: string;
  data: any;
  refreshedAt: string;
}

const api = {
  getByToken: (token: string) => request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/share/${token}`),
  getCardData: (cardId: string) =>
    request<ApiResponse<CardDataResponse>>(`/apiservice/api/dashboard/cards/${cardId}/data`),
  refreshCardData: (cardId: string) =>
    request<ApiResponse<CardDataResponse>>(`/apiservice/api/dashboard/cards/${cardId}/refresh`, { method: 'POST' }),
};

const DashboardSharePage: React.FC = () => {
  const { message } = App.useApp();
  const intl = useIntl();
    const { token } = useParams<{ token: string }>();
  const screens = useBreakpoint();
  const _isMobile = !screens.md;

  const [state, setState] = useState({
    loading: true,
    dashboard: null as Dashboard | null,
    cardDataMap: new Map<string, CardDataResponse>(),
  });
  const set = useCallback((partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial })), []);

  const loadDashboard = async () => {
    const { message } = App.useApp();
    if (!token) return;
    try {
      set({ loading: true });
      const res = await api.getByToken(token);
      if (res.success && res.data) {
        set({ dashboard: res.data, loading: false });
        loadAllCardsData(res.data.cards);
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('加载看板失败:', error);
      set({ loading: false });
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token, loadDashboard]);

  const loadAllCardsData = async (cards: DashboardCard[]) => {
    const { message } = App.useApp();
    for (const card of cards) {
      await loadCardData(card.id);
    }
  };

  const loadCardData = async (cardId: string) => {
    const { message } = App.useApp();
    try {
      const res = await api.getCardData(cardId);
      if (res.success && res.data) {
        setState((prev) => ({
          ...prev,
          cardDataMap: new Map(prev.cardDataMap).set(cardId, res.data!),
        }));
      }
    } catch (error) {
      console.error('加载卡片数据失败:', error);
    }
  };

  const handleRefresh = async (cardId: string) => {
    const { message } = App.useApp();
    try {
      const res = await api.refreshCardData(cardId);
      if (res.success && res.data) {
        setState((prev) => ({
          ...prev,
          cardDataMap: new Map(prev.cardDataMap).set(cardId, res.data!),
        }));
        message.success(intl.formatMessage({ id: 'pages.dashboard.refreshSuccess' }));
      }
    } catch (_error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.refreshFailed' }));
    }
  };

  const handleRefreshAll = async () => {
    const { message } = App.useApp();
    if (!state.dashboard) return;
    for (const card of state.dashboard.cards) {
      await handleRefresh(card.id);
    }
  };

  const renderCard = (card: DashboardCard) => {
    const { message } = App.useApp();
    const cardData = state.cardDataMap.get(card.id);

    return (
      <Card
        key={card.id}
        title={card.title}
        extra={
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleRefresh(card.id)}>
            {intl.formatMessage({ id: 'pages.dashboard.refresh' })}
          </Button>
        }
        style={{ height: '100%' }}
      >
        <div
          style={{ height: card.height * 100 - 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {cardData ? (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <pre
                style={{
                  textAlign: 'left',
                  maxHeight: '100%',
                  overflow: 'auto',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(cardData.data, null, 2)}
              </pre>
            </div>
          ) : (
            <Spin />
          )}
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
          title={intl.formatMessage({ id: 'pages.dashboard.shareNotFound' })}
          subTitle={intl.formatMessage({ id: 'pages.dashboard.shareNotFoundDesc' })}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {state.dashboard.name}
          </Title>
          <span style={{ color: 'var(--ant-color-text-tertiary)', fontSize: '14px' }}>
            {intl.formatMessage({ id: 'pages.dashboard.sharedView' })}
          </span>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={handleRefreshAll}>
          {intl.formatMessage({ id: 'pages.dashboard.refreshAll' })}
        </Button>
      </div>

      {state.dashboard.description && (
        <div style={{ marginBottom: 16, color: 'var(--ant-color-text-description)' }}>{state.dashboard.description}</div>
      )}

      {state.dashboard.cards.length === 0 ? (
        <Empty
          description={intl.formatMessage({ id: 'pages.dashboard.noCards' })}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {state.dashboard.cards.map((card) => (
            <Col key={card.id} xs={24} sm={12} md={8} lg={6}>
              {renderCard(card)}
            </Col>
          ))}
        </Row>
      )}
    </PageContainer>
  );
};

export default DashboardSharePage;
