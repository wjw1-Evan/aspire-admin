import React, { useCallback, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Tabs, Typography, Progress, Tag, Empty, Button, Space, Table, Radio } from 'antd';
import { useIntl } from '@umijs/max';
import {
    BankOutlined,
    TeamOutlined,
    FileTextOutlined,
    CustomerServiceOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    ReloadOutlined,
    HomeOutlined,
    FundProjectionScreenOutlined,
    UserSwitchOutlined,
    StarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import * as parkService from '@/services/park';
import { StatisticsPeriod } from '@/services/park';
import type { AssetStatistics, InvestmentStatistics, TenantStatistics, ServiceStatistics } from '@/services/park';
import styles from './index.less';

const { Text, Title } = Typography;

interface AllStatistics {
    asset: AssetStatistics | null;
    investment: InvestmentStatistics | null;
    tenant: TenantStatistics | null;
    service: ServiceStatistics | null;
}

const StatisticsPage: React.FC = () => {
    const intl = useIntl();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [period, setPeriod] = useState<StatisticsPeriod>(StatisticsPeriod.Month);
    const [statistics, setStatistics] = useState<AllStatistics>({
        asset: null,
        investment: null,
        tenant: null,
        service: null,
    });

    // 加载所有统计数据
    const loadAllStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const [assetRes, investmentRes, tenantRes, serviceRes] = await Promise.all([
                parkService.getAssetStatistics(period),
                parkService.getInvestmentStatistics(period),
                parkService.getTenantStatistics(period),
                parkService.getServiceStatistics(period),
            ]);

            setStatistics({
                asset: assetRes.success ? assetRes.data ?? null : null,
                investment: investmentRes.success ? investmentRes.data ?? null : null,
                tenant: tenantRes.success ? tenantRes.data ?? null : null,
                service: serviceRes.success ? serviceRes.data ?? null : null,
            });
        } catch (error) {
            console.error('Failed to load statistics:', error);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadAllStatistics();
    }, [loadAllStatistics]);

    // 渲染 YoY/MoM 趋势
    const renderTrend = (value?: number, isYoY: boolean = true) => {
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
                <span>{Math.abs(value * 100).toFixed(1)}%</span>
            </Space>
        );
    };

    // 综合概览卡片
    const renderOverviewCards = () => {
        const { asset, investment, tenant, service } = statistics;

        return (
            <Row gutter={[16, 16]} className={styles['stat-cards']}>
                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.statistics.totalBuildings', defaultMessage: '楼宇总数' })}
                            value={asset?.totalBuildings || 0}
                            prefix={<BankOutlined style={{ color: '#1890ff' }} />}
                            suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.building', defaultMessage: '栋' })}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.statistics.totalUnits', defaultMessage: '房源' })}: {asset?.totalUnits || 0}
                            </Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.statistics.occupancyRate', defaultMessage: '综合出租率' })}
                            value={asset?.occupancyRate || 0}
                            prefix={<HomeOutlined style={{ color: (asset?.occupancyRate || 0) >= 80 ? '#52c41a' : (asset?.occupancyRate || 0) >= 50 ? '#faad14' : '#f5222d' }} />}
                            suffix="%"
                            valueStyle={{ color: (asset?.occupancyRate || 0) >= 80 ? '#52c41a' : (asset?.occupancyRate || 0) >= 50 ? '#faad14' : '#f5222d' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Progress percent={asset?.occupancyRate || 0} size="small" showInfo={false} strokeColor={(asset?.occupancyRate || 0) >= 80 ? '#52c41a' : (asset?.occupancyRate || 0) >= 50 ? '#faad14' : '#f5222d'} />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(asset?.occupancyRateYoY, true)}
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.statistics.activeTenants', defaultMessage: '在租租户' })}
                            value={tenant?.activeTenants || 0}
                            prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                            suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.tenant', defaultMessage: '家' })}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {intl.formatMessage({ id: 'pages.park.statistics.activeContracts', defaultMessage: '有效合同' })}: {tenant?.activeContracts || 0}
                            </Text>
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(tenant?.totalTenantsYoY, true)}
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.statistics.monthlyRent', defaultMessage: '月租金收入' })}
                            value={tenant?.totalMonthlyRent || 0}
                            prefix="¥"
                            valueStyle={{ color: '#1890ff' }}
                            precision={2}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Space wrap>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {intl.formatMessage({ id: 'pages.park.statistics.expiringContracts', defaultMessage: '即将到期' })}:
                                </Text>
                                <Tag color="warning">{tenant?.expiringContracts || 0}</Tag>
                            </Space>
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(tenant?.rentIncomeMoM, false)}
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        );
    };

    // 综合概览
    const renderOverview = () => {
        const { asset, investment, tenant, service } = statistics;

        return (
            <div>
                {renderOverviewCards()}

                <Row gutter={[24, 24]}>
                    {/* 招商数据 */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <Space>
                                    <FundProjectionScreenOutlined style={{ color: '#722ed1' }} />
                                    {intl.formatMessage({ id: 'pages.park.statistics.investmentOverview', defaultMessage: '招商概览' })}
                                </Space>
                            }
                            className={styles['chart-card']}
                        >
                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.totalLeads', defaultMessage: '线索总数' })}
                                        value={investment?.totalLeads || 0}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                    {renderTrend(investment?.totalLeadsYoY, true)}
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisMonth', defaultMessage: '本月新增' })}
                                        value={investment?.newLeadsThisMonth || 0}
                                        prefix={<ArrowUpOutlined />}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                    {renderTrend(investment?.newLeadsMoM, false)}
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.projectsInNegotiation', defaultMessage: '洽谈中项目' })}
                                        value={investment?.projectsInNegotiation || 0}
                                        valueStyle={{ color: '#faad14' }}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.conversionRate', defaultMessage: '转化率' })}
                                        value={((investment?.conversionRate || 0) * 100).toFixed(1)}
                                        suffix="%"
                                        valueStyle={{ color: (investment?.conversionRate || 0) >= 0.3 ? '#52c41a' : '#faad14' }}
                                    />
                                    {renderTrend(investment?.conversionRateYoY, true)}
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    {/* 服务统计 */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <Space>
                                    <CustomerServiceOutlined style={{ color: '#13c2c2' }} />
                                    {intl.formatMessage({ id: 'pages.park.statistics.serviceOverview', defaultMessage: '服务概览' })}
                                </Space>
                            }
                            className={styles['chart-card']}
                        >
                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.totalRequests', defaultMessage: '服务请求总数' })}
                                        value={service?.totalRequests || 0}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                    {renderTrend(service?.totalRequestsMoM, false)}
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.pendingRequests', defaultMessage: '待处理' })}
                                        value={service?.pendingRequests || 0}
                                        prefix={<ClockCircleOutlined />}
                                        valueStyle={{ color: '#faad14' }}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.completedRequests', defaultMessage: '已完成' })}
                                        value={service?.completedRequests || 0}
                                        prefix={<CheckCircleOutlined />}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.averageRating', defaultMessage: '平均评分' })}
                                        value={service?.averageRating || 0}
                                        precision={1}
                                        prefix={<StarOutlined style={{ color: '#faad14' }} />}
                                        suffix="/ 5"
                                    />
                                    {renderTrend(service?.averageRatingYoY, true)}
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    // 资产分析
    const renderAssetAnalysis = () => {
        const { asset } = statistics;
        if (!asset) return <Empty description={intl.formatMessage({ id: 'common.noData', defaultMessage: '暂无数据' })} />;

        const areaPercent = asset.totalRentableArea > 0
            ? ((asset.rentedArea / asset.totalRentableArea) * 100).toFixed(1)
            : 0;

        return (
            <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalBuildings', defaultMessage: '楼宇总数' })}
                                value={asset.totalBuildings}
                                suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.building', defaultMessage: '栋' })}
                                prefix={<BankOutlined style={{ color: '#1890ff' }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalArea', defaultMessage: '总建筑面积' })}
                                value={asset.totalArea}
                                suffix="㎡"
                                precision={0}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.rentableArea', defaultMessage: '可租面积' })}
                                value={asset.totalRentableArea}
                                suffix="㎡"
                                precision={0}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.occupancyRate', defaultMessage: '出租率' })}
                                value={asset.occupancyRate}
                                suffix="%"
                                precision={1}
                                valueStyle={{ color: asset.occupancyRate >= 80 ? '#52c41a' : asset.occupancyRate >= 50 ? '#faad14' : '#f5222d' }}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(asset.occupancyRateYoY)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.areaDistribution', defaultMessage: '面积分布' })} className={styles['chart-card']}>
                            <div style={{ textAlign: 'center', padding: 24 }}>
                                <Progress
                                    type="dashboard"
                                    percent={Number(areaPercent)}
                                    format={(percent) => (
                                        <div>
                                            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}%</div>
                                            <div style={{ fontSize: 12, color: '#999' }}>
                                                {intl.formatMessage({ id: 'pages.park.statistics.rentedArea', defaultMessage: '已出租' })}
                                            </div>
                                        </div>
                                    )}
                                    size={200}
                                    strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                />
                                <Row gutter={16} style={{ marginTop: 24 }}>
                                    <Col span={12}>
                                        <Statistic
                                            title={intl.formatMessage({ id: 'pages.park.statistics.rentedArea', defaultMessage: '已出租面积' })}
                                            value={asset.rentedArea}
                                            suffix="㎡"
                                            valueStyle={{ color: '#52c41a' }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title={intl.formatMessage({ id: 'pages.park.statistics.availableArea', defaultMessage: '可租面积' })}
                                            value={asset.totalRentableArea - asset.rentedArea}
                                            suffix="㎡"
                                            valueStyle={{ color: '#faad14' }}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.unitDistribution', defaultMessage: '房源分布' })} className={styles['chart-card']}>
                            <div style={{ textAlign: 'center', padding: 24 }}>
                                <Progress
                                    type="dashboard"
                                    percent={asset.totalUnits > 0 ? Number(((asset.rentedUnits / asset.totalUnits) * 100).toFixed(1)) : 0}
                                    format={(percent) => (
                                        <div>
                                            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}%</div>
                                            <div style={{ fontSize: 12, color: '#999' }}>
                                                {intl.formatMessage({ id: 'pages.park.statistics.rentedUnits', defaultMessage: '已出租' })}
                                            </div>
                                        </div>
                                    )}
                                    size={200}
                                    strokeColor={{ '0%': '#722ed1', '100%': '#eb2f96' }}
                                />
                                <Row gutter={16} style={{ marginTop: 24 }}>
                                    <Col span={12}>
                                        <Statistic
                                            title={intl.formatMessage({ id: 'pages.park.statistics.rentedUnits', defaultMessage: '已出租房源' })}
                                            value={asset.rentedUnits}
                                            suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.unit', defaultMessage: '套' })}
                                            valueStyle={{ color: '#52c41a' }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title={intl.formatMessage({ id: 'pages.park.statistics.availableUnits', defaultMessage: '空置房源' })}
                                            value={asset.availableUnits}
                                            suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.unit', defaultMessage: '套' })}
                                            valueStyle={{ color: '#faad14' }}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    // 招商分析
    const renderInvestmentAnalysis = () => {
        const { investment } = statistics;
        if (!investment) return <Empty description={intl.formatMessage({ id: 'common.noData', defaultMessage: '暂无数据' })} />;

        const leadsByStatusData = Object.entries(investment.leadsByStatus || {}).map(([status, count]) => ({
            key: status,
            status,
            count,
        }));

        const projectsByStageData = Object.entries(investment.projectsByStage || {}).map(([stage, count]) => ({
            key: stage,
            stage,
            count,
        }));

        return (
            <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalLeads', defaultMessage: '线索总数' })}
                                value={investment.totalLeads}
                                prefix={<UserSwitchOutlined style={{ color: '#1890ff' }} />}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(investment.totalLeadsYoY)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisMonth', defaultMessage: '本月新增' })}
                                value={investment.newLeadsThisMonth}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<ArrowUpOutlined />}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(investment.newLeadsMoM, false)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalProjects', defaultMessage: '项目总数' })}
                                value={investment.totalProjects}
                                prefix={<FundProjectionScreenOutlined style={{ color: '#722ed1' }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.conversionRate', defaultMessage: '转化率' })}
                                value={(investment.conversionRate * 100).toFixed(1)}
                                suffix="%"
                                valueStyle={{ color: investment.conversionRate >= 0.3 ? '#52c41a' : '#faad14' }}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(investment.conversionRateYoY)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.leadsByStatus', defaultMessage: '线索状态分布' })} className={styles['chart-card']}>
                            {leadsByStatusData.length > 0 ? (
                                <Table
                                    dataSource={leadsByStatusData}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.status', defaultMessage: '状态' }),
                                            dataIndex: 'status',
                                            render: (status) => <Tag>{status}</Tag>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '数量' }),
                                            dataIndex: 'count',
                                            render: (count) => <Text strong>{count}</Text>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                            render: (_, record) => {
                                                const percent = investment.totalLeads > 0
                                                    ? ((record.count / investment.totalLeads) * 100).toFixed(1)
                                                    : 0;
                                                return <Progress percent={Number(percent)} size="small" />;
                                            }
                                        }
                                    ]}
                                />
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.projectsByStage', defaultMessage: '项目阶段分布' })} className={styles['chart-card']}>
                            {projectsByStageData.length > 0 ? (
                                <Table
                                    dataSource={projectsByStageData}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.stage', defaultMessage: '阶段' }),
                                            dataIndex: 'stage',
                                            render: (stage) => <Tag color="purple">{stage}</Tag>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '数量' }),
                                            dataIndex: 'count',
                                            render: (count) => <Text strong>{count}</Text>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                            render: (_, record) => {
                                                const percent = investment.totalProjects > 0
                                                    ? ((record.count / investment.totalProjects) * 100).toFixed(1)
                                                    : 0;
                                                return <Progress percent={Number(percent)} size="small" strokeColor="#722ed1" />;
                                            }
                                        }
                                    ]}
                                />
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    // 租户分析
    const renderTenantAnalysis = () => {
        const { tenant } = statistics;
        if (!tenant) return <Empty description={intl.formatMessage({ id: 'common.noData', defaultMessage: '暂无数据' })} />;

        const industryData = Object.entries(tenant.tenantsByIndustry || {}).map(([industry, count]) => ({
            key: industry,
            industry,
            count,
        }));

        return (
            <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalTenants', defaultMessage: '租户总数' })}
                                value={tenant.totalTenants}
                                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(tenant.totalTenantsYoY)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.activeTenants', defaultMessage: '在租租户' })}
                                value={tenant.activeTenants}
                                valueStyle={{ color: '#52c41a' }}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(tenant.activeTenantsMoM, false)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.activeContracts', defaultMessage: '有效合同' })}
                                value={tenant.activeContracts}
                                prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.expiringContracts', defaultMessage: '即将到期' })}
                                value={tenant.expiringContracts}
                                valueStyle={{ color: tenant.expiringContracts > 0 ? '#faad14' : '#52c41a' }}
                                prefix={tenant.expiringContracts > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.industryDistribution', defaultMessage: '行业分布' })} className={styles['chart-card']}>
                            {industryData.length > 0 ? (
                                <Table
                                    dataSource={industryData}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.industry', defaultMessage: '行业' }),
                                            dataIndex: 'industry',
                                            render: (industry) => <Tag color="blue">{industry}</Tag>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.tenantCount', defaultMessage: '租户数' }),
                                            dataIndex: 'count',
                                            render: (count) => <Text strong>{count}</Text>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                            render: (_, record) => {
                                                const percent = tenant.totalTenants > 0
                                                    ? ((record.count / tenant.totalTenants) * 100).toFixed(1)
                                                    : 0;
                                                return <Progress percent={Number(percent)} size="small" />;
                                            }
                                        }
                                    ]}
                                />
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.rentIncome', defaultMessage: '租金收入' })} className={styles['chart-card']}>
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Statistic
                                    title={intl.formatMessage({ id: 'pages.park.statistics.monthlyRent', defaultMessage: '月租金收入' })}
                                    value={tenant.totalMonthlyRent}
                                    prefix="¥"
                                    precision={2}
                                    valueStyle={{ fontSize: 36, color: '#1890ff' }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <Space size={16}>
                                        {renderTrend(tenant.rentIncomeYoY, true)}
                                        {renderTrend(tenant.rentIncomeMoM, false)}
                                    </Space>
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <Text type="secondary">
                                        {intl.formatMessage({ id: 'pages.park.statistics.yearlyEstimate', defaultMessage: '预计年收入' })}:
                                        <Text strong style={{ marginLeft: 8, fontSize: 18 }}>
                                            ¥{(tenant.totalMonthlyRent * 12).toLocaleString()}
                                        </Text>
                                    </Text>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    // 服务分析
    const renderServiceAnalysis = () => {
        const { service } = statistics;
        if (!service) return <Empty description={intl.formatMessage({ id: 'common.noData', defaultMessage: '暂无数据' })} />;

        const statusData = Object.entries(service.requestsByStatus || {}).map(([status, count]) => ({
            key: status,
            status,
            count,
        }));

        const categoryData = Object.entries(service.requestsByCategory || {}).map(([category, count]) => ({
            key: category,
            category,
            count,
        }));

        return (
            <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalRequests', defaultMessage: '服务请求总数' })}
                                value={service.totalRequests}
                                prefix={<CustomerServiceOutlined style={{ color: '#1890ff' }} />}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(service.totalRequestsYoY)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.pendingRequests', defaultMessage: '待处理' })}
                                value={service.pendingRequests}
                                valueStyle={{ color: service.pendingRequests > 10 ? '#f5222d' : '#faad14' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.completedRequests', defaultMessage: '已完成' })}
                                value={service.completedRequests}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.averageRating', defaultMessage: '平均评分' })}
                                value={service.averageRating}
                                precision={1}
                                prefix={<StarOutlined style={{ color: '#faad14' }} />}
                                suffix="/ 5"
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(service.averageRatingYoY)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.requestsByStatus', defaultMessage: '请求状态分布' })} className={styles['chart-card']}>
                            {statusData.length > 0 ? (
                                <Table
                                    dataSource={statusData}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.status', defaultMessage: '状态' }),
                                            dataIndex: 'status',
                                            render: (status) => {
                                                const colorMap: Record<string, string> = {
                                                    'Pending': 'orange',
                                                    'Processing': 'blue',
                                                    'Completed': 'green',
                                                    'Cancelled': 'default',
                                                };
                                                return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
                                            }
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '数量' }),
                                            dataIndex: 'count',
                                            render: (count) => <Text strong>{count}</Text>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                            render: (_, record) => {
                                                const percent = service.totalRequests > 0
                                                    ? ((record.count / service.totalRequests) * 100).toFixed(1)
                                                    : 0;
                                                return <Progress percent={Number(percent)} size="small" />;
                                            }
                                        }
                                    ]}
                                />
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.requestsByCategory', defaultMessage: '请求分类统计' })} className={styles['chart-card']}>
                            {categoryData.length > 0 ? (
                                <Table
                                    dataSource={categoryData}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.category', defaultMessage: '分类' }),
                                            dataIndex: 'category',
                                            render: (category) => <Tag color="cyan">{category}</Tag>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '数量' }),
                                            dataIndex: 'count',
                                            render: (count) => <Text strong>{count}</Text>
                                        },
                                        {
                                            title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                            render: (_, record) => {
                                                const percent = service.totalRequests > 0
                                                    ? ((record.count / service.totalRequests) * 100).toFixed(1)
                                                    : 0;
                                                return <Progress percent={Number(percent)} size="small" strokeColor="#13c2c2" />;
                                            }
                                        }
                                    ]}
                                />
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    const tabItems = [
        {
            key: 'overview',
            label: intl.formatMessage({ id: 'pages.park.statistics.overview', defaultMessage: '综合概览' }),
            children: renderOverview(),
        },
        {
            key: 'asset',
            label: intl.formatMessage({ id: 'pages.park.statistics.assetAnalysis', defaultMessage: '资产分析' }),
            children: renderAssetAnalysis(),
        },
        {
            key: 'investment',
            label: intl.formatMessage({ id: 'pages.park.statistics.investmentAnalysis', defaultMessage: '招商分析' }),
            children: renderInvestmentAnalysis(),
        },
        {
            key: 'tenant',
            label: intl.formatMessage({ id: 'pages.park.statistics.tenantAnalysis', defaultMessage: '租户分析' }),
            children: renderTenantAnalysis(),
        },
        {
            key: 'service',
            label: intl.formatMessage({ id: 'pages.park.statistics.serviceAnalysis', defaultMessage: '服务分析' }),
            children: renderServiceAnalysis(),
        },
    ];

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.statistics.title', defaultMessage: '统计报表' })}
            extra={[
                <Space key="period-selection">
                    <Text strong>{intl.formatMessage({ id: 'pages.park.statistics.period', defaultMessage: '统计周期' })}:</Text>
                    <Radio.Group value={period} onChange={(e) => setPeriod(e.target.value)} buttonStyle="solid">
                        <Radio.Button value={StatisticsPeriod.Day}>{intl.formatMessage({ id: 'pages.park.statistics.day', defaultMessage: '日' })}</Radio.Button>
                        <Radio.Button value={StatisticsPeriod.Week}>{intl.formatMessage({ id: 'pages.park.statistics.week', defaultMessage: '周' })}</Radio.Button>
                        <Radio.Button value={StatisticsPeriod.Month}>{intl.formatMessage({ id: 'pages.park.statistics.month', defaultMessage: '月' })}</Radio.Button>
                        <Radio.Button value={StatisticsPeriod.Year}>{intl.formatMessage({ id: 'pages.park.statistics.year', defaultMessage: '年' })}</Radio.Button>
                    </Radio.Group>
                    <Button icon={<ReloadOutlined />} onClick={loadAllStatistics} type="primary" ghost>
                        {intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}
                    </Button>
                </Space>
            ]}
        >
            <div className={styles['statistics-page']}>
                <Spin spinning={loading}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        className={styles['stat-tabs']}
                        type="card"
                    />
                </Spin>
            </div>
        </PageContainer>
    );
};

export default StatisticsPage;
