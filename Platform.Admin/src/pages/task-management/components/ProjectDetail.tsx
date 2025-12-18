import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tag, Progress, Tabs, Space, Button } from 'antd';
import { useIntl } from '@umijs/max';
import {
  ProjectOutlined,
  TeamOutlined,
  FlagOutlined,
  BarChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import {
  getProjectMembers,
  type ProjectDto,
  type ProjectMemberDto,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import TaskTree from './TaskTree';
import ProjectMemberManagement from './ProjectMemberManagement';
import GanttChart from './GanttChart';

interface ProjectDetailProps {
  project: ProjectDto;
  onClose: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  const intl = useIntl();
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project.id) {
      loadMembers();
    }
  }, [project.id]);

  const loadMembers = async () => {
    if (!project.id) return;
    setLoading(true);
    try {
      const response = await getProjectMembers(project.id);
      if (response.success && response.data) {
        // response.data 已经是数组
        setMembers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('获取项目成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    [ProjectStatus.Planning]: { color: 'default', text: intl.formatMessage({ id: 'pages.projectManagement.status.planning' }) },
    [ProjectStatus.InProgress]: { color: 'processing', text: intl.formatMessage({ id: 'pages.projectManagement.status.inProgress' }) },
    [ProjectStatus.OnHold]: { color: 'warning', text: intl.formatMessage({ id: 'pages.projectManagement.status.onHold' }) },
    [ProjectStatus.Completed]: { color: 'success', text: intl.formatMessage({ id: 'pages.projectManagement.status.completed' }) },
    [ProjectStatus.Cancelled]: { color: 'error', text: intl.formatMessage({ id: 'pages.projectManagement.status.cancelled' }) },
  };

  const priorityMap: Record<number, { color: string; text: string }> = {
    [ProjectPriority.Low]: { color: 'default', text: intl.formatMessage({ id: 'pages.projectManagement.priority.low' }) },
    [ProjectPriority.Medium]: { color: 'blue', text: intl.formatMessage({ id: 'pages.projectManagement.priority.medium' }) },
    [ProjectPriority.High]: { color: 'red', text: intl.formatMessage({ id: 'pages.projectManagement.priority.high' }) },
  };

  const statusInfo = statusMap[project.status] || { color: 'default', text: intl.formatMessage({ id: 'pages.table.unknown' }) };
  const priorityInfo = priorityMap[project.priority] || { color: 'default', text: intl.formatMessage({ id: 'pages.table.unknown' }) };

  return (
    <Drawer
      title={
        <Space>
          <ProjectOutlined />
          {project.name}
        </Space>
      }
      open={true}
      onClose={onClose}
      size={1400}
    >
      <Tabs
        items={[
          {
            key: 'info',
            label: intl.formatMessage({ id: 'pages.projectManagement.detail.basicInfo' }),
            icon: <ProjectOutlined />,
            children: (
              <Descriptions column={2} bordered>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.name' })}>{project.name}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.status' })}>
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.priority' })}>
                  <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.progress' })}>
                  <Progress percent={project.progress} size="small" />
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.manager' })}>
                  {project.managerName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.detail.budget' })}>
                  {project.budget ? `¥${project.budget.toLocaleString()}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.startDate' })} span={1}>
                  {project.startDate || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.endDate' })} span={1}>
                  {project.endDate || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.detail.description' })} span={2}>
                  {project.description || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.createdAt' })}>
                  {project.createdAt}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.detail.createdBy' })}>
                  {project.createdByName || '-'}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'tasks',
            label: intl.formatMessage({ id: 'pages.projectManagement.taskTree.title' }),
            icon: <BarChartOutlined />,
            children: project.id ? <TaskTree projectId={project.id} /> : null,
          },
          {
            key: 'gantt',
            label: intl.formatMessage({ id: 'pages.projectManagement.gantt.title' }),
            icon: <LineChartOutlined />,
            children: project.id ? <GanttChart projectId={project.id} /> : null,
          },
          {
            key: 'members',
            label: intl.formatMessage({ id: 'pages.projectManagement.members.title' }),
            icon: <TeamOutlined />,
            children: project.id ? (
              <ProjectMemberManagement
                projectId={project.id}
                members={members}
                onRefresh={loadMembers}
              />
            ) : null,
          },
        ]}
      />
    </Drawer>
  );
};

export default ProjectDetail;
