import React, { useCallback, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography, Progress, Tag, Empty, Button, Space, DatePicker, message, Modal, Radio } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { marked } from 'marked';
import {
    ProjectOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    RocketOutlined,
    TrophyOutlined,
    TeamOutlined,
    RobotOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import StatisticsPeriodSelector from '@/components/StatisticsPeriodSelector';
import * as projectStatisticsService from '@/services/project/statistics';
import { ProjectStatisticsPeriod, ProjectDashboardStatistics } from '@/services/project/statistics';
import styles from './index.less';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const StatisticsPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<string>('month');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
        dayjs().startOf('month'),
        dayjs().endOf('month').startOf('day')
    ]);
    const [statistics, setStatistics] = useState<ProjectDashboardStatistics | null>(null);

    const [aiReportVisible, setAiReportVisible] = useState(false);
    const [aiReportLoading, setAiReportLoading] = useState(false);
    const [aiReportContent, setAiReportContent] = useState('');

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

            const res = await projectStatisticsService.getDashboardStatistics(startDate, endDate);
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
            message.error('加载统计数据失败');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const handleGenerateAiReport = async () => {
        setAiReportLoading(true);
        setAiReportVisible(true);
        setAiReportContent('');

        try {
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (dateRange) {
                startDate = dateRange[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss');
                // 使用左闭右开区间：结束日期 + 1天，确保包含最后一天
                endDate = dateRange[1].add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
            }

            const res = await projectStatisticsService.generateAiReport(startDate, endDate, statistics);

            if (res.success && res.data) {
                try {
                    const html = await marked.parse(res.data);
                    setAiReportContent(html);
                } catch (parseError) {
                    setAiReportContent(res.data);
                }
            } else {
                setAiReportContent('生成报告失败，请稍后重试。');
            }
        } catch (error) {
            setAiReportContent('生成报告失败，请稍后重试。');
        } finally {
            setAiReportLoading(false);
        }
    };

    const periodOptions = [
        { label: '本周', value: ProjectStatisticsPeriod.Week },
        { label: '本月', value: ProjectStatisticsPeriod.Month },
        { label: '本季', value: ProjectStatisticsPeriod.Quarter },
        { label: '本年', value: ProjectStatisticsPeriod.Year },
        { label: '自定义', value: 'custom' },
    ];

    const renderProjectCard = () => {
        if (!statistics?.project) return <Card loading className={styles.statCard} />;
        const { totalProjects, inProgressProjects, completedProjects, delayedProjects } = statistics.project;

        return (
            <Card className={styles.statCard}>
                <div className={styles.cardHeader}>
                    <Statistic
                        title="项目总数"
                        value={totalProjects}
                    />
                    <div className={`${styles.iconWrapper} ${styles.blue}`}>
                        <ProjectOutlined />
                    </div>
                </div>

                <div className={styles.progressWrapper}>
                    <div className={styles.progressLabel}>
                        <Text>总体完成度</Text>
                        <Text strong>{totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%</Text>
                    </div>
                    <Progress
                        percent={totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}
                        showInfo={false}
                        strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                        size="small"
                    />
                </div>

                <div className={styles.subStatRow}>
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Statistic
                                title="进行中"
                                value={inProgressProjects}
                                styles={{ content: { color: '#1890ff' } }}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="已完成"
                                value={completedProjects}
                                styles={{ content: { color: '#52c41a' } }}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="延期"
                                value={delayedProjects}
                                styles={{ content: { color: '#ff4d4f' } }}
                            />
                        </Col>
                    </Row>
                </div>
            </Card>
        );
    };

    const renderTaskCard = () => {
        if (!statistics?.task) return <Card loading className={styles.statCard} />;
        const { totalTasks, completedTasks, overdueTasks, completionRate } = statistics.task;

        return (
            <Card className={styles.statCard}>
                <div className={styles.cardHeader}>
                    <div>
                        <Statistic
                            title="任务总数"
                            value={totalTasks}
                        />
                        <div style={{ marginTop: 4 }}>
                            <Tag color={overdueTasks > 0 ? 'error' : 'success'}>
                                {overdueTasks > 0 ? `${overdueTasks} 个逾期` : '无逾期任务'}
                            </Tag>
                        </div>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.green}`}>
                        <RocketOutlined />
                    </div>
                </div>

                <div className={styles.subStatRow}>
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Statistic
                                title="已完成"
                                value={completedTasks}
                            />
                        </Col>
                        <Col>
                            <Progress
                                type="circle"
                                percent={completionRate}
                                size={50}
                                strokeColor="#52c41a"
                                format={(percent) => <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{percent}%</span>}
                            />
                        </Col>
                    </Row>
                </div>
            </Card>
        );
    };

    const renderMilestoneCard = () => {
        if (!statistics?.milestone) return <Card loading className={styles.statCard} />;
        const { totalMilestones, pendingMilestones, achievedMilestones, delayedMilestones } = statistics.milestone;

        return (
            <Card className={styles.statCard}>
                <div className={styles.cardHeader}>
                    <Statistic
                        title="里程碑总数"
                        value={totalMilestones}
                    />
                    <div className={`${styles.iconWrapper} ${styles.orange}`}>
                        <TrophyOutlined />
                    </div>
                </div>

                <div className={styles.subStatRow}>
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Statistic
                                title="待达成"
                                value={pendingMilestones}
                                prefix={<ClockCircleOutlined />}
                                styles={{ content: { color: '#faad14' } }}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="已达成"
                                value={achievedMilestones}
                                prefix={<CheckCircleOutlined />}
                                styles={{ content: { color: '#52c41a' } }}
                            />
                        </Col>
                    </Row>
                </div>

                {delayedMilestones > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #f0f0f0' }}>
                        <Tag icon={<WarningOutlined />} color="error" style={{ width: '100%', textAlign: 'center', margin: 0 }}>
                            {delayedMilestones} 个里程碑已延期
                        </Tag>
                    </div>
                )}
            </Card>
        );
    };

    const renderMemberCard = () => {
        if (!statistics?.member) return <Card loading className={styles.statCard} />;
        const { totalMembers, membersByRole } = statistics.member;

        return (
            <Card className={styles.statCard}>
                <div className={styles.cardHeader}>
                    <Statistic
                        title="团队规模"
                        value={totalMembers}
                    />
                    <div className={`${styles.iconWrapper} ${styles.cyan}`}>
                        <TeamOutlined />
                    </div>
                </div>

                <div className={styles.subStatRow}>
                    <div style={{ height: 68, overflowY: 'auto' }}>
                        {/* Fixed height to align with other cards visually roughly */}
                        {Object.entries(membersByRole).length > 0 ? (
                            Object.entries(membersByRole).map(([role, count]) => (
                                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                                    <span>{role}</span>
                                    <span style={{ fontWeight: 500 }}>{count}</span>
                                </div>
                            ))
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成员" style={{ margin: 0 }} />
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <PageContainer
            title="项目统计报表"
            ghost
            extra={[
                <Space key="statistics-extra">
                    <StatisticsPeriodSelector
                        value={period as string}
                        dateRange={dateRange}
                        onChange={(newDateRange, newPeriod) => {
                            setDateRange(newDateRange);
                            if (newPeriod) {
                                setPeriod(newPeriod);
                            }
                        }}
                    />
                    <Button
                        icon={<RobotOutlined />}
                        onClick={handleGenerateAiReport}
                        type="primary"
                        style={{ background: 'linear-gradient(45deg, #1890ff, #722ed1)', borderColor: 'transparent' }}
                    >
                        AI 分析报告
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={loadStatistics} type="primary" ghost>
                        刷新
                    </Button>
                </Space>
            ]}
        >
            <div className={styles.statisticsPage}>
                <Spin spinning={loading}>
                    <Row gutter={[24, 24]}>
                        <Col xs={24} sm={12} lg={6}>
                            {renderProjectCard()}
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            {renderTaskCard()}
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            {renderMilestoneCard()}
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            {renderMemberCard()}
                        </Col>
                    </Row>
                </Spin>

                <Modal
                    title={
                        <Space>
                            <RobotOutlined style={{ color: '#1890ff' }} />
                            <span>项目运营 AI 深度分析报告</span>
                        </Space>
                    }
                    open={aiReportVisible}
                    onCancel={() => setAiReportVisible(false)}
                    footer={null}
                    width={900}
                    styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px' } }}
                >
                    <Spin spinning={aiReportLoading} tip="AI 正在分析大量项目数据，生成专业报告中...">
                        <div
                            className={styles.markdownBody}
                            dangerouslySetInnerHTML={{ __html: aiReportContent }}
                            style={{ fontSize: 15, lineHeight: 1.8 }}
                        />
                    </Spin>
                </Modal>
            </div>
        </PageContainer>
    );
};

export default StatisticsPage;
