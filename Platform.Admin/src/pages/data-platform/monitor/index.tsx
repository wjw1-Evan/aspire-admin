import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Button, Space, Table, Tag } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import {
  getTaskStatistics,
  getActiveAlerts,
  getSystemMetrics,
} from './service';

const TaskMonitorPage: React.FC = () => {
  const [statistics, setStatistics] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, metricsRes] = await Promise.all([
        getTaskStatistics(),
        getActiveAlerts(),
        getSystemMetrics(),
      ]);

      if (statsRes.success) setStatistics(statsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (metricsRes.success) setMetrics(metricsRes.data);
    } catch (error) {
      console.error('加载监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 每30秒刷新一次数据
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const alertColumns = [
    {
      title: '告警规则',
      dataIndex: 'ruleName',
      key: 'ruleName',
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: number) => {
        const severityMap = {
          1: { text: '信息', color: 'blue' },
          2: { text: '警告', color: 'orange' },
          3: { text: '错误', color: 'red' },
          4: { text: '严重', color: 'purple' },
        };
        const config = severityMap[severity as keyof typeof severityMap] || {
          text: '未知',
          color: 'default',
        };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '触发时间',
      dataIndex: 'triggeredAt',
      key: 'triggeredAt',
      render: (time: string) => new Date(time).toLocaleString(),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '任务监控',
        subTitle: '监控数据管道和任务执行状态',
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
              title="运行中任务"
              value={statistics.runningTasks || 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成任务"
              value={statistics.completedTasks || 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败任务"
              value={statistics.failedTasks || 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={statistics.successRate || 0}
              suffix="%"
              precision={2}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="系统指标">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>CPU使用率: {metrics.cpuUsage?.toFixed(2) || 0}%</div>
              <div>内存使用率: {metrics.memoryUsage?.toFixed(2) || 0}%</div>
              <div>磁盘使用率: {metrics.diskUsage?.toFixed(2) || 0}%</div>
              <div>活跃连接: {metrics.activeConnections || 0}</div>
            </Space>
          </Card>
        </Col>
        <Col span={16}>
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined />
                活跃告警
                <Tag color="red">{alerts.length}</Tag>
              </Space>
            }
          >
            <Table
              dataSource={alerts}
              columns={alertColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无活跃告警' }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default TaskMonitorPage;
