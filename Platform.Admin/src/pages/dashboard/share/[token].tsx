import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from '@umijs/max';
import { Space, Typography, Button, message, Spin, Result, Card, Row, Col, Empty } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { getIntl } from '@umijs/max';
import type { ApiResponse } from '@/types';

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

const DashboardSharePage: React.FC = () => {
  const intl = getIntl();
  const { token } = useParams<{ token: string }>();

  const [state, setState] = useState({
    loading: true,
    dashboard: null as Dashboard | null,
    cardDataMap: new Map<string, CardDataResponse>(),
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const loadDashboard = async () => {
    try {
      set({ loading: true });
      const res = await request<ApiResponse<Dashboard>>(`/apiservice/api/dashboard/share/${token}`);
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

  const loadAllCardsData = async (cards: DashboardCard[]) => {
    for (const card of cards) {
      await loadCardData(card.id);
    }
  };

  const loadCardData = async (cardId: string) => {
    try {
      const res = await request<ApiResponse<CardDataResponse>>(`/apiservice/api/dashboard/cards/${cardId}/data`);
      if (res.success && res.data) {
        setState(prev => ({
          ...prev,
          cardDataMap: new Map(prev.cardDataMap).set(cardId, res.data!),
        }));
      }
    } catch (error) {
      console.error('加载卡片数据失败:', error);
    }
  };

  const handleRefresh = async (cardId: string) => {
    try {
      const res = await request<ApiResponse<CardDataResponse>>(`/apiservice/api/dashboard/cards/${cardId}/refresh`, { method: 'POST' });
      if (res.success && res.data) {
        setState(prev => ({
          ...prev,
          cardDataMap: new Map(prev.cardDataMap).set(cardId, res.data!),
        }));
        message.success(intl.formatMessage({ id: 'pages.dashboard.refreshSuccess' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.dashboard.refreshFailed' }));
    }
  };

  const handleRefreshAll = async () => {
    if (!state.dashboard) return;
    for (const card of state.dashboard.cards) {
      await handleRefresh(card.id);
    }
  };

  const renderCard = (card: DashboardCard) => {
    const cardData = state.cardDataMap.get(card.id);

    return (
      <Card
        key={card.id}
        title={card.title}
        extra={
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRefresh(card.id)}
          >
            {intl.formatMessage({ id: 'pages.dashboard.refresh' })}
          </Button>
        }
        style={{ height: '100%' }}
      >
        <div style={{ height: card.height * 100 - 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cardData ? (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <pre style={{ textAlign: 'left', maxHeight: '100%', overflow: 'auto' }}>
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
      <ProCard>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </ProCard>
    );
  }

  if (!state.dashboard) {
    return (
      <ProCard>
        <Result
          status="404"
          title={intl.formatMessage({ id: 'pages.dashboard.shareNotFound' })}
          subTitle={intl.formatMessage({ id: 'pages.dashboard.shareNotFoundDesc' })}
        />
      </ProCard>
    );
  }

  return (
    <ProCard>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {state.dashboard.name}
          </Title>
          <span style={{ color: '#999', fontSize: '14px' }}>
            {intl.formatMessage({ id: 'pages.dashboard.sharedView' })}
          </span>
        </Space>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefreshAll}
        >
          {intl.formatMessage({ id: 'pages.dashboard.refreshAll' })}
        </Button>
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
        />
      ) : (
        <Row gutter={[16, 16]}>
          {state.dashboard.cards.map(card => (
            <Col key={card.id} xs={24} sm={12} md={8} lg={6}>
              {renderCard(card)}
            </Col>
          ))}
        </Row>
      )}
    </ProCard>
  );
};

export default DashboardSharePage;
