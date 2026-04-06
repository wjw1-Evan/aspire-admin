import React, { useEffect, useState } from 'react';
import { Card, Space, Table, Button, Tag, Empty, theme, Typography, Progress, Tooltip } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useAccess, useNavigate, useIntl } from '@umijs/max';
import { getProjectList, ProjectStatus, ProjectPriority } from '@/services/task/project';
import type { ProjectDto } from '@/services/task/project';

const { Text } = Typography;

interface ProjectListCardProps {
    readonly loading?: boolean;
}

const ProjectListCard: React.FC<ProjectListCardProps> = ({ loading: externalLoading = false }) => {
    const { token } = theme.useToken();
    const access = useAccess();
    const navigate = useNavigate();
    const intl = useIntl();
    const [projects, setProjects] = useState<ProjectDto[]>([]);
    const [loading, setLoading] = useState(false);

    // 检查用户是否有权限访问项目管理
    const canAccessProject = access.canAccessPath('/project-management');

    // 获取项目列表
    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await getProjectList({
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
            if (res?.data?.queryable) {
                setProjects(res.data.queryable);
            }
        } catch (error) {
            console.warn(intl.formatMessage({ id: 'pages.welcome.projectList.fetchFailed' }), error);
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        if (!canAccessProject) return;
        fetchProjects();

        // 定时刷新（每 60 秒）
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchProjects();
            }
        }, 60000);

        // 监听可见性变化
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchProjects();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [canAccessProject]);

    // 获取状态颜色
    const getStatusColor = (status: number) => {
        switch (status) {
            case ProjectStatus.Planning:
                return 'blue';
            case ProjectStatus.InProgress:
                return 'green';
            case ProjectStatus.OnHold:
                return 'orange';
            case ProjectStatus.Completed:
                return 'cyan';
            case ProjectStatus.Cancelled:
                return 'red';
            default:
                return 'default';
        }
    };

    // 获取优先级颜色
    const getPriorityColor = (priority: number) => {
        switch (priority) {
            case ProjectPriority.Low:
                return 'blue';
            case ProjectPriority.Medium:
                return 'orange';
            case ProjectPriority.High:
                return 'red';
            default:
                return 'default';
        }
    };

    // 获取优先级文本
    const getPriorityText = (priority: number) => {
        switch (priority) {
            case ProjectPriority.Low:
                return intl.formatMessage({ id: 'pages.welcome.projectList.priority.low' });
            case ProjectPriority.Medium:
                return intl.formatMessage({ id: 'pages.welcome.projectList.priority.medium' });
            case ProjectPriority.High:
                return intl.formatMessage({ id: 'pages.welcome.projectList.priority.high' });
            default:
                return intl.formatMessage({ id: 'pages.welcome.projectList.priority.unknown' });
        }
    };

    if (!canAccessProject) {
        return null;
    }

    const columns = [
        {
            title: intl.formatMessage({ id: 'pages.welcome.projectList.projectName' }),
            dataIndex: 'name',
            key: 'name',
            width: '35%',
            render: (text: string, record: ProjectDto) => (
                <Tooltip title={record.description}>
                    <Text ellipsis strong>{text}</Text>
                </Tooltip>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.welcome.projectList.status' }),
            dataIndex: 'statusName',
            key: 'status',
            width: '15%',
            render: (text: string, record: ProjectDto) => (
                <Tag color={getStatusColor(record.status)}>{text}</Tag>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.welcome.projectList.priority' }),
            dataIndex: 'priority',
            key: 'priority',
            width: '12%',
            render: (priority: number) => (
                <Tag color={getPriorityColor(priority)}>{getPriorityText(priority)}</Tag>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.welcome.projectList.progress' }),
            dataIndex: 'progress',
            key: 'progress',
            width: '20%',
            render: (progress: number) => (
                <Space style={{ width: '100%' }} size={4}>
                    <Progress
                        type="circle"
                        percent={progress}
                        size={32}
                        strokeColor={progress === 100 ? token.colorSuccess : token.colorPrimary}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{progress}%</Text>
                </Space>
            ),
        },
    ];

    return (
        <Card
            title={
                <Space>
                    <FolderOutlined />
                    <span>{intl.formatMessage({ id: 'pages.welcome.projectList.title' })}</span>
                </Space>
            }
            style={{ height: '100%', borderRadius: '12px' }}
            loading={externalLoading || loading}
        >
            {projects.length === 0 ? (
                <Empty
                    description={intl.formatMessage({ id: 'pages.welcome.projectList.empty' })}
                    style={{ marginTop: '20px' }}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={projects}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    style={{ marginTop: '12px' }}
                />
            )}
            {projects.length > 0 && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            navigate('/project-management/project');
                        }}
                    >
                        {intl.formatMessage({ id: 'pages.welcome.projectList.viewAll' })}
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default ProjectListCard;
