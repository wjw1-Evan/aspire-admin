import React, { useCallback, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Tabs, Typography, Progress, Tag, Empty, Button, Space, Table, Radio, DatePicker, Modal } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { marked } from 'marked';
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
    RobotOutlined,
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import * as parkService from '@/services/park';
import { StatisticsPeriod } from '@/services/park';
import type { AssetStatistics, InvestmentStatistics, TenantStatistics, ServiceStatistics } from '@/services/park';
import styles from './index.less';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

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
    // Default to Custom period with current month selected
    const [period, setPeriod] = useState<StatisticsPeriod | string>(StatisticsPeriod.Custom);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
        dayjs().startOf('month'),
        dayjs().endOf('month')
    ]);
    const [statistics, setStatistics] = useState<AllStatistics>({
        asset: null,
        investment: null,
        tenant: null,
        service: null,
    });

    const [aiReportVisible, setAiReportVisible] = useState(false);
    const [aiReportLoading, setAiReportLoading] = useState(false);
    const [aiReportContent, setAiReportContent] = useState('');

    const handleGenerateAiReport = async () => {
        setAiReportLoading(true);
        setAiReportVisible(true);
        setAiReportContent(''); // Clear previous content

        try {
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (dateRange) {
                startDate = dateRange[0].startOf('day').toISOString();
                endDate = dateRange[1].endOf('day').toISOString();
            }

            const apiPeriod = typeof period === 'string' ? StatisticsPeriod.Custom : period;
            const res = await parkService.generateAiReport(apiPeriod, startDate, endDate, statistics);
            if (res.success && res.data) {
                try {
                    const html = await marked.parse(res.data);
                    setAiReportContent(html);
                } catch (parseError) {
                    console.error('Markdown parse error:', parseError);
                    setAiReportContent(res.data);
                }
            } else {
                setAiReportContent('生成报告失败，请稍后重试。');
            }
        } catch (error) {
            console.error('Failed to generate AI report:', error);
            setAiReportContent('生成报告失败，请稍后重试。');
        } finally {
            setAiReportLoading(false);
        }
    };

    // 加载所有统计数据
    const loadAllStatistics = useCallback(async () => {
        setLoading(true);
        try {
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (dateRange) {
                startDate = dateRange[0].startOf('day').toISOString();
                endDate = dateRange[1].endOf('day').toISOString();
            }

            // Determine the correct period enum to pass to the API
            const apiPeriod = typeof period === 'string' ? StatisticsPeriod.Custom : period;

            const [assetRes, investmentRes, tenantRes, serviceRes] = await Promise.all([
                parkService.getAssetStatistics(apiPeriod, startDate, endDate),
                parkService.getInvestmentStatistics(apiPeriod, startDate, endDate),
                parkService.getTenantStatistics(apiPeriod, startDate, endDate),
                parkService.getServiceStatistics(apiPeriod, startDate, endDate),
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
    }, [period, dateRange]);

    useEffect(() => {
        if (period !== StatisticsPeriod.Custom || (period === StatisticsPeriod.Custom && dateRange)) {
            loadAllStatistics();
        }
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
                <span>{Math.abs(value).toFixed(1)}%</span>
            </Space>
        );
    };

    // 综合概览卡片
    const renderOverviewCards = () => {
        const { asset, investment, tenant, service } = statistics;

        const calculatedOccupancyRate = asset && asset.totalRentableArea > 0
            ? (asset.rentedArea / asset.totalRentableArea) * 100
            : 0;

        const isYearly = period === StatisticsPeriod.Year || (period as any) === 'last_year';

        // Derived Metrics
        const collectionRate = (tenant && tenant.totalExpected && tenant.totalExpected > 0)
            ? ((tenant.totalReceived / tenant.totalExpected) * 100).toFixed(1)
            : 0;
        const vacantArea = asset ? asset.totalRentableArea - asset.rentedArea : 0;

        return (
            <>
                <Row gutter={[16, 16]} className={styles['stat-cards']}>
                    {/* 1. 营收表现 (Revenue) */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className={styles['stat-card']}>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalReceived', defaultMessage: '实收租金' })}
                                value={tenant?.totalReceived || 0}
                                prefix="¥"
                                precision={2}
                                styles={{ content: { color: '#cf1322' } }} // Money Red
                            />
                            <div style={{ marginTop: 8 }}>
                                <Space split={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {intl.formatMessage({ id: 'pages.park.statistics.totalExpected', defaultMessage: '应收租金' })}: ¥{(tenant?.totalExpected || 0).toLocaleString()}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12, color: Number(collectionRate) >= 90 ? '#52c41a' : '#faad14' }}>
                                        {intl.formatMessage({ id: 'pages.park.statistics.collectionRate', defaultMessage: '收缴率' })}: {collectionRate}%
                                    </Text>
                                </Space>
                                <div style={{ marginTop: 4 }}>
                                    {renderTrend(tenant?.rentIncomeMoM, false)}
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* 2. 资产运营 (Occupancy) */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className={styles['stat-card']}>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.occupancyRate', defaultMessage: '综合出租率' })}
                                value={calculatedOccupancyRate}
                                precision={1}
                                suffix="%"
                                styles={{ content: { color: calculatedOccupancyRate >= 80 ? '#52c41a' : calculatedOccupancyRate >= 50 ? '#faad14' : '#f5222d' } }}
                            />
                            <div style={{ marginTop: 8 }}>
                                <Space split={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
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
                                    strokeColor={calculatedOccupancyRate >= 80 ? '#52c41a' : calculatedOccupancyRate >= 50 ? '#faad14' : '#f5222d'}
                                    style={{ marginTop: 4 }}
                                />
                            </div>
                        </Card>
                    </Col>

                    {/* 3. 招商增长 (Growth) */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className={styles['stat-card']}>
                            <Statistic
                                title={isYearly
                                    ? intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisYear', defaultMessage: '本年新增线索' })
                                    : intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisMonth', defaultMessage: '本月新增线索' })
                                }
                                value={investment?.newLeadsThisMonth || 0}
                                prefix={<ArrowUpOutlined />}
                                styles={{ content: { color: '#1890ff' } }}
                            />
                            <div style={{ marginTop: 8 }}>
                                <Space split={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {intl.formatMessage({ id: 'pages.park.statistics.projectsInNegotiation', defaultMessage: '洽谈中' })}: {investment?.projectsInNegotiation || 0}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {intl.formatMessage({ id: 'pages.park.statistics.conversionRate', defaultMessage: '转化' })}: {Number(investment?.conversionRate || 0).toFixed(1)}%
                                    </Text>
                                </Space>
                                <div style={{ marginTop: 4 }}>
                                    {renderTrend(investment?.newLeadsMoM, false)}
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* 4. 租户风险 (Risk/Status) */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className={styles['stat-card']}>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.activeTenants', defaultMessage: '在租租户' })}
                                value={tenant?.activeTenants || 0}
                                suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.tenant', defaultMessage: '家' })}
                                styles={{ content: { color: '#722ed1' } }}
                            />
                            <div style={{ marginTop: 8 }}>
                                <Space split={<div style={{ width: 1, height: 10, background: '#f0f0f0' }} />}>
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
                                    {renderTrend(tenant?.totalTenantsYoY, true)}
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </>
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
                                        styles={{ content: { color: '#1890ff' } }}
                                    />
                                    {renderTrend(investment?.totalLeadsYoY, true)}
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={period === StatisticsPeriod.Year
                                            ? intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisYear', defaultMessage: '本年新增' })
                                            : intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisMonth', defaultMessage: '本月新增' })
                                        }
                                        value={investment?.newLeadsThisMonth || 0}
                                        prefix={<ArrowUpOutlined />}
                                        styles={{ content: { color: '#52c41a' } }}
                                    />
                                    {renderTrend(investment?.newLeadsMoM, false)}
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.projectsInNegotiation', defaultMessage: '洽谈中项目' })}
                                        value={investment?.projectsInNegotiation || 0}
                                        styles={{ content: { color: '#faad14' } }}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.conversionRate', defaultMessage: '转化率' })}
                                        value={Number(investment?.conversionRate || 0).toFixed(1)}
                                        suffix="%"
                                        styles={{ content: { color: (investment?.conversionRate || 0) >= 30 ? '#52c41a' : '#faad14' } }}
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
                                        styles={{ content: { color: '#1890ff' } }}
                                    />
                                    {renderTrend(service?.totalRequestsMoM, false)}
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.pendingRequests', defaultMessage: '待处理' })}
                                        value={service?.pendingRequests || 0}
                                        prefix={<ClockCircleOutlined />}
                                        styles={{ content: { color: '#faad14' } }}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.completedRequests', defaultMessage: '已完成' })}
                                        value={service?.completedRequests || 0}
                                        prefix={<CheckCircleOutlined />}
                                        styles={{ content: { color: '#52c41a' } }}
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
                                title={intl.formatMessage({ id: 'pages.park.statistics.assetScale', defaultMessage: '资产规模' })}
                                value={asset.totalBuildings}
                                suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.property', defaultMessage: '个' })}
                                prefix={<BankOutlined style={{ color: '#1890ff' }} />}
                            />
                            {renderTrend(asset.totalBuildingsMoM, false)}
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
                                value={Number(areaPercent)}
                                suffix="%"
                                precision={1}
                                styles={{ content: { color: Number(areaPercent) >= 80 ? '#52c41a' : Number(areaPercent) >= 50 ? '#faad14' : '#f5222d' } }}
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
                                            styles={{ content: { color: '#52c41a' } }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title={intl.formatMessage({ id: 'pages.park.statistics.availableArea', defaultMessage: '可租面积' })}
                                            value={asset.totalRentableArea - asset.rentedArea}
                                            suffix="㎡"
                                            styles={{ content: { color: '#faad14' } }}
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
                                            styles={{ content: { color: '#52c41a' } }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title={intl.formatMessage({ id: 'pages.park.statistics.availableUnits', defaultMessage: '空置房源' })}
                                            value={asset.availableUnits}
                                            suffix={intl.formatMessage({ id: 'pages.park.statistics.unit.unit', defaultMessage: '套' })}
                                            styles={{ content: { color: '#faad14' } }}
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
                                title={period === StatisticsPeriod.Year
                                    ? intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisYear', defaultMessage: '本年新增' })
                                    : intl.formatMessage({ id: 'pages.park.statistics.newLeadsThisMonth', defaultMessage: '本月新增' })
                                }
                                value={investment.newLeadsThisMonth}
                                styles={{ content: { color: '#52c41a' } }}
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
                                value={Number(investment.conversionRate).toFixed(1)}
                                suffix="%"
                                styles={{ content: { color: investment.conversionRate >= 30 ? '#52c41a' : '#faad14' } }}
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

        const paymentTypeData = Object.entries(tenant.receivedByPaymentType || {}).map(([type, amount]) => ({
            key: type,
            type: type === 'Rent' ? '房租' : type === 'PropertyFee' ? '物业费' : type === 'Deposit' ? '押金' : '其他',
            amount,
        }));

        return (
            <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={8}>
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
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.activeTenants', defaultMessage: '在租租户' })}
                                value={tenant.activeTenants}
                                styles={{ content: { color: '#52c41a' } }}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(tenant.activeTenantsMoM, false)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.activeContracts', defaultMessage: '有效合同' })}
                                value={tenant.activeContracts}
                                prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalReceived', defaultMessage: '实收租金' })}
                                value={tenant.totalReceived || 0}
                                prefix="¥"
                                precision={2}
                                styles={{ content: { color: '#cf1322' } }}
                            />
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {intl.formatMessage({ id: 'pages.park.statistics.totalExpected', defaultMessage: '应收租金' })}: ¥{(tenant.totalExpected || 0).toLocaleString()}
                                </Text>
                                <div style={{ marginTop: 4 }}>
                                    {renderTrend(tenant.rentIncomeMoM, false)}
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.yearlyEstimate', defaultMessage: '预计年收入' })}
                                value={tenant.yearlyEstimate || 0}
                                prefix="¥"
                                precision={2}
                                styles={{ content: { color: '#faad14' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.contract.totalAmount', defaultMessage: '合同总额' })}
                                value={tenant.totalContractAmount || 0}
                                prefix="¥"
                                precision={2}
                                styles={{ content: { color: '#13c2c2' } }}
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
                        <Card title="实收金额构成" className={styles['chart-card']}>
                            {paymentTypeData.length > 0 ? (
                                <Table
                                    dataSource={paymentTypeData}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        { title: '费用类型', dataIndex: 'type', render: (t) => <Tag color="cyan">{t}</Tag> },
                                        { title: '实收金额', dataIndex: 'amount', render: (a) => <Text strong>¥{a.toLocaleString()}</Text> },
                                        {
                                            title: '占比',
                                            render: (_, record) => {
                                                const percent = tenant.totalReceived > 0
                                                    ? ((record.amount / tenant.totalReceived) * 100).toFixed(1)
                                                    : 0;
                                                return <Progress percent={Number(percent)} size="small" strokeColor="#13c2c2" />;
                                            }
                                        }
                                    ]}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <Statistic title="实收总额" value={tenant.totalReceived} prefix="¥" precision={2} />
                                    <Empty description="暂无详细构成数据" />
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <Card title={intl.formatMessage({ id: 'pages.park.statistics.collectionStatus', defaultMessage: '收缴情况' })}>
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.totalExpected', defaultMessage: '应收总额' })}
                                        value={tenant.totalExpected}
                                        prefix="¥"
                                        precision={2}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.totalReceived', defaultMessage: '实收总额' })}
                                        value={tenant.totalReceived}
                                        prefix="¥"
                                        precision={2}
                                        styles={{ content: { color: '#52c41a' } }}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="即将到期合同"
                                        value={tenant.expiringContracts}
                                        styles={{ content: { color: tenant.expiringContracts > 0 ? '#faad14' : '#52c41a' } }}
                                        prefix={tenant.expiringContracts > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title={intl.formatMessage({ id: 'pages.park.statistics.collectionRate', defaultMessage: '收缴率' })}
                                        value={tenant.collectionRate}
                                        suffix="%"
                                        precision={1}
                                        styles={{ content: { color: tenant.collectionRate >= 90 ? '#52c41a' : '#faad14' } }}
                                    />
                                    <Progress
                                        percent={tenant.collectionRate}
                                        showInfo={false}
                                        status={tenant.collectionRate >= 90 ? 'success' : 'active'}
                                        strokeColor={tenant.collectionRate >= 90 ? '#52c41a' : '#faad14'}
                                    />
                                </Col>
                            </Row>
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
                    <Col xs={24} sm={12} lg={12}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.totalRequests', defaultMessage: '服务请求总数' })}
                                value={service.totalRequests}
                                prefix={<CustomerServiceOutlined style={{ color: '#1890ff' }} />}
                            />
                            <div style={{ marginTop: 4 }}>
                                {renderTrend(service.totalRequestsMoM, false)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={12}>
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

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.pendingRequests', defaultMessage: '待处理' })}
                                value={service.pendingRequests}
                                styles={{ content: { color: service.pendingRequests > 10 ? '#f5222d' : '#faad14' } }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.processingRequests', defaultMessage: '处理中' })}
                                value={service.processingRequests}
                                styles={{ content: { color: '#1890ff' } }}
                                prefix={<SyncOutlined spin />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title={intl.formatMessage({ id: 'pages.park.statistics.completedRequests', defaultMessage: '已完成' })}
                                value={service.completedRequests}
                                styles={{ content: { color: '#52c41a' } }}
                                prefix={<CheckCircleOutlined />}
                            />
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
                <Space key="period-selection" wrap>
                    <Radio.Group
                        value={period}
                        onChange={(e) => {
                            const val = e.target.value;
                            setPeriod(val);

                            let start: Dayjs = dayjs().startOf('month');
                            let end: Dayjs = dayjs().endOf('month');

                            if (val === StatisticsPeriod.Month) {
                                start = dayjs().startOf('month');
                                end = dayjs().endOf('month');
                            } else if (val === StatisticsPeriod.Year) {
                                start = dayjs().startOf('year');
                                end = dayjs().endOf('year');
                            } else if (val === 'last_year') {
                                start = dayjs().subtract(1, 'year').startOf('year');
                                end = dayjs().subtract(1, 'year').endOf('year');
                                setPeriod(StatisticsPeriod.Custom);
                            }

                            setDateRange([start, end]);
                        }}
                        optionType="button"
                        buttonStyle="solid"
                        size="middle"
                    >
                        <Radio.Button value={StatisticsPeriod.Month}>{intl.formatMessage({ id: 'pages.park.statistics.thisMonth', defaultMessage: '本月' })}</Radio.Button>
                        <Radio.Button value={StatisticsPeriod.Year}>{intl.formatMessage({ id: 'pages.park.statistics.thisYear', defaultMessage: '今年' })}</Radio.Button>
                        <Radio.Button value="last_year">{intl.formatMessage({ id: 'pages.park.statistics.lastYear', defaultMessage: '去年' })}</Radio.Button>
                        <Radio.Button value={StatisticsPeriod.Custom}>{intl.formatMessage({ id: 'pages.park.statistics.custom', defaultMessage: '自定义' })}</Radio.Button>
                    </Radio.Group>
                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                            if (dates && dates[0] && dates[1]) {
                                setDateRange([dates[0], dates[1]]);
                                setPeriod(StatisticsPeriod.Custom);
                            } else {
                                setDateRange(null);
                            }
                        }}
                    />
                    <Button icon={<RobotOutlined />} onClick={handleGenerateAiReport} type="primary" style={{ background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderColor: 'transparent' }}>
                        {intl.formatMessage({ id: 'pages.park.statistics.aiReport', defaultMessage: 'AI 分析报告' })}
                    </Button>
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

            <Modal
                title={
                    <Space>
                        <RobotOutlined style={{ color: '#722ed1' }} />
                        {intl.formatMessage({ id: 'pages.park.statistics.aiReportTitle', defaultMessage: 'AI 运营分析报告' })}
                    </Space>
                }
                open={aiReportVisible}
                onCancel={() => setAiReportVisible(false)}
                footer={null}
                width={900}
                styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px' } }}
            >
                <Spin spinning={aiReportLoading} tip={intl.formatMessage({ id: 'pages.park.statistics.generatingReport', defaultMessage: '正在生成报告，可能需要几十秒...' })}>
                    <div
                        className={styles['markdown-body']}
                        dangerouslySetInnerHTML={{ __html: aiReportContent }}
                        style={{ fontSize: 15, lineHeight: 1.8 }}
                    />
                </Spin>
            </Modal>
        </PageContainer>
    );
};

export default StatisticsPage;
