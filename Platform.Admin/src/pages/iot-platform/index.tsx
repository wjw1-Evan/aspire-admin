import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components';
import { Card, Row, Col, Button, Space, message, Spin } from 'antd';
import {
  CloudServerOutlined,
  DatabaseOutlined,
  AlertOutlined,
  DesktopOutlined,
  ReloadOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { iotService } from '@/services/iotService';
import { StatCard } from '@/components';

const IoTPlatform: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadStatistics();
    // 每30秒刷新一次统计信息
    const interval = setInterval(loadStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await iotService.getPlatformStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStatistics();
    message.success('数据已刷新');
  };

  return (
    <PageContainer
      title={
        <Space>
          <CloudOutlined />
          物联网平台概览
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Card
        style={{ marginBottom: 16, borderRadius: 12 }}
      >
        <Spin spinning={loading}>
          <div style={{ padding: '20px 0' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="网关总数"
                  value={statistics?.totalGateways || 0}
                  icon={<CloudServerOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="在线网关"
                  value={statistics?.onlineGateways || 0}
                  icon={<CloudServerOutlined />}
                  color="#52c41a"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="设备总数"
                  value={statistics?.totalDevices || 0}
                  icon={<DesktopOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="在线设备"
                  value={statistics?.onlineDevices || 0}
                  icon={<DesktopOutlined />}
                  color="#52c41a"
                />
              </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="数据点总数"
                  value={statistics?.totalDataPoints || 0}
                  icon={<DatabaseOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="数据记录"
                  value={statistics?.totalDataRecords || 0}
                  icon={<DatabaseOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="未处理告警"
                  value={statistics?.unhandledAlarms || 0}
                  icon={<AlertOutlined />}
                  color="#ff4d4f"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title="最后更新"
                  value={statistics?.lastUpdatedAt ? new Date(statistics.lastUpdatedAt).toLocaleTimeString() : '-'}
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

