import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Statistic, Spin, Typography, Progress, Tag, Empty, Button, Space, DatePicker, Modal } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { marked } from 'marked';
import { TeamOutlined, ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined, StarOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, RobotOutlined, BarChartOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import { PageContainer } from '@ant-design/pro-components';
import StatisticsPeriodSelector from '@/components/StatisticsPeriodSelector';
import { ApiResponse } from '@/types';

const { Text } = Typography;

interface VisitStatistics {
    pendingTasks: number; completedTasksThisMonth: number; activeManagers: number;
    completionRate: number; totalAssessments: number; averageScore: number;
    tasksByType: Record<string, number>; tasksByStatus: Record<string, number>;
    managerRanking: Record<string, number>; monthlyTrends: Record<string, number>;
    totalQuestions: number; frequentlyUsedQuestions: number;
}

const api = {
    getStatistics: (startDate?: string, endDate?: string) =>
        request<ApiResponse<VisitStatistics>>('/apiservice/api/park-management/visit/statistics', { method: 'GET', params: { startDate, endDate } }),
    generateAiReport: (data: VisitStatistics) =>
        request<ApiResponse<string>>('/apiservice/api/park-management/visit/statistics/ai-report', { method: 'POST', data, timeout: 120000 }),
};

const VisitStatisticsPage: React.FC = () => {
    const intl = useIntl();
    const [state, setState] = useState({
        loading: false, period: 'month',
        dateRange: [dayjs().startOf('month'), dayjs().endOf('month').startOf('day')] as [Dayjs, Dayjs] | null,
        statistics: null as VisitStatistics | null,
        aiReportVisible: false, aiReportLoading: false, aiReportContent: '',
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const loadStatistics = useCallback(async () => {
        set({ loading: true });
        try {
            let startDate: string | undefined, endDate: string | undefined;
            if (state.dateRange) { startDate = state.dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss'); endDate = state.dateRange[1].add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss'); }
            const res = await api.getStatistics(startDate, endDate);
            if (res.success && res.data) set({ statistics: res.data });
        } catch (error) { console.error('Failed to load visit statistics:', error); }
        finally { set({ loading: false }); }
    }, [state.dateRange]);

    useEffect(() => { loadStatistics(); }, [loadStatistics]);

    const handleGenerateAiReport = async () => {
        if (!state.statistics) return;
        set({ aiReportLoading: true, aiReportVisible: true, aiReportContent: '' });
        try {
            const res = await api.generateAiReport(state.statistics);
            if (res.success && res.data) { try { const html = await marked.parse(res.data); set({ aiReportContent: html }); } catch { set({ aiReportContent: res.data }); } }
            else set({ aiReportContent: intl.formatMessage({ id: 'pages.park.visit.statistics.failed', defaultMessage: '生成报告失败，请稍后重试。' }) });
        } catch { set({ aiReportContent: intl.formatMessage({ id: 'pages.park.visit.statistics.failed', defaultMessage: '生成报告失败，请稍后重试。' }) }); }
        finally { set({ aiReportLoading: false }); }
    };

    const typeData = state.statistics ? Object.entries(state.statistics.tasksByType).map(([type, count]) => ({ type, count })) : [];
    const managerData = state.statistics ? Object.entries(state.statistics.managerRanking).map(([name, count]) => ({ name, count })) : [];
    const trendData = state.statistics ? Object.entries(state.statistics.monthlyTrends).map(([month, count]) => ({ month, count })) : [];

    const typeColumns: ProColumns<{ type: string; count: number }>[] = [
        { title: intl.formatMessage({ id: 'pages.park.statistics.category', defaultMessage: '类型' }), dataIndex: 'type', render: (text) => <Tag color="blue">{text}</Tag> },
        { title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '数量' }), dataIndex: 'count', sorter: (a, b) => a.count - b.count },
        { title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }), render: (_, record) => { const sum = typeData.reduce((acc, curr) => acc + curr.count, 0); const percent = sum > 0 ? (record.count / sum) * 100 : 0; return <Progress percent={Math.round(percent)} size="small" />; } }
    ];

    const managerColumns: ProColumns<{ name: string; count: number }>[] = [
        { title: intl.formatMessage({ id: 'pages.table.name', defaultMessage: '姓名' }), dataIndex: 'name', render: (text: any, _: any, index: number) => (<Space>{index < 3 ? <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : 'orange'}>{index + 1}</Tag> : <Tag>{index + 1}</Tag>}{text}</Space>) },
        { title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '走访次数' }), dataIndex: 'count', sorter: (a, b) => a.count - b.count },
        { title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }), render: (_, record) => { const sum = managerData.reduce((acc, curr) => acc + curr.count, 0); const percent = sum > 0 ? (record.count / sum) * 100 : 0; return <Progress percent={Math.round(percent)} size="small" strokeColor="#722ed1" />; } }
    ];

    const trendColumns: ProColumns<{ month: string; count: number }>[] = [
        { title: intl.formatMessage({ id: 'pages.park.statistics.month', defaultMessage: '月份' }), dataIndex: 'month' },
        { title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '走访次数' }), dataIndex: 'count' },
        { title: '', render: (_, record) => { const max = Math.max(...trendData.map(d => d.count), 1); const percent = (record.count / max) * 100; return <Progress percent={Math.round(percent)} size="small" showInfo={false} strokeColor="#52c41a" />; } }
    ];

    return (
        <PageContainer>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Space wrap>
                    <StatisticsPeriodSelector value={state.period as any as string} dateRange={state.dateRange} onChange={(newDateRange, newPeriod) => { set({ dateRange: newDateRange, period: newPeriod as any }); }} />
                    <Button icon={<ReloadOutlined />} onClick={loadStatistics} loading={state.loading}>{intl.formatMessage({ id: 'pages.common.refresh', defaultMessage: '刷新' })}</Button>
                    <Button type="primary" icon={<RobotOutlined />} onClick={handleGenerateAiReport} disabled={!state.statistics} style={{ background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderColor: 'transparent' }}>{intl.formatMessage({ id: 'pages.park.visit.statistics.aiReport', defaultMessage: '走访 AI 分析报告' })}</Button>
                </Space>
            </div>
            <Spin spinning={state.loading}>
                {state.statistics && (<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}><ProCard style={{ height: '100%', borderRadius: 8, transition: 'all 0.3s' }}><Statistic title={intl.formatMessage({ id: 'pages.park.visit.statistics.pendingTasks', defaultMessage: '待处理任务' })} value={state.statistics.pendingTasks} prefix={<ClockCircleOutlined />} styles={{ content: { color: '#faad14' } }} /><div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 4 }}>{intl.formatMessage({ id: 'pages.park.visit.statistics.overview', defaultMessage: '当前待执行的走访任务' })}</div></ProCard></Col>
                    <Col xs={24} sm={12} lg={6}><ProCard style={{ height: '100%', borderRadius: 8, transition: 'all 0.3s' }}><Statistic title={intl.formatMessage({ id: 'pages.park.visit.statistics.completedTasksThisMonth', defaultMessage: '本月完成任务' })} value={state.statistics.completedTasksThisMonth} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} /><div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 4 }}>{intl.formatMessage({ id: 'pages.park.visit.statistics.completionRate', defaultMessage: '任务完成率' })}: {state.statistics.completionRate}%<Progress percent={state.statistics.completionRate} size="small" showInfo={false} strokeColor="#52c41a" /></div></ProCard></Col>
                    <Col xs={24} sm={12} lg={6}><ProCard style={{ height: '100%', borderRadius: 8, transition: 'all 0.3s' }}><Statistic title={intl.formatMessage({ id: 'pages.park.visit.statistics.activeManagers', defaultMessage: '活跃企管员' })} value={state.statistics.activeManagers} prefix={<TeamOutlined />} styles={{ content: { color: '#1890ff' } }} /><div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 4 }}>{intl.formatMessage({ id: 'pages.park.visit.statistics.managerRanking', defaultMessage: '参与走访的企管员人数' })}</div></ProCard></Col>
                    <Col xs={24} sm={12} lg={6}><ProCard style={{ height: '100%', borderRadius: 8, transition: 'all 0.3s' }}><Statistic title={intl.formatMessage({ id: 'pages.park.visit.statistics.averageScore', defaultMessage: '满意度评分' })} value={state.statistics.averageScore} prefix={<StarOutlined style={{ color: '#faad14' }} />} suffix="/ 5" /><div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 4 }}>{intl.formatMessage({ id: 'pages.park.visit.statistics.totalAssessments', defaultMessage: '评价总数' })}: {state.statistics.totalAssessments}</div></ProCard></Col>
                </Row>)}

                {state.statistics && (<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}><ProCard style={{ height: '100%', borderRadius: 8, transition: 'all 0.3s' }}><Statistic title="知识库问题" value={state.statistics.totalQuestions} prefix={<BookOutlined />} styles={{ content: { color: '#722ed1' } }} /><div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 4 }}>常用问题: {state.statistics.frequentlyUsedQuestions}</div></ProCard></Col>
                </Row>)}

                {state.statistics && (<Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}><ProCard title={<Space><BarChartOutlined style={{ color: '#1890ff' }} />{intl.formatMessage({ id: 'pages.park.visit.statistics.tasksByType', defaultMessage: '任务类型分布' })}</Space>} style={{ marginBottom: 24, borderRadius: 8 }}><ProTable dataSource={typeData} pagination={false} size="small" rowKey="type" columns={typeColumns} search={false} /></ProCard></Col>
                    <Col xs={24} lg={12}><ProCard title={<Space><UserOutlined style={{ color: '#722ed1' }} />{intl.formatMessage({ id: 'pages.park.visit.statistics.managerRanking', defaultMessage: '企管员走访排行' })}</Space>} style={{ marginBottom: 24, borderRadius: 8 }}><ProTable dataSource={managerData} pagination={false} size="small" rowKey="name" columns={managerColumns} search={false} /></ProCard></Col>
                    <Col xs={24}><ProCard title={<Space><SyncOutlined style={{ color: '#52c41a' }} />{intl.formatMessage({ id: 'pages.park.visit.statistics.monthlyTrends', defaultMessage: '走访趋势分析' })}</Space>} style={{ marginBottom: 24, borderRadius: 8 }}><ProTable dataSource={trendData} pagination={false} size="small" rowKey="month" columns={trendColumns} search={false} /></ProCard></Col>
                </Row>)}

                {!state.statistics && <Empty />}

                <Modal title={<Space orientation="vertical" size={4} style={{ width: '100%' }}><Space><RobotOutlined style={{ color: '#1890ff' }} />{intl.formatMessage({ id: 'pages.park.visit.statistics.aiReport', defaultMessage: '走访 AI 分析报告' })}</Space><div style={{ fontSize: 12, fontWeight: 'normal', color: 'rgba(0, 0, 0, 0.45)', marginLeft: 24 }}>{intl.formatMessage({ id: 'pages.park.statistics.reportPeriod', defaultMessage: '报告周期' })}: <Tag color="blue" style={{ marginRight: 8 }}>{state.period === 'month' ? '本月' : state.period === 'year' ? '本年' : state.period === 'custom' ? '自定义' : state.period}</Tag>{state.dateRange ? `${state.dateRange[0].format('YYYY-MM-DD')} ~ ${state.dateRange[1].format('YYYY-MM-DD')}` : '-'}</div></Space>}
                    open={state.aiReportVisible} onCancel={() => set({ aiReportVisible: false })} footer={null} width={900}
                    styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px' } }}>
                    <Spin spinning={state.aiReportLoading} tip={intl.formatMessage({ id: 'pages.park.visit.statistics.generatingReport', defaultMessage: '正在生成报告，可能需要几十秒...' })}>
                        <div dangerouslySetInnerHTML={{ __html: state.aiReportContent }} style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16 }} />
                        <style>{`.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; } .markdown-body th, .markdown-body td { border: 1px solid #d9d9d9; padding: 8px 12px; text-align: left; } .markdown-body th { background-color: #fafafa; font-weight: 600; } .markdown-body tr:nth-child(even) { background-color: #fbfbfb; } .markdown-body blockquote { margin: 0 0 16px; padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; }`}</style>
                    </Spin>
                </Modal>
            </Spin>
        </PageContainer>
    );
};

export default VisitStatisticsPage;
