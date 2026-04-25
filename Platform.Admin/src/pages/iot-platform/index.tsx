import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Row, Col, Button, Space, Spin, Tag, Grid } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { CloudServerOutlined, DatabaseOutlined, AlertOutlined, DesktopOutlined, ReloadOutlined, WifiOutlined } from '@ant-design/icons';
import { ApiResponse } from '@/types';

const { useBreakpoint } = Grid;

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

const API_PREFIX = '/apiservice/api/iot';

const api = {
  statistics: () => request<ApiResponse<PlatformStatistics>>(`${API_PREFIX}/statistics/platform`, { method: 'GET' }),
};

const IoTPlatform: React.FC = () => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [state, setState] = useState({ loading: false, statistics: null as PlatformStatistics | null });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    loadStatistics();
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
    <PageContainer>
      <ProCard title={
        <Space size={24}>
          <Space><WifiOutlined />{intl.formatMessage({ id: 'pages.iotPlatform.title' })}</Space>
          <Space size={12}>
            <Tag color="blue">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.totalGateways' })} {state.statistics?.totalGateways || 0}</Tag>
            <Tag color="green">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.onlineGateways' })} {state.statistics?.onlineGateways || 0}</Tag>
            <Tag color="cyan">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.totalDevices' })} {state.statistics?.totalDevices || 0}</Tag>
            <Tag color="lime">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.onlineDevices' })} {state.statistics?.onlineDevices || 0}</Tag>
            <Tag color="purple">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.totalDataPoints' })} {state.statistics?.totalDataPoints || 0}</Tag>
            <Tag color="orange">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.totalAlarms' })} {state.statistics?.totalAlarms || 0}</Tag>
            <Tag color="red">{intl.formatMessage({ id: 'pages.iotPlatform.statistics.unhandledAlarms' })} {state.statistics?.unhandledAlarms || 0}</Tag>
          </Space>
        </Space>
      } extra={
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={state.loading}>
          {intl.formatMessage({ id: 'pages.common.refresh' })}
        </Button>
      }>
        <Spin spinning={state.loading}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{state.statistics?.totalGateways || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><CloudServerOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.totalGateways' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{state.statistics?.onlineGateways || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><CloudServerOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.onlineGateways' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{state.statistics?.totalDevices || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DesktopOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.totalDevices' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{state.statistics?.onlineDevices || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DesktopOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.onlineDevices' })}</div>
              </div>
            </Col>
          </Row>
          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{state.statistics?.totalDataPoints || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DatabaseOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.totalDataPoints' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fff1f0', borderRadius: 8, border: '1px solid #ffccc7' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{state.statistics?.totalAlarms || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><AlertOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.totalAlarms' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{state.statistics?.unhandledAlarms || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><AlertOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.unhandledAlarms' })}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#666' }}>{state.statistics?.lastUpdatedAt ? new Date(state.statistics.lastUpdatedAt).toLocaleTimeString() : '-'}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DatabaseOutlined /> {intl.formatMessage({ id: 'pages.iotPlatform.card.lastUpdatedAt' })}</div>
              </div>
            </Col>
          </Row>
        </Spin>
      </ProCard>
    </PageContainer>
  );
};

export default IoTPlatform;
