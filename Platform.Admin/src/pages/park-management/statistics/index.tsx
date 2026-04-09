import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Statistic, Spin, Tabs, Typography, Progress, Tag, Empty, Button, Space, Modal } from 'antd';
import { ProTable, ProCard } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { marked } from 'marked';
import { BankOutlined, TeamOutlined, FileTextOutlined, CustomerServiceOutlined, ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined, FundProjectionScreenOutlined, UserSwitchOutlined, StarOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, WarningOutlined, RobotOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import StatisticsPeriodSelector from '@/components/StatisticsPeriodSelector';
import { ApiResponse } from '@/types';

const { Text } = Typography;

interface AssetStatistics { totalBuildings: number; totalArea: number; totalUnits: number; availableUnits: number; rentedUnits: number; occupancyRate: number; totalRentableArea: number; rentedArea: number; occupancyRateYoY?: number; occupancyRateMoM?: number; totalBuildingsYoY?: number; totalBuildingsMoM?: number; }
interface InvestmentStatistics { totalLeads: number; newLeadsThisMonth: number; totalProjects: number; projectsInNegotiation: number; signedProjects: number; conversionRate: number; leadsByStatus: Record<string, number>; projectsByStage: Record<string, number>; totalLeadsYoY?: number; newLeadsMoM?: number; conversionRateYoY?: number; }
interface TenantStatistics { totalTenants: number; activeTenants: number; totalContracts: number; activeContracts: number; expiringContracts: number; totalMonthlyRent: number; tenantsByIndustry: Record<string, number>; totalReceived: number; totalExpected: number; collectionRate: number; receivedByPaymentType: Record<string, number>; totalContractAmount: number; totalTenantsYoY?: number; activeTenantsMoM?: number; rentIncomeYoY?: number; rentIncomeMoM?: number; monthlyRentYoY?: number; monthlyRentMoM?: number; activeTenantsYoY?: number; yearlyEstimate?: number; rentIncome?: number; }
interface ServiceStatistics { totalCategories: number; activeCategories: number; totalRequests: number; pendingRequests: number; processingRequests: number; completedRequests: number; averageRating: number; requestsByCategory: Record<string, number>; requestsByStatus: Record<string, number>; totalRequestsYoY?: number; totalRequestsMoM?: number; averageRatingYoY?: number; }

const api = {
    assetStatistics: (startDate?: string, endDate?: string) => request<ApiResponse<AssetStatistics>>('/apiservice/api/park/asset/statistics', { method: 'GET', params: { startDate, endDate } }),
    investmentStatistics: (startDate?: string, endDate?: string) => request<ApiResponse<InvestmentStatistics>>('/apiservice/api/park/investment/statistics', { method: 'GET', params: { startDate, endDate } }),
    tenantStatistics: (startDate?: string, endDate?: string) => request<ApiResponse<TenantStatistics>>('/apiservice/api/park/tenant/statistics', { method: 'GET', params: { startDate, endDate } }),
    serviceStatistics: (startDate?: string, endDate?: string) => request<ApiResponse<ServiceStatistics>>('/apiservice/api/park/services/statistics', { method: 'GET', params: { startDate, endDate } }),
    generateAiReport: (startDate?: string, endDate?: string, data?: any) => request<ApiResponse<string>>('/apiservice/api/park/statistics/ai-report', { method: 'POST', params: { startDate, endDate }, data }),
};

const StatisticsPage: React.FC = () => {
    const intl = useIntl();
    const [state, setState] = useState({
        loading: false, activeTab: 'overview', period: 'month',
        dateRange: [dayjs().startOf('month'), dayjs().endOf('month').startOf('day')] as [Dayjs, Dayjs] | null,
        statistics: { asset: null as AssetStatistics | null, investment: null as InvestmentStatistics | null, tenant: null as TenantStatistics | null, service: null as ServiceStatistics | null },
        aiReportVisible: false, aiReportLoading: false, aiReportContent: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const loadAllStatistics = async () => {
        set({ loading: true });
        try {
            let startDate: string | undefined, endDate: string | undefined;
            if (state.dateRange) { startDate = state.dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss'); endDate = state.dateRange[1].add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss'); }
            const [assetRes, investmentRes, tenantRes, serviceRes] = await Promise.all([api.assetStatistics(startDate, endDate), api.investmentStatistics(startDate, endDate), api.tenantStatistics(startDate, endDate), api.serviceStatistics(startDate, endDate)]);
            set({ statistics: { asset: assetRes.success ? assetRes.data ?? null : null, investment: investmentRes.success ? investmentRes.data ?? null : null, tenant: tenantRes.success ? tenantRes.data ?? null : null, service: serviceRes.success ? serviceRes.data ?? null : null } });
        } catch (error) { console.error('Failed to load statistics:', error); }
        finally { set({ loading: false }); }
    };

    useEffect(() => { if (state.period !== 'custom' || (state.period === 'custom' && state.dateRange)) loadAllStatistics(); }, [state.period, state.dateRange]);

    const handleGenerateAiReport = async () => {
        set({ aiReportLoading: true, aiReportVisible: true, aiReportContent: '' });
        try {
            let startDate: string | undefined, endDate: string | undefined;
            if (state.dateRange) { startDate = state.dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss'); endDate = state.dateRange[1].add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss'); }
            const res = await api.generateAiReport(startDate, endDate, state.statistics);
            if (res.success && res.data) { try { const html = await marked.parse(res.data); set({ aiReportContent: html }); } catch { set({ aiReportContent: res.data }); } } else set({ aiReportContent: '生成报告失败，请稍后重试。' });
        } catch { set({ aiReportContent: '生成报告失败，请稍后重试。' }); }
        finally { set({ aiReportLoading: false }); }
    };

    const renderTrend = (value?: number, isYoY = true) => {
        if (value === undefined || value === null) return null;
        const isUp = value >= 0; const color = isUp ? '#52c41a' : '#f5222d';
        const label = isYoY ? intl.formatMessage({ id: 'pages.park.statistics.yoy', defaultMessage: '同比' }) : intl.formatMessage({ id: 'pages.park.statistics.mom', defaultMessage: '环比' });
        return <Space size={4} style={{ fontSize: 12, color }}><span>{label}</span>{isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}<span>{Math.abs(value).toFixed(1)}%</span></Space>;
    };

    const renderOverview = () => {
        const { asset, investment, tenant, service } = state.statistics;
        const calculatedOccupancyRate = asset && asset.totalRentableArea > 0 ? (asset.rentedArea / asset.totalRentableArea) * 100 : 0;
        const collectionRate = tenant && tenant.totalExpected && tenant.totalExpected > 0 ? ((tenant.totalReceived / tenant.totalExpected) * 100).toFixed(1) : 0;
        const vacantArea = asset ? asset.totalRentableArea - asset.rentedArea : 0;
        const getOccupancyColor = (rate: number) => rate >= 80 ? '#52c41a' : rate >= 50 ? '#faad14' : '#f5222d';
        const isYearly = state.period === 'year' || state.period === 'last_year';

        const renderStatCard = (
            icon: React.ReactNode,
            title: string,
            value: number | string,
            color: string,
            subInfo?: React.ReactNode,
            prefix?: string,
            suffix?: string
        ) => (
            <ProCard style={{ height: 140, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{title}</div>
                        <div style={{ fontSize: 22, fontWeight: 500, color }}>{prefix}{value}{suffix}</div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${color}10, ${color}20)`, padding: 8, borderRadius: 6 }}>
                        <span style={{ fontSize: 16, color }}>{icon}</span>
                    </div>
                </div>
                {subInfo && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{subInfo}</div>}
            </ProCard>
        );

        return (<div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <ProCard style={{ height: 140, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>实收租金</div>
                                <div style={{ fontSize: 22, fontWeight: 500, color: '#cf1322' }}>¥{(tenant?.totalReceived || 0).toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #fff1f0, #fff7e6)', padding: 8, borderRadius: 6 }}>
                                <span style={{ fontSize: 16, color: '#cf1322' }}>¥</span>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                            应收: ¥{(tenant?.totalExpected || 0).toLocaleString()} | 收缴率: <span style={{ color: Number(collectionRate) >= 90 ? '#52c41a' : '#faad14' }}>{collectionRate}%</span>
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <ProCard style={{ height: 140, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>综合出租率</div>
                                <div style={{ fontSize: 22, fontWeight: 500, color: getOccupancyColor(calculatedOccupancyRate) }}>{calculatedOccupancyRate.toFixed(1)}%</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #f6ffed, #f9f6f2)', padding: 8, borderRadius: 6 }}>
                                <span style={{ fontSize: 16, color: getOccupancyColor(calculatedOccupancyRate) }}>%</span>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                            已出租: {(asset?.rentedArea || 0).toLocaleString()}㎡ | 空置: {vacantArea.toLocaleString()}㎡
                        </div>
                        <Progress percent={calculatedOccupancyRate} size="small" showInfo={false} strokeColor={getOccupancyColor(calculatedOccupancyRate)} style={{ marginTop: 4 }} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <ProCard style={{ height: 140, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{isYearly ? '本年新增线索' : '本月新增线索'}</div>
                                <div style={{ fontSize: 22, fontWeight: 500, color: '#1890ff' }}>{investment?.newLeadsThisMonth || 0}</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}>
                                <ArrowUpOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                            洽谈中: {investment?.projectsInNegotiation || 0} | 转化: {Number(investment?.conversionRate || 0).toFixed(1)}%
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <ProCard style={{ height: 140, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>在租租户</div>
                                <div style={{ fontSize: 22, fontWeight: 500, color: '#722ed1' }}>{tenant?.activeTenants || 0} 家</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, #f9f0ff, #efdbff)', padding: 8, borderRadius: 6 }}>
                                <TeamOutlined style={{ fontSize: 16, color: '#722ed1' }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                            到期: <span style={{ color: '#faad14' }}>{tenant?.expiringContracts || 0}</span> | 工单: <span style={{ color: (service?.pendingRequests || 0) > 0 ? '#faad14' : 'inherit' }}>{service?.pendingRequests || 0}</span> | 评分: <span style={{ color: '#faad14' }}>{service?.averageRating || 5.0}★</span>
                        </div>
                    </ProCard>
                </Col>
            </Row>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}><ProCard title={<Space><FundProjectionScreenOutlined style={{ color: '#722ed1' }} />招商概览</Space>} style={{ marginBottom: 24, borderRadius: 8 }}>
                    <Row gutter={[16, 16]}><Col span={12}><Statistic title="线索总数" value={investment?.totalLeads || 0} styles={{ content: { color: '#1890ff' } }} /></Col><Col span={12}><Statistic title={state.period === 'year' ? '本年新增' : '本月新增'} value={investment?.newLeadsThisMonth || 0} prefix={<ArrowUpOutlined />} styles={{ content: { color: '#52c41a' } }} /></Col><Col span={12}><Statistic title="洽谈中项目" value={investment?.projectsInNegotiation || 0} styles={{ content: { color: '#faad14' } }} /></Col><Col span={12}><Statistic title="转化率" value={Number(investment?.conversionRate || 0).toFixed(1)} suffix="%" styles={{ content: { color: (investment?.conversionRate || 0) >= 30 ? '#52c41a' : '#faad14' } }} /></Col></Row>
                </ProCard></Col>
                <Col xs={24} lg={12}><ProCard title={<Space><CustomerServiceOutlined style={{ color: '#13c2c2' }} />服务概览</Space>} style={{ marginBottom: 24, borderRadius: 8 }}>
                    <Row gutter={[16, 16]}><Col span={12}><Statistic title="服务请求总数" value={service?.totalRequests || 0} styles={{ content: { color: '#1890ff' } }} /></Col><Col span={12}><Statistic title="待处理" value={service?.pendingRequests || 0} prefix={<ClockCircleOutlined />} styles={{ content: { color: '#faad14' } }} /></Col><Col span={12}><Statistic title="已完成" value={service?.completedRequests || 0} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} /></Col><Col span={12}><Statistic title="平均评分" value={service?.averageRating || 0} precision={1} prefix={<StarOutlined style={{ color: '#faad14' }} />} suffix="/ 5" /></Col></Row>
                </ProCard></Col>
            </Row>
        </div>);
    };

    const renderAssetAnalysis = () => {
        const { asset } = state.statistics;
        if (!asset) return <Empty description="暂无数据" />;
        const areaPercent = asset.totalRentableArea > 0 ? ((asset.rentedArea / asset.totalRentableArea) * 100).toFixed(1) : 0;
        return (<div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>资产规模</div><div style={{ fontSize: 22, fontWeight: 500, color: '#1890ff' }}>{asset.totalBuildings} 个</div></div><div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}><BankOutlined style={{ fontSize: 16, color: '#1890ff' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>总建筑面积</div><div style={{ fontSize: 22, fontWeight: 500, color: '#595959' }}>{asset.totalArea.toLocaleString()} ㎡</div></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>可租面积</div><div style={{ fontSize: 22, fontWeight: 500, color: '#faad14' }}>{asset.totalRentableArea.toLocaleString()} ㎡</div></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>出租率</div><div style={{ fontSize: 22, fontWeight: 500, color: Number(areaPercent) >= 80 ? '#52c41a' : Number(areaPercent) >= 50 ? '#faad14' : '#f5222d' }}>{areaPercent}%</div></div><div style={{ background: 'linear-gradient(135deg, #f6ffed, #fffbe6)', padding: 8, borderRadius: 6 }}><span style={{ fontSize: 16, color: Number(areaPercent) >= 80 ? '#52c41a' : '#faad14' }}>%</span></div></div><Progress percent={Number(areaPercent)} showInfo={false} size="small" strokeColor={Number(areaPercent) >= 80 ? '#52c41a' : Number(areaPercent) >= 50 ? '#faad14' : '#f5222d'} /></ProCard></Col>
            </Row>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}><ProCard title="面积分布"><div style={{ textAlign: 'center', padding: 24 }}><Progress type="dashboard" percent={Number(areaPercent)} format={(percent) => (<div><div style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}%</div><div style={{ fontSize: 12, color: '#999' }}>已出租</div></div>)} size={180} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} /><Row gutter={16} style={{ marginTop: 24 }}><Col span={12}><Statistic title="已出租面积" value={asset.rentedArea} suffix="㎡" styles={{ content: { color: '#52c41a' } }} /></Col><Col span={12}><Statistic title="可租面积" value={asset.totalRentableArea - asset.rentedArea} suffix="㎡" styles={{ content: { color: '#faad14' } }} /></Col></Row></div></ProCard></Col>
                <Col xs={24} lg={12}><ProCard title="房源分布"><div style={{ textAlign: 'center', padding: 24 }}><Progress type="dashboard" percent={asset.totalUnits > 0 ? Number(((asset.rentedUnits / asset.totalUnits) * 100).toFixed(1)) : 0} format={(percent) => (<div><div style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}%</div><div style={{ fontSize: 12, color: '#999' }}>已出租</div></div>)} size={180} strokeColor={{ '0%': '#722ed1', '100%': '#eb2f96' }} /><Row gutter={16} style={{ marginTop: 24 }}><Col span={12}><Statistic title="已出租房源" value={asset.rentedUnits} suffix="套" styles={{ content: { color: '#52c41a' } }} /></Col><Col span={12}><Statistic title="空置房源" value={asset.availableUnits} suffix="套" styles={{ content: { color: '#faad14' } }} /></Col></Row></div></ProCard></Col>
            </Row>
        </div>);
    };

    const renderInvestmentAnalysis = () => {
        const { investment } = state.statistics;
        if (!investment) return <Empty description="暂无数据" />;
        const leadsByStatusData = Object.entries(investment.leadsByStatus || {}).map(([status, count]) => ({ key: status, status, count }));
        const projectsByStageData = Object.entries(investment.projectsByStage || {}).map(([stage, count]) => ({ key: stage, stage, count }));
        return (<div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>线索总数</div><div style={{ fontSize: 22, fontWeight: 500, color: '#1890ff' }}>{investment.totalLeads}</div></div><div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}><UserSwitchOutlined style={{ fontSize: 16, color: '#1890ff' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{state.period === 'year' ? '本年新增' : '本月新增'}</div><div style={{ fontSize: 22, fontWeight: 500, color: '#52c41a' }}>{investment.newLeadsThisMonth}</div></div><div style={{ background: 'linear-gradient(135deg, #f6ffed, #f9f6f2)', padding: 8, borderRadius: 6 }}><ArrowUpOutlined style={{ fontSize: 16, color: '#52c41a' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>项目总数</div><div style={{ fontSize: 22, fontWeight: 500, color: '#722ed1' }}>{investment.totalProjects}</div></div><div style={{ background: 'linear-gradient(135deg, #f9f0ff, #efdbff)', padding: 8, borderRadius: 6 }}><FundProjectionScreenOutlined style={{ fontSize: 16, color: '#722ed1' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={6}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>转化率</div><div style={{ fontSize: 22, fontWeight: 500, color: investment.conversionRate >= 30 ? '#52c41a' : '#faad14' }}>{Number(investment.conversionRate).toFixed(1)}%</div></div><div style={{ background: 'linear-gradient(135deg, #fffbe6, #fff7e6)', padding: 8, borderRadius: 6 }}><span style={{ fontSize: 16, color: investment.conversionRate >= 30 ? '#52c41a' : '#faad14' }}>%</span></div></div></ProCard></Col>
            </Row>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}><ProCard title="线索状态分布">{leadsByStatusData.length > 0 ? (<ProTable dataSource={leadsByStatusData} pagination={false} size="small" search={false} options={false} toolBarRender={false} columns={[{ title: '状态', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> }, { title: '数量', dataIndex: 'count', render: (count) => <Text strong>{count}</Text> }, { title: '占比', render: (_: any, record) => { const percent = investment.totalLeads > 0 ? ((record.count / investment.totalLeads) * 100).toFixed(1) : 0; return <Progress percent={Number(percent)} size="small" />; } }]} />) : <Empty />}</ProCard></Col>
                <Col xs={24} lg={12}><ProCard title="项目阶段分布">{projectsByStageData.length > 0 ? (<ProTable dataSource={projectsByStageData} pagination={false} size="small" search={false} options={false} toolBarRender={false} columns={[{ title: '阶段', dataIndex: 'stage', render: (stage) => <Tag color="purple">{stage}</Tag> }, { title: '数量', dataIndex: 'count', render: (count) => <Text strong>{count}</Text> }, { title: '占比', render: (_: any, record) => { const percent = investment.totalProjects > 0 ? ((record.count / investment.totalProjects) * 100).toFixed(1) : 0; return <Progress percent={Number(percent)} size="small" strokeColor="#722ed1" />; } }]} />) : <Empty />}</ProCard></Col>
            </Row>
        </div>);
    };

    const renderTenantAnalysis = () => {
        const { tenant } = state.statistics;
        if (!tenant) return <Empty description="暂无数据" />;
        const industryData = Object.entries(tenant.tenantsByIndustry || {}).map(([industry, count]) => ({ key: industry, industry, count }));
        const paymentTypeData = Object.entries(tenant.receivedByPaymentType || {}).map(([type, amount]) => ({ key: type, type: type === 'Rent' ? '房租' : type === 'PropertyFee' ? '物业费' : type === 'Deposit' ? '押金' : '其他', amount }));
        return (<div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>租户总数</div><div style={{ fontSize: 22, fontWeight: 500, color: '#1890ff' }}>{tenant.totalTenants}</div></div><div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}><TeamOutlined style={{ fontSize: 16, color: '#1890ff' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>在租租户</div><div style={{ fontSize: 22, fontWeight: 500, color: '#52c41a' }}>{tenant.activeTenants}</div></div><div style={{ background: 'linear-gradient(135deg, #f6ffed, #f9f6f2)', padding: 8, borderRadius: 6 }}><CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>有效合同</div><div style={{ fontSize: 22, fontWeight: 500, color: '#722ed1' }}>{tenant.activeContracts}</div></div><div style={{ background: 'linear-gradient(135deg, #f9f0ff, #efdbff)', padding: 8, borderRadius: 6 }}><FileTextOutlined style={{ fontSize: 16, color: '#722ed1' }} /></div></div></ProCard></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>实收租金</div><div style={{ fontSize: 22, fontWeight: 500, color: '#cf1322' }}>¥{(tenant.totalReceived || 0).toLocaleString()}</div></div><div style={{ background: 'linear-gradient(135deg, #fff1f0, #fff7e6)', padding: 8, borderRadius: 6 }}><span style={{ fontSize: 16, color: '#cf1322' }}>¥</span></div></div><div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>应收: ¥{(tenant.totalExpected || 0).toLocaleString()}</div></ProCard></Col>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>预计年收入</div><div style={{ fontSize: 22, fontWeight: 500, color: '#faad14' }}>¥{(tenant.yearlyEstimate || 0).toLocaleString()}</div></div><div style={{ background: 'linear-gradient(135deg, #fffbe6, #fff7e6)', padding: 8, borderRadius: 6 }}><span style={{ fontSize: 16, color: '#faad14' }}>¥</span></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>合同总额</div><div style={{ fontSize: 22, fontWeight: 500, color: '#13c2c2' }}>¥{(tenant.totalContractAmount || 0).toLocaleString()}</div></div><div style={{ background: 'linear-gradient(135deg, #e6fffa, #f0f5ff)', padding: 8, borderRadius: 6 }}><span style={{ fontSize: 16, color: '#13c2c2' }}>¥</span></div></div></ProCard></Col>
            </Row>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}><ProCard title="行业分布">{industryData.length > 0 ? (<ProTable dataSource={industryData} pagination={false} size="small" search={false} options={false} toolBarRender={false} columns={[{ title: '行业', dataIndex: 'industry', render: (industry) => <Tag color="blue">{industry}</Tag> }, { title: '租户数', dataIndex: 'count', render: (count) => <Text strong>{count}</Text> }, { title: '占比', render: (_: any, record) => { const percent = tenant.totalTenants > 0 ? ((record.count / tenant.totalTenants) * 100).toFixed(1) : 0; return <Progress percent={Number(percent)} size="small" />; } }]} />) : <Empty />}</ProCard></Col>
                <Col xs={24} lg={12}><ProCard title="实收金额构成">{paymentTypeData.length > 0 ? (<ProTable dataSource={paymentTypeData} pagination={false} size="small" search={false} options={false} toolBarRender={false} columns={[{ title: '费用类型', dataIndex: 'type', render: (t) => <Tag color="cyan">{t}</Tag> }, { title: '实收金额', dataIndex: 'amount', render: (a) => a !== null && a !== undefined ? <Text strong>¥{a.toLocaleString()}</Text> : <Text strong>-</Text> }, { title: '占比', render: (_: any, record) => { const percent = tenant.totalReceived > 0 ? ((record.amount / tenant.totalReceived) * 100).toFixed(1) : 0; return <Progress percent={Number(percent)} size="small" strokeColor="#13c2c2" />; } }]} />) : (<div style={{ textAlign: 'center', padding: '40px 0' }}><Statistic title="实收总额" value={tenant.totalReceived} prefix="¥" precision={2} /><Empty description="暂无详细构成数据" /></div>)}</ProCard></Col>
            </Row>
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}><Col span={24}><ProCard title="收缴情况"><Row gutter={16}><Col span={6}><Statistic title="应收总额" value={tenant.totalExpected} prefix="¥" precision={2} /></Col><Col span={6}><Statistic title="实收总额" value={tenant.totalReceived} prefix="¥" precision={2} styles={{ content: { color: '#52c41a' } }} /></Col><Col span={6}><Statistic title="即将到期合同" value={tenant.expiringContracts} styles={{ content: { color: tenant.expiringContracts > 0 ? '#faad14' : '#52c41a' } }} prefix={tenant.expiringContracts > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} /></Col><Col span={6}><Statistic title="收缴率" value={tenant.collectionRate} suffix="%" precision={1} styles={{ content: { color: tenant.collectionRate >= 90 ? '#52c41a' : '#faad14' } }} /><Progress percent={tenant.collectionRate} showInfo={false} status={tenant.collectionRate >= 90 ? 'success' : 'active'} strokeColor={tenant.collectionRate >= 90 ? '#52c41a' : '#faad14'} /></Col></Row></ProCard></Col></Row>
        </div>);
    };

    const renderServiceAnalysis = () => {
        const { service } = state.statistics;
        if (!service) return <Empty description="暂无数据" />;
        const statusData = Object.entries(service.requestsByStatus || {}).map(([status, count]) => ({ key: status, status, count }));
        const categoryData = Object.entries(service.requestsByCategory || {}).map(([category, count]) => ({ key: category, category, count }));
        return (<div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={12}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>服务请求总数</div><div style={{ fontSize: 22, fontWeight: 500, color: '#1890ff' }}>{service.totalRequests}</div></div><div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}><CustomerServiceOutlined style={{ fontSize: 16, color: '#1890ff' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={12}><ProCard style={{ height: 140, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>平均评分</div><div style={{ fontSize: 22, fontWeight: 500, color: '#faad14' }}>{service.averageRating} / 5</div></div><div style={{ background: 'linear-gradient(135deg, #fffbe6, #fff7e6)', padding: 8, borderRadius: 6 }}><StarOutlined style={{ fontSize: 16, color: '#faad14' }} /></div></div></ProCard></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 100, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>待处理</div><div style={{ fontSize: 22, fontWeight: 500, color: service.pendingRequests > 10 ? '#f5222d' : '#faad14' }}>{service.pendingRequests}</div></div><div style={{ background: 'linear-gradient(135deg, #fffbe6, #fff7e6)', padding: 8, borderRadius: 6 }}><ClockCircleOutlined style={{ fontSize: 16, color: service.pendingRequests > 10 ? '#f5222d' : '#faad14' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 100, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>处理中</div><div style={{ fontSize: 22, fontWeight: 500, color: '#1890ff' }}>{service.processingRequests}</div></div><div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}><SyncOutlined spin style={{ fontSize: 16, color: '#1890ff' }} /></div></div></ProCard></Col>
                <Col xs={24} sm={12} lg={8}><ProCard style={{ height: 100, padding: '12px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><div><div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>已完成</div><div style={{ fontSize: 22, fontWeight: 500, color: '#52c41a' }}>{service.completedRequests}</div></div><div style={{ background: 'linear-gradient(135deg, #f6ffed, #f9f6f2)', padding: 8, borderRadius: 6 }}><CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} /></div></div></ProCard></Col>
            </Row>
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}><ProCard title="请求状态分布">{statusData.length > 0 ? (<ProTable dataSource={statusData} pagination={false} size="small" search={false} options={false} toolBarRender={false} columns={[{ title: '状态', dataIndex: 'status', render: (status: any) => { const colorMap: Record<string, string> = { Pending: 'orange', Processing: 'blue', Completed: 'green', Cancelled: 'default' }; return <Tag color={colorMap[status] || 'default'}>{status}</Tag>; } }, { title: '数量', dataIndex: 'count', render: (count) => <Text strong>{count}</Text> }, { title: '占比', render: (_: any, record: any) => { const percent = service.totalRequests > 0 ? ((record.count / service.totalRequests) * 100).toFixed(1) : 0; return <Progress percent={Number(percent)} size="small" />; } }]} />) : <Empty />}</ProCard></Col>
                <Col xs={24} lg={12}><ProCard title="请求分类统计">{categoryData.length > 0 ? (<ProTable dataSource={categoryData} pagination={false} size="small" search={false} options={false} toolBarRender={false} columns={[{ title: '分类', dataIndex: 'category', render: (category) => <Tag color="cyan">{category}</Tag> }, { title: '数量', dataIndex: 'count', render: (count) => <Text strong>{count}</Text> }, { title: '占比', render: (_: any, record: any) => { const percent = service.totalRequests > 0 ? ((record.count / service.totalRequests) * 100).toFixed(1) : 0; return <Progress percent={Number(percent)} size="small" strokeColor="#13c2c2" />; } }]} />) : <Empty />}</ProCard></Col>
            </Row>
        </div>);
    };

    const tabItems = [
        { key: 'overview', label: intl.formatMessage({ id: 'pages.park.statistics.overview', defaultMessage: '综合概览' }), children: renderOverview() },
        { key: 'asset', label: intl.formatMessage({ id: 'pages.park.statistics.assetAnalysis', defaultMessage: '资产分析' }), children: renderAssetAnalysis() },
        { key: 'investment', label: intl.formatMessage({ id: 'pages.park.statistics.investmentAnalysis', defaultMessage: '招商分析' }), children: renderInvestmentAnalysis() },
        { key: 'tenant', label: intl.formatMessage({ id: 'pages.park.statistics.tenantAnalysis', defaultMessage: '租户分析' }), children: renderTenantAnalysis() },
        { key: 'service', label: intl.formatMessage({ id: 'pages.park.statistics.serviceAnalysis', defaultMessage: '服务分析' }), children: renderServiceAnalysis() },
    ];

    return (
        <PageContainer>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Space wrap>
                    <StatisticsPeriodSelector value={state.period} dateRange={state.dateRange} onChange={(newDateRange, newPeriod) => { set({ dateRange: newDateRange, period: newPeriod || state.period }); }} />
                    <Button icon={<RobotOutlined />} onClick={handleGenerateAiReport} type="primary" style={{ background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderColor: 'transparent' }}>{intl.formatMessage({ id: 'pages.park.statistics.aiReport', defaultMessage: 'AI 分析报告' })}</Button>
                    <Button icon={<ReloadOutlined />} onClick={loadAllStatistics} type="primary" ghost>{intl.formatMessage({ id: 'common.refresh', defaultMessage: '刷新' })}</Button>
                </Space>
            </div>
            <Spin spinning={state.loading}>
                <Tabs activeKey={state.activeTab} onChange={(key) => set({ activeTab: key })} items={tabItems} type="card" />
            </Spin>
            <Modal title={<Space orientation="vertical" size={4} style={{ width: '100%' }}><Space><RobotOutlined style={{ color: '#722ed1' }} />{intl.formatMessage({ id: 'pages.park.statistics.aiReportTitle', defaultMessage: 'AI 运营分析报告' })}</Space><div style={{ fontSize: 12, fontWeight: 'normal', color: 'rgba(0, 0, 0, 0.45)', marginLeft: 24 }}>{intl.formatMessage({ id: 'pages.park.statistics.reportPeriod', defaultMessage: '报告周期' })}: <Tag color="blue" style={{ marginRight: 8 }}>{state.period === 'month' ? '本月' : state.period === 'year' ? '本年' : state.period === 'custom' ? '自定义' : state.period}</Tag>{state.dateRange ? `${state.dateRange[0].format('YYYY-MM-DD')} ~ ${state.dateRange[1].format('YYYY-MM-DD')}` : '-'}</div></Space>}
                open={state.aiReportVisible} onCancel={() => set({ aiReportVisible: false })} footer={null} width={900}
                styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px' } }}>
                <Spin spinning={state.aiReportLoading} tip={intl.formatMessage({ id: 'pages.park.statistics.generatingReport', defaultMessage: '正在生成报告，可能需要几十秒...' })}>
                    <div dangerouslySetInnerHTML={{ __html: state.aiReportContent }} style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16 }} />
                    <style>{`.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; } .markdown-body th, .markdown-body td { border: 1px solid #d9d9d9; padding: 8px 12px; text-align: left; } .markdown-body th { background-color: #fafafa; font-weight: 600; } .markdown-body tr:nth-child(even) { background-color: #fbfbfb; } .markdown-body blockquote { margin: 0 0 16px; padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; }`}</style>
                </Spin>
            </Modal>
        </PageContainer>
    );
};

export default StatisticsPage;
