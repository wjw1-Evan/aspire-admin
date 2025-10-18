import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Progress, Button, Space, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getOverallQualityOverview } from './service';

const DataQualityPage: React.FC = () => {
  const [overview, setOverview] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getOverallQualityOverview();
      if (response.success) {
        setOverview(response.data);
      }
    } catch (error) {
      console.error('加载质量概览失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PageContainer
      header={{
        title: '数据质量',
        subTitle: '监控和管理数据质量',
        extra: [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
          >
            刷新
          </Button>,
        ],
      }}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="质量规则总数"
              value={overview.totalRules || 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用规则"
              value={overview.enabledRules || 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总检查次数"
              value={overview.totalChecks || 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="整体通过率"
              value={overview.overallPassRate || 0}
              suffix="%"
              precision={2}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="检查结果统计">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Tag color="green">通过检查: {overview.passedChecks || 0}</Tag>
                <Tag color="red">失败检查: {overview.failedChecks || 0}</Tag>
              </div>
              <Progress
                percent={overview.overallPassRate || 0}
                status={
                  overview.overallPassRate >= 90
                    ? 'success'
                    : overview.overallPassRate >= 70
                      ? 'normal'
                      : 'exception'
                }
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="数据质量趋势">
            <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
              <p>质量趋势图表功能开发中...</p>
              <p>
                当前整体质量:{' '}
                <Tag color="blue">{overview.overallPassRate || 0}%</Tag>
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DataQualityPage;
