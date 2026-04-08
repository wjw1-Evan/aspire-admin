import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Row, Col, Button, Space, Spin, Tag } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { CloudServerOutlined, DatabaseOutlined, AlertOutlined, DesktopOutlined, ReloadOutlined, WifiOutlined } from '@ant-design/icons';
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

const API_PREFIX = '/apiservice/api/iot';

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
    <PageContainer>
      <ProCard title={
        <Space size={24}>
          <Space><WifiOutlined />物联网平台</Space>
          <Space size={12}>
            <Tag color="blue">网关 {state.statistics?.totalGateways || 0}</Tag>
            <Tag color="green">在线网关 {state.statistics?.onlineGateways || 0}</Tag>
            <Tag color="cyan">设备 {state.statistics?.totalDevices || 0}</Tag>
            <Tag color="lime">在线设备 {state.statistics?.onlineDevices || 0}</Tag>
            <Tag color="purple">数据点 {state.statistics?.totalDataPoints || 0}</Tag>
            <Tag color="orange">告警 {state.statistics?.totalAlarms || 0}</Tag>
            <Tag color="red">未处理 {state.statistics?.unhandledAlarms || 0}</Tag>
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
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><CloudServerOutlined /> 网关总数</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{state.statistics?.onlineGateways || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><CloudServerOutlined /> 在线网关</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{state.statistics?.totalDevices || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DesktopOutlined /> 设备总数</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{state.statistics?.onlineDevices || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DesktopOutlined /> 在线设备</div>
              </div>
            </Col>
          </Row>
          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{state.statistics?.totalDataPoints || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DatabaseOutlined /> 数据点总数</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fff1f0', borderRadius: 8, border: '1px solid #ffccc7' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{state.statistics?.totalAlarms || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><AlertOutlined /> 告警总数</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{state.statistics?.unhandledAlarms || 0}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><AlertOutlined /> 未处理告警</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#666' }}>{state.statistics?.lastUpdatedAt ? new Date(state.statistics.lastUpdatedAt).toLocaleTimeString() : '-'}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}><DatabaseOutlined /> 最后更新</div>
              </div>
            </Col>
          </Row>
        </Spin>
      </ProCard>
    </PageContainer>
  );
};

export default IoTPlatform;
