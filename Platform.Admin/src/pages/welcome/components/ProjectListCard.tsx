import { FolderOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components/es/table';
import { useAccess, useIntl, useNavigate } from '@umijs/max';
import { Card, Empty, Progress, Space, Tag, Tooltip, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import type { ProjectDto } from '@/services/task/project';
import { getProjectList, ProjectPriority, ProjectStatus } from '@/services/task/project';

const { Text } = Typography;

interface ProjectListCardProps {
  readonly loading?: boolean;
}

const ProjectListCard: React.FC<ProjectListCardProps> = ({ loading: externalLoading = false }) => {
  const { token } = theme.useToken();
  const access = useAccess();
  const navigate = useNavigate();
  const intl = useIntl();
  const actionRef = useRef<any>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(false);

  const canAccessProject = access.canAccessPath('/project-management');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjectList({
        sortBy: 'createdAt',
        sortOrder: 'desc',
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

  useEffect(() => {
    if (!canAccessProject) return;
    fetchProjects();
  }, [canAccessProject]);

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

  const columns: ProColumns<ProjectDto>[] = [
    {
      title: intl.formatMessage({ id: 'pages.welcome.projectList.projectName' }),
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (_: ReactNode, record: ProjectDto) => (
        <Tooltip title={record.description}>
          <a
            onClick={() => navigate(`/project-management/project?projectId=${record.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <Text ellipsis strong>
              {record.name}
            </Text>
          </a>
        </Tooltip>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.welcome.projectList.status' }),
      dataIndex: 'statusName',
      key: 'status',
      width: '15%',
      render: (_: ReactNode, record: ProjectDto) => (
        <Tag color={getStatusColor(record.status)}>{record.statusName}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.welcome.projectList.priority' }),
      dataIndex: 'priority',
      key: 'priority',
      width: '12%',
      render: (_: ReactNode, record: ProjectDto) => (
        <Tag color={getPriorityColor(record.priority)}>{getPriorityText(record.priority)}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.welcome.projectList.progress' }),
      dataIndex: 'progress',
      key: 'progress',
      width: '20%',
      render: (_: ReactNode, record: ProjectDto) => (
        <Space style={{ width: '100%' }} size={4}>
          <Progress
            type="circle"
            percent={record.progress}
            size={32}
            strokeColor={record.progress === 100 ? token.colorSuccess : token.colorPrimary}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.progress}%
          </Text>
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
        <ProTable
          actionRef={actionRef}
          columns={columns}
          dataSource={projects}
          rowKey="id"
          search={false}
          pagination={false}
          options={false}
          toolBarRender={false}
          size="small"
          style={{ marginTop: '12px' }}
        />
      )}
    </Card>
  );
};

export default ProjectListCard;
