import React, { useCallback, useState, useEffect } from 'react';
import { Row, Col, Statistic, Spin, Typography, Progress, Tag, Empty, Button, Space, Modal } from 'antd';
import { ProCard } from '@ant-design/pro-components';
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
import { PageContainer } from '@ant-design/pro-components';
import StatisticsPeriodSelector from '@/components/StatisticsPeriodSelector';
import * as projectStatisticsService from '@/services/project/statistics';
import { ProjectDashboardStatistics } from '@/services/project/statistics';

const { Text } = Typography;

const StatisticsPage: React.FC = () => {
    const intl = useIntl();
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
                endDate = dateRange[1].add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
            }

            const res = await projectStatisticsService.getDashboardStatistics(startDate, endDate);
            if (res.success && res.data) {
                setStatistics(res.data);
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
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

    const getPeriodLabel = () => {
        switch (period) {
            case 'week': return '本周';
            case 'month': return '本月';
            case 'quarter': return '本季';
            case 'year': return '本年';
            case 'custom': return '自定义';
            default: return '本月';
        }
    };

    const renderProjectCard = () => {
        if (!statistics?.project) {
            return (
                <ProCard loading className="stat-card" style={{ height: 200 }} />
            );
        }

        const { totalProjects, inProgressProjects, completedProjects, delayedProjects } = statistics.project;
        const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

        return (
            <ProCard className="stat-card" style={{ height: 200, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>项目总数</div>
                        <div style={{ fontSize: 24, fontWeight: 500, color: '#1890ff' }}>{totalProjects}</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)', padding: 8, borderRadius: 6 }}>
                        <ProjectOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                    </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>总体完成度</Text>
                        <Text strong style={{ fontSize: 12 }}>{completionRate}%</Text>
                    </div>
                    <Progress percent={completionRate} showInfo={false} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} size="small" />
                </div>

                <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500, color: '#1890ff' }}>{inProgressProjects}</div>
                            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>进行中</div>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500, color: '#52c41a' }}>{completedProjects}</div>
                            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>已完成</div>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500, color: '#ff4d4f' }}>{delayedProjects}</div>
                            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>延期</div>
                        </div>
                    </Col>
                </Row>
            </ProCard>
        );
    };

    const renderTaskCard = () => {
        if (!statistics?.task) {
            return (
                <ProCard loading className="stat-card" style={{ height: 200 }} />
            );
        }

        const { totalTasks, completedTasks, overdueTasks, completionRate } = statistics.task;

        return (
            <ProCard className="stat-card" style={{ height: 200, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>任务总数</div>
                        <div style={{ fontSize: 24, fontWeight: 500, color: '#52c41a' }}>{totalTasks}</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #f6ffed, #f9f6f2)', padding: 8, borderRadius: 6 }}>
                        <RocketOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                    </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                    {overdueTasks > 0 ? (
                        <Tag color="error" icon={<WarningOutlined />} style={{ width: '100%', textAlign: 'center', margin: 0 }}>
                            {overdueTasks} 个逾期
                        </Tag>
                    ) : (
                        <Tag color="success" icon={<CheckCircleOutlined />} style={{ width: '100%', textAlign: 'center', margin: 0 }}>
                            无逾期任务
                        </Tag>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>已完成</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#52c41a' }}>{completedTasks}</div>
                    </div>
                    <Progress
                        type="circle"
                        percent={completionRate}
                        size={45}
                        strokeColor="#52c41a"
                        format={(percent) => <span style={{ fontSize: 10 }}>{percent}%</span>}
                    />
                </div>
            </ProCard>
        );
    };

    const renderMilestoneCard = () => {
        if (!statistics?.milestone) {
            return (
                <ProCard loading className="stat-card" style={{ height: 200 }} />
            );
        }

        const { totalMilestones, pendingMilestones, achievedMilestones, delayedMilestones } = statistics.milestone;

        return (
            <ProCard className="stat-card" style={{ height: 200, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>里程碑总数</div>
                        <div style={{ fontSize: 24, fontWeight: 500, color: '#faad14' }}>{totalMilestones}</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #fffbe6, #fff7e6)', padding: 8, borderRadius: 6 }}>
                        <TrophyOutlined style={{ fontSize: 18, color: '#faad14' }} />
                    </div>
                </div>

                <Row gutter={16} style={{ marginTop: 12 }}>
                    <Col span={12}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ClockCircleOutlined style={{ color: '#faad14', fontSize: 14 }} />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{pendingMilestones}</div>
                                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>待达成</div>
                            </div>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{achievedMilestones}</div>
                                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>已达成</div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {delayedMilestones > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <Tag color="error" icon={<WarningOutlined />} style={{ width: '100%', textAlign: 'center', margin: 0 }}>
                            {delayedMilestones} 个延期
                        </Tag>
                    </div>
                )}
            </ProCard>
        );
    };

    const renderMemberCard = () => {
        if (!statistics?.member) {
            return (
                <ProCard loading className="stat-card" style={{ height: 200 }} />
            );
        }

        const { totalMembers, membersByRole } = statistics.member;

        return (
            <ProCard className="stat-card" style={{ height: 200, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>团队规模</div>
                        <div style={{ fontSize: 24, fontWeight: 500, color: '#722ed1' }}>{totalMembers}</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #f9f0ff, #efdbff)', padding: 8, borderRadius: 6 }}>
                        <TeamOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                    </div>
                </div>

                <div style={{ maxHeight: 100, overflowY: 'auto', marginTop: 8 }}>
                    {Object.entries(membersByRole).length > 0 ? (
                        Object.entries(membersByRole).map(([role, count]) => (
                            <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                                <span>{role}</span>
                                <span style={{ fontWeight: 500 }}>{count}</span>
                            </div>
                        ))
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成员" />
                    )}
                </div>
            </ProCard>
        );
    };

    return (
        <PageContainer>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Space wrap>
                    <StatisticsPeriodSelector
                        value={period}
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
            </div>

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
                        dangerouslySetInnerHTML={{ __html: aiReportContent }}
                        style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}
                    />
                    <style>{`.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; } .markdown-body th, .markdown-body td { border: 1px solid #d9d9d9; padding: 8px 12px; text-align: left; } .markdown-body th { background-color: #fafafa; font-weight: 600; } .markdown-body tr:nth-child(even) { background-color: #fbfbfb; } .markdown-body blockquote { margin: 0 0 16px; padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; }`}</style>
                </Spin>
            </Modal>
        </PageContainer>
    );
};

export default StatisticsPage;