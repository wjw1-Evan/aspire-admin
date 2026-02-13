import React, { useCallback, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography, Progress, Tag, Empty, Button, Space, Table, DatePicker, Modal } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { marked } from 'marked';
import {
    TeamOutlined,
    FileTextOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    ReloadOutlined,
    StarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    RobotOutlined,
    BarChartOutlined,
    UserOutlined,
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import * as visitService from '@/services/visit';
import { StatisticsPeriod } from '@/services/visit';
import type { VisitStatistics } from '@/services/visit';
import StatisticsPeriodSelector from '@/components/StatisticsPeriodSelector';
import styles from './index.less';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const VisitStatisticsPage: React.FC = () => {
    const intl = useIntl();
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<string>('month');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
        dayjs().startOf('month'),
        dayjs().endOf('month').startOf('day')
    ]);
    const [statistics, setStatistics] = useState<VisitStatistics | null>(null);

    const [aiReportVisible, setAiReportVisible] = useState(false);
    const [aiReportLoading, setAiReportLoading] = useState(false);
    const [aiReportContent, setAiReportContent] = useState('');

    const handleGenerateAiReport = async () => {
        if (!statistics) return;
        setAiReportLoading(true);
        setAiReportVisible(true);
        setAiReportContent('');

        try {
            const res = await visitService.generateVisitAiReport(statistics);
            if (res.success && res.data) {
                try {
                    const html = await marked.parse(res.data);
                    setAiReportContent(html);
                } catch (parseError) {
                    console.error('Markdown parse error:', parseError);
                    setAiReportContent(res.data);
                }
            } else {
                setAiReportContent(intl.formatMessage({ id: 'pages.park.visit.statistics.failed', defaultMessage: '生成报告失败，请稍后重试。' }));
            }
        } catch (error) {
            console.error('Failed to generate AI report:', error);
            setAiReportContent(intl.formatMessage({ id: 'pages.park.visit.statistics.failed', defaultMessage: '生成报告失败，请稍后重试。' }));
        } finally {
            setAiReportLoading(false);
        }
    };

    const loadStatistics = useCallback(async () => {
        setLoading(true);
        try {
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (dateRange) {
                startDate = dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss');
                // 使用左闭右开区间：结束日期 + 1天，确保包含最后一天
                endDate = dateRange[1].add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
            }

            const res = await visitService.getVisitStatistics(startDate, endDate);
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load visit statistics:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const renderOverviewCards = () => {
        if (!statistics) return null;

        return (
            <Row gutter={[16, 16]} className={styles['stat-cards']}>
                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.visit.statistics.pendingTasks', defaultMessage: '待处理任务' })}
                            value={statistics.pendingTasks}
                            prefix={<ClockCircleOutlined />}
                            styles={{ content: { color: '#faad14' } }}
                        />
                        <div className={styles['stat-description']}>
                            {intl.formatMessage({ id: 'pages.park.visit.statistics.overview', defaultMessage: '当前待执行的走访任务' })}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.visit.statistics.completedTasksThisMonth', defaultMessage: '本月完成任务' })}
                            value={statistics.completedTasksThisMonth}
                            prefix={<CheckCircleOutlined />}
                            styles={{ content: { color: '#52c41a' } }}
                        />
                        <div className={styles['stat-description']}>
                            {intl.formatMessage({ id: 'pages.park.visit.statistics.completionRate', defaultMessage: '任务完成率' })}: {statistics.completionRate}%
                            <Progress percent={statistics.completionRate} size="small" showInfo={false} strokeColor="#52c41a" />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.visit.statistics.activeManagers', defaultMessage: '活跃企管员' })}
                            value={statistics.activeManagers}
                            prefix={<TeamOutlined />}
                            styles={{ content: { color: '#1890ff' } }}
                        />
                        <div className={styles['stat-description']}>
                            {intl.formatMessage({ id: 'pages.park.visit.statistics.managerRanking', defaultMessage: '参与走访的企管员人数' })}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card className={styles['stat-card']}>
                        <Statistic
                            title={intl.formatMessage({ id: 'pages.park.visit.statistics.averageScore', defaultMessage: '满意度评分' })}
                            value={statistics.averageScore}
                            prefix={<StarOutlined style={{ color: '#faad14' }} />}
                            suffix="/ 5"
                        />
                        <div className={styles['stat-description']}>
                            {intl.formatMessage({ id: 'pages.park.visit.statistics.totalAssessments', defaultMessage: '评价总数' })}: {statistics.totalAssessments}
                        </div>
                    </Card>
                </Col>
            </Row>
        );
    };

    const renderCharts = () => {
        if (!statistics) return <Empty />;

        const typeData = Object.entries(statistics.tasksByType).map(([type, count]) => ({ type, count }));
        const managerData = Object.entries(statistics.managerRanking).map(([name, count]) => ({ name, count }));
        const trendData = Object.entries(statistics.monthlyTrends).map(([month, count]) => ({ month, count }));

        return (
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <BarChartOutlined style={{ color: '#1890ff' }} />
                                {intl.formatMessage({ id: 'pages.park.visit.statistics.tasksByType', defaultMessage: '任务类型分布' })}
                            </Space>
                        }
                        className={styles['chart-card']}
                    >
                        <Table
                            dataSource={typeData}
                            pagination={false}
                            size="small"
                            rowKey="type"
                            columns={[
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.category', defaultMessage: '类型' }),
                                    dataIndex: 'type',
                                    render: (text) => <Tag color="blue">{text}</Tag>
                                },
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '数量' }),
                                    dataIndex: 'count',
                                    sorter: (a, b) => a.count - b.count,
                                },
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                    render: (_, record) => {
                                        const sum = typeData.reduce((acc, curr) => acc + curr.count, 0);
                                        const percent = sum > 0 ? (record.count / sum) * 100 : 0;
                                        return <Progress percent={Math.round(percent)} size="small" />;
                                    }
                                }
                            ]}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <UserOutlined style={{ color: '#722ed1' }} />
                                {intl.formatMessage({ id: 'pages.park.visit.statistics.managerRanking', defaultMessage: '企管员走访排行' })}
                            </Space>
                        }
                        className={styles['chart-card']}
                    >
                        <Table
                            dataSource={managerData}
                            pagination={false}
                            size="small"
                            rowKey="name"
                            columns={[
                                {
                                    title: intl.formatMessage({ id: 'pages.table.name', defaultMessage: '姓名' }),
                                    dataIndex: 'name',
                                    render: (text, _, index) => (
                                        <Space>
                                            {index < 3 ? <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : 'orange'}>{index + 1}</Tag> : <Tag>{index + 1}</Tag>}
                                            {text}
                                        </Space>
                                    )
                                },
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '走访次数' }),
                                    dataIndex: 'count',
                                    sorter: (a, b) => a.count - b.count,
                                },
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.percentage', defaultMessage: '占比' }),
                                    render: (_, record) => {
                                        const sum = managerData.reduce((acc, curr) => acc + curr.count, 0);
                                        const percent = sum > 0 ? (record.count / sum) * 100 : 0;
                                        return <Progress percent={Math.round(percent)} size="small" strokeColor="#722ed1" />;
                                    }
                                }
                            ]}
                        />
                    </Card>
                </Col>

                <Col xs={24}>
                    <Card
                        title={
                            <Space>
                                <SyncOutlined style={{ color: '#52c41a' }} />
                                {intl.formatMessage({ id: 'pages.park.visit.statistics.monthlyTrends', defaultMessage: '走访趋势分析' })}
                            </Space>
                        }
                        className={styles['chart-card']}
                    >
                        <Table
                            dataSource={trendData}
                            pagination={false}
                            size="small"
                            rowKey="month"
                            columns={[
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.month', defaultMessage: '月份' }),
                                    dataIndex: 'month',
                                },
                                {
                                    title: intl.formatMessage({ id: 'pages.park.statistics.count', defaultMessage: '走访次数' }),
                                    dataIndex: 'count',
                                },
                                {
                                    title: '',
                                    render: (_, record) => {
                                        const max = Math.max(...trendData.map(d => d.count), 1);
                                        const percent = (record.count / max) * 100;
                                        return <Progress percent={Math.round(percent)} size="small" showInfo={false} strokeColor="#52c41a" />;
                                    }
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        );
    };

    return (
        <PageContainer
            title={intl.formatMessage({ id: 'pages.park.visit.statistics', defaultMessage: '走访统计报表' })}
            extra={[
                <Space key="period-selection" wrap>
                    <StatisticsPeriodSelector
                        value={period as any as string}
                        dateRange={dateRange}
                        onChange={(newDateRange, newPeriod) => {
                            setDateRange(newDateRange);
                            if (newPeriod) {
                                setPeriod(newPeriod as any);
                            }
                        }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadStatistics} loading={loading}>
                        {intl.formatMessage({ id: 'pages.common.refresh', defaultMessage: '刷新' })}
                    </Button>
                    <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        onClick={handleGenerateAiReport}
                        disabled={!statistics}
                        style={{ background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderColor: 'transparent' }}
                    >
                        {intl.formatMessage({ id: 'pages.park.visit.statistics.aiReport', defaultMessage: '走访 AI 分析报告' })}
                    </Button>
                </Space>
            ]}
        >
            <div className={styles['statistics-page']}>
                <Spin spinning={loading}>
                    {renderOverviewCards()}
                    {renderCharts()}
                </Spin>

                <Modal
                    title={
                        <Space>
                            <RobotOutlined style={{ color: '#1890ff' }} />
                            {intl.formatMessage({ id: 'pages.park.visit.statistics.aiReport', defaultMessage: '走访 AI 分析报告' })}
                        </Space>
                    }
                    open={aiReportVisible}
                    onCancel={() => setAiReportVisible(false)}
                    footer={null}
                    width={900}
                    styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px' } }}
                >
                    <Spin spinning={aiReportLoading} tip={intl.formatMessage({ id: 'pages.park.visit.statistics.generatingReport', defaultMessage: '正在生成报告，可能需要几十秒...' })}>
                        <div
                            className={styles['markdown-body']}
                            dangerouslySetInnerHTML={{ __html: aiReportContent }}
                            style={{ fontSize: 15, lineHeight: 1.8 }}
                        />
                    </Spin>
                </Modal>
            </div>
        </PageContainer>
    );
};

export default VisitStatisticsPage;
