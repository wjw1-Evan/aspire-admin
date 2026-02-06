import React from 'react';
import { Card, Row, Col, Space, Alert, Typography, Tag, theme } from 'antd';
import { BarChartOutlined, ClockCircleOutlined, RocketOutlined, CheckCircleOutlined, CloseCircleOutlined, SafetyOutlined, MenuOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';
import useCommonStyles from '@/hooks/useCommonStyles';
import StatCard from './StatCard';
import type { TaskStatistics, TaskDto } from '@/services/task/api';


const { Text } = Typography;

interface TaskOverviewCardProps {
    readonly taskStatistics: TaskStatistics | null;
    readonly todoTasks: TaskDto[];
    readonly loading: boolean;
    readonly currentUser?: API.CurrentUser;
}

const TaskOverviewCard: React.FC<TaskOverviewCardProps> = ({ taskStatistics, todoTasks, loading, currentUser }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { styles } = useCommonStyles();

    return (
        <Card
            title={
                <Space>
                    <BarChartOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.taskOverview' })}</span>
                </Space>
            }
            className={styles.card}
            style={{ height: '100%' }}
        >
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.taskManagement.statistics.totalTasks' })}
                        value={taskStatistics?.totalTasks ?? 0}
                        icon={<BarChartOutlined />}
                        color={token.colorPrimary}
                        loading={loading}
                        token={token}
                        onClick={() => history.push('/task-management')}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.taskManagement.statistics.pendingTasks' })}
                        value={taskStatistics?.pendingTasks ?? 0}
                        icon={<ClockCircleOutlined />}
                        color={token.colorWarning}
                        loading={loading}
                        token={token}
                        onClick={() => history.push('/task-management?status=0')}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.taskManagement.statistics.inProgressTasks' })}
                        value={taskStatistics?.inProgressTasks ?? 0}
                        icon={<RocketOutlined />}
                        color={token.colorSuccess}
                        loading={loading}
                        token={token}
                        onClick={() => history.push('/task-management?status=2')}
                    />
                </Col>
            </Row>
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                <Col xs={24} sm={8}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completedTasks' })}
                        value={taskStatistics?.completedTasks ?? 0}
                        icon={<CheckCircleOutlined />}
                        color={token.colorSuccess}
                        loading={loading}
                        token={token}
                        onClick={() => history.push('/task-management?status=3')}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.taskManagement.statistics.failedTasks' })}
                        value={taskStatistics?.failedTasks ?? 0}
                        icon={<CloseCircleOutlined />}
                        color={token.colorError}
                        loading={loading}
                        token={token}
                        onClick={() => history.push('/task-management?status=5')}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <StatCard
                        title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completionRate' })}
                        value={taskStatistics ? `${taskStatistics.completionRate.toFixed(1)}` : '0'}
                        suffix="%"
                        icon={<SafetyOutlined />}
                        color={token.colorPrimary}
                        loading={loading}
                        token={token}
                        onClick={() => history.push('/task-management')}
                    />
                </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
                <Space style={{ marginBottom: 8 }}>
                    <MenuOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.myTodoTasks' })}</span>
                </Space>
                {todoTasks.length === 0 ? (
                    <Alert
                        type="info"
                        title={intl.formatMessage({ id: 'pages.welcome.myTodoTasks.empty' })}
                        showIcon
                    />
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {todoTasks.slice(0, 5).map((task) => (
                            <li
                                key={task.id}
                                style={{
                                    padding: '6px 0',
                                    borderBottom: '1px solid #f0f0f0',
                                    cursor: 'pointer'
                                }}
                                onClick={() => history.push(`/task-management?taskId=${task.id}`)}
                            >
                                <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                                    <Space>
                                        <Text strong>{task.taskName}</Text>
                                        {task.priorityName && (
                                            <Tag
                                                color="processing"
                                                style={{ paddingInline: 6, lineHeight: '20px', fontSize: 12 }}
                                            >
                                                {task.priorityName}
                                            </Tag>
                                        )}
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {task.statusName} · {task.assignedToName || currentUser?.name || currentUser?.userid}
                                    </Text>
                                </Space>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>
    );
};

export default TaskOverviewCard;
