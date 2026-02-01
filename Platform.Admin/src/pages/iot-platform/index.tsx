import React, { useState, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { PageContainer } from '@/components';
import { Card, Row, Col, Button, Space, Spin } from 'antd';
import {
  CloudServerOutlined,
  DatabaseOutlined,
  AlertOutlined,
  DesktopOutlined,
  ReloadOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { iotService } from '@/services/iotService';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import { theme } from 'antd';

const IoTPlatform: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const { styles } = useCommonStyles();
  const { token } = theme.useToken();
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
    message.success(intl.formatMessage({ id: 'pages.iotPlatform.message.refreshSuccess' }));
  };

  return (
    <PageContainer
      title={
        <Space>
          <CloudOutlined />
          {intl.formatMessage({ id: 'pages.iotPlatform.title' })}
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
            {intl.formatMessage({ id: 'pages.common.refresh' })}
          </Button>
        </Space>
      }
    >
      <Card
        className={styles.card}
      >
        <Spin spinning={loading}>
          <div style={{ padding: '20px 0' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalGateways' })}
                  value={statistics?.totalGateways || 0}
                  icon={<CloudServerOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.onlineGateways' })}
                  value={statistics?.onlineGateways || 0}
                  icon={<CloudServerOutlined />}
                  color="#52c41a"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalDevices' })}
                  value={statistics?.totalDevices || 0}
                  icon={<DesktopOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.onlineDevices' })}
                  value={statistics?.onlineDevices || 0}
                  icon={<DesktopOutlined />}
                  color="#52c41a"
                />
              </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalDatapoints' })}
                  value={statistics?.totalDataPoints || 0}
                  icon={<DatabaseOutlined />}
                  color="#722ed1"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <StatCard
                  title={intl.formatMessage({ id: 'pages.iotPlatform.status.totalAlarms' })}
                  value={statistics?.totalAlarms || 0}
                  icon={<AlertOutlined />}
                  color="#f5222d"
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

