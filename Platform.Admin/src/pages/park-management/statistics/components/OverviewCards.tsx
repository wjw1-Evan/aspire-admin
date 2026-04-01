import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type { AssetStatistics, InvestmentStatistics, TenantStatistics, ServiceStatistics } from '@/services/park';
import styles from '../index.less';

const { Text } = Typography;

interface OverviewCardsProps {
  statistics: {
    asset: AssetStatistics | null;
    investment: InvestmentStatistics | null;
    tenant: TenantStatistics | null;
    service: ServiceStatistics | null;
  };
  period: string;
}

const TrendBadge: React.FC<{ value?: number; isYoY?: boolean }> = ({ value, isYoY = true }) => {
  const intl = useIntl();
  if (value === undefined || value === null) return null;
  const isUp = value >= 0;
  const color = isUp ? '#52c41a' : '#f5222d';
  const label = isYoY
    ? intl.formatMessage({ id: 'pages.park.statistics.yoy', defaultMessage: '同比' })
    : intl.formatMessage({ id: 'pages.park.statistics.mom', defaultMessage: '环比' });

  return (
    <Space size={4} style={{ fontSize: 12, color }}>
      <span>{label}</span>
      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </Space>
  );
};

const OverviewCards: React.FC<OverviewCardsProps> = ({ statistics, period }) => {
  const intl = useIntl();
  const { asset, investment, tenant, service } = statistics;

  const calculatedOccupancyRate = asset && asset.totalRentableArea > 0
    ? (asset.rentedArea / asset.totalRentableArea) * 100
    : 0;

  const isYearly = period === 'year' || period === 'last_year';
  const collectionRate = tenant && tenant.totalExpected && tenant.totalExpected > 0
    ? ((tenant.totalReceived / tenant.totalExpected) * 100).toFixed(1)
    : 0;
  const vacantArea = asset ? asset.totalRentableArea - asset.rentedArea : 0;

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return '#52c41a';
    if (rate >= 50) return '#faad14';
    return '#f5222d';
  };

  return (
    <Row gutter={[16, 16]} className={styles['stat-cards']}>
      {/* 营收表现 */}
      <Col xs={24} sm={12} lg={6}>
        <Card className={styles['stat-card']}>
          <Statistic
            title={intl.formatMessage({ id: 'pages.park.statistics.totalReceived', defaultMessage: '实收租金' })}
            value={tenant?.totalReceived || 0}
            prefix="¥"
            precision={2}
            styles={{ content: { color: '#cf1322' } }}
          />
          <div style={{ marginTop: 8 }}>
            <Space separator={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.totalExpected', defaultMessage: '应收租金' })}: ¥{(tenant?.totalExpected || 0).toLocaleString()}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, color: Number(collectionRate) >= 90 ? '#52c41a' : '#faad14' }}>
                {intl.formatMessage({ id: 'pages.park.statistics.collectionRate', defaultMessage: '收缴率' })}: {collectionRate}%
              </Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <TrendBadge value={tenant?.rentIncomeMoM} isYoY={false} />
            </div>
          </div>
        </Card>
      </Col>

      {/* 资产运营 */}
      <Col xs={24} sm={12} lg={6}>
        <Card className={styles['stat-card']}>
          <Statistic
            title={intl.formatMessage({ id: 'pages.park.statistics.occupancyRate', defaultMessage: '综合出租率' })}
            value={calculatedOccupancyRate}
            precision={1}
            suffix="%"
            styles={{ content: { color: getOccupancyColor(calculatedOccupancyRate) } }}
          />
          <div style={{ marginTop: 8 }}>
            <Space separator={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.rentedArea', defaultMessage: '已出租' })}: {(asset?.rentedArea || 0).toLocaleString()}㎡
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.availableArea', defaultMessage: '空置' })}: {vacantArea.toLocaleString()}㎡
              </Text>
            </Space>
            <Progress
              percent={calculatedOccupancyRate}
              size="small"
              showInfo={false}
              strokeColor={getOccupancyColor(calculatedOccupancyRate)}
              style={{ marginTop: 4 }}
            />
          </div>
        </Card>
      </Col>

      {/* 招商增长 */}
      <Col xs={24} sm={12} lg={6}>
        <Card className={styles['stat-card']}>
          <Statistic
            title={isYearly
              ? intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisYear', defaultMessage: '本年新增线索' })
              : intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisMonth', defaultMessage: '本月新增线索' })}
            value={investment?.newLeadsThisMonth || 0}
            prefix={<ArrowUpOutlined />}
            styles={{ content: { color: '#1890ff' } }}
          />
          <div style={{ marginTop: 8 }}>
            <Space separator={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.projectsInNegotiation', defaultMessage: '洽谈中' })}: {investment?.projectsInNegotiation || 0}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.conversionRate', defaultMessage: '转化' })}: {Number(investment?.conversionRate || 0).toFixed(1)}%
              </Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <TrendBadge value={investment?.newLeadsMoM} isYoY={false} />
            </div>
          </div>
        </Card>
      </Col>

      {/* 租户风险 */}
      <Col xs={24} sm={12} lg={6}>
        <Card className={styles['stat-card']}>
          <Statistic
            title={intl.formatMessage({ id: 'pages.park.statistics.activeTenants', defaultMessage: '在租租户' })}
            value={tenant?.activeTenants || 0}
            suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.tenant', defaultMessage: '家' })}
            styles={{ content: { color: '#722ed1' } }}
          />
          <div style={{ marginTop: 8 }}>
            <Space separator={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.expiringContracts', defaultMessage: '到期' })}:
                <span style={{ color: '#faad14', marginLeft: 4 }}>{tenant?.expiringContracts || 0}</span>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.pendingRequests', defaultMessage: '工单' })}:
                <span style={{ color: (service?.pendingRequests || 0) > 0 ? '#faad14' : 'inherit', marginLeft: 4 }}>{service?.pendingRequests || 0}</span>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {intl.formatMessage({ id: 'pages.park.statistics.averageRating', defaultMessage: '评分' })}:
                <span style={{ color: '#faad14', marginLeft: 4 }}>{service?.averageRating || 5.0}★</span>
              </Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <TrendBadge value={tenant?.totalTenantsYoY} />
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default OverviewCards;
