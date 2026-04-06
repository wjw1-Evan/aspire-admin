import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Card, Row, Col, Button, Space, Spin } from 'antd';
import { CloudServerOutlined, DatabaseOutlined, AlertOutlined, DesktopOutlined, ReloadOutlined, CloudOutlined } from '@ant-design/icons';
import { StatCard } from '@/components';
import { ApiResponse } from '@/types';

interface PlatformStatistics {
  totalGateways: number;
  onlineGateways: number;
  totalDevices: number;
  onlineDevices: number;
  totalDataPoints: number;
  totalAlarms: number;
  unhandledAlarms: number;
  lastUpdatedAt?: string;
}

const API_PREFIX = '/api/iot';

const api = {
  statistics: () => request<ApiResponse<PlatformStatistics>>(`${API_PREFIX}/statistics/platform`, { method: 'GET' }),
};

const IoTPlatform: React.FC = () => {
  const intl = useIntl();
  const [state, setState] = useState({ loading: false, statistics: null as PlatformStatistics | null });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    loadStatistics();
    const interval = setInterval(loadStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    try {
      set({ loading: true });
      const res = await api.statistics();
      if (res.success && res.data) {
        set({ statistics: res.data });
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      set({ loading: false });
    }
  };

  const handleRefresh = () => {
    loadStatistics();
  };

  return (
    <PageContainer
      title={
        <Space>
          <CloudOutlined />
          {intl.formatMessage({ id: 'pages.iotPlatform.title' })}
        </Space>
      }
      extra={
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={state.loading}
          >
            {intl.formatMessage({ id: 'pages.common.refresh' })}
          </Button>
        </Space>
      }
    >
      <Card style={{ marginBottom: 16 }}>
        <Spin spinning={state.loading}>
          <div style={{ padding: '20px 0' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalGateways' })}
                  value={state.statistics?.totalGateways || 0}
                  icon={<CloudServerOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.onlineGateways' })}
                  value={state.statistics?.onlineGateways || 0}
                  icon={<CloudServerOutlined />}
                  color="#52c41a"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalDevices' })}
                  value={state.statistics?.totalDevices || 0}
                  icon={<DesktopOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.onlineDevices' })}
                  value={state.statistics?.onlineDevices || 0}
                  icon={<DesktopOutlined />}
                  color="#52c41a"
                />
              </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalDatapoints' })}
                  value={state.statistics?.totalDataPoints || 0}
                  icon={<DatabaseOutlined />}
                  color="#722ed1"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalAlarms' })}
                  value={state.statistics?.totalAlarms || 0}
                  icon={<AlertOutlined />}
                  color="#f5222d"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="未处理告警"
                  value={state.statistics?.unhandledAlarms || 0}
                  icon={<AlertOutlined />}
                  color="#ff4d4f"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="最后更新"
                  value={state.statistics?.lastUpdatedAt ? new Date(state.statistics.lastUpdatedAt).toLocaleTimeString() : '-'}
                  icon={<DatabaseOutlined />}
                  color="#666666"
                />
              </Col>
            </Row>
          </div>
        </Spin>
      </Card>
    </PageContainer>
  );
};

export default IoTPlatform;
