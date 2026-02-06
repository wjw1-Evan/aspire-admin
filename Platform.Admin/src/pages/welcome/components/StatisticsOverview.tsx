import React from 'react';
import { Card, Row, Col, Space, theme } from 'antd';
import { BarChartOutlined, TeamOutlined, ThunderboltOutlined, CrownOutlined, RocketOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import StatCard from './StatCard';

interface StatisticsOverviewProps {
    readonly statistics: any;
    readonly loading: boolean;
}

const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({ statistics, loading }) => {
    const intl = useIntl();
    const { token } = theme.useToken();

    return (
        <Card
            title={
                <Space>
                    <BarChartOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.overview' })}</span>
                </Space>
            }
            style={{ marginTop: '16px', marginBottom: '16px', borderRadius: '12px' }}
        >
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={6}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.welcome.stats.totalUsers' })}
                        value={statistics?.totalUsers || 0}
                        icon={<TeamOutlined />}
                        color={token.colorPrimary}
                        loading={loading}
                        token={token}
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.welcome.stats.activeUsers' })}
                        value={statistics?.activeUsers || 0}
                        icon={<ThunderboltOutlined />}
                        color={token.colorSuccess}
                        loading={loading}
                        token={token}
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.welcome.stats.adminUsers' })}
                        value={statistics?.adminUsers || 0}
                        icon={<CrownOutlined />}
                        color={token.colorWarning}
                        loading={loading}
                        token={token}
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.welcome.stats.newUsersToday' })}
                        value={statistics?.newUsersToday || 0}
                        icon={<RocketOutlined />}
                        color={token.colorError}
                        loading={loading}
                        token={token}
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default StatisticsOverview;
