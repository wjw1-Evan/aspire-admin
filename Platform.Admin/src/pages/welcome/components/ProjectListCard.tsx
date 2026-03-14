import React, { useEffect, useState } from 'react';
import { Card, Space, Table, Tag, Empty, theme, Typography, Progress, Tooltip } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useAccess, useNavigate } from '@umijs/max';
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
    const [projects, setProjects] = useState<ProjectDto[]>([]);
    const [loading, setLoading] = useState(false);

    // 检查用户是否有权限访问项目管理
    const canAccessProject = access.canAccessPath('/project-management');

    // 获取项目列表
    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await getProjectList({
                page: 1,
                pageSize: 5,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
            if (res?.data?.projects) {
                setProjects(res.data.projects);
            }
        } catch (error) {
            console.warn('获取项目列表失败:', error);
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
                return '低';
            case ProjectPriority.Medium:
                return '中';
            case ProjectPriority.High:
                return '高';
            default:
                return '未知';
        }
    };

    if (!canAccessProject) {
        return null;
    }

    const columns = [
        {
            title: '项目名称',
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
            title: '状态',
            dataIndex: 'statusName',
            key: 'status',
            width: '15%',
            render: (text: string, record: ProjectDto) => (
                <Tag color={getStatusColor(record.status)}>{text}</Tag>
            ),
        },
        {
            title: '优先级',
            dataIndex: 'priority',
            key: 'priority',
            width: '12%',
            render: (priority: number) => (
                <Tag color={getPriorityColor(priority)}>{getPriorityText(priority)}</Tag>
            ),
        },
        {
            title: '进度',
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
                    <span>项目列表</span>
                </Space>
            }
            style={{ height: '100%', borderRadius: '12px' }}
            loading={externalLoading || loading}
        >
            {projects.length === 0 ? (
                <Empty
                    description="暂无项目"
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
                        查看全部项目
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default ProjectListCard;
