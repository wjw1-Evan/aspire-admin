import React, { useState, useEffect } from 'react';
import { Tag, Progress, Tabs, Space, Button, Grid } from 'antd';
import { Drawer as AntDrawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';

const { useBreakpoint } = Grid;
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
import ProjectMemberManagement from './ProjectMemberManagement';
import GanttChart from './GanttChart';

interface ProjectDetailProps {
  project: ProjectDto;
  onClose: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
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
    <AntDrawer
      title={
        <Space>
          <ProjectOutlined />
          {project.name}
        </Space>
      }
      open={true}
      onClose={() => onClose()}
      width={isMobile ? 'large' : 900}
    >
      <Tabs
        items={[
          {
            key: 'info',
            label: intl.formatMessage({ id: 'pages.projectManagement.detail.basicInfo' }),
            icon: <ProjectOutlined />,
            children: (
              <ProDescriptions column={isMobile ? 1 : 2} bordered>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.name' })}>{project.name}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.status' })}>
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.priority' })}>
                  <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.progress' })}>
                  <Progress percent={project.progress} size="small" />
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.manager' })}>
                  {project.managerName || '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.detail.budget' })}>
                  {project.budget ? `¥${project.budget.toLocaleString()}` : '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.startDate' })} span={1}>
                  {project.startDate || '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.endDate' })} span={1}>
                  {project.endDate || '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.detail.description' })} span={2}>
                  {project.description || '-'}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.table.createdAt' })}>
                  {project.createdAt}
                </ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.projectManagement.detail.createdBy' })}>
                  {project.createdByName || '-'}
                </ProDescriptions.Item>
              </ProDescriptions>
            ),
          },
          {
            key: 'tasks',
            label: intl.formatMessage({ id: 'pages.projectManagement.taskTree.title' }),
            icon: <BarChartOutlined />,
            children: project.id ? null : null,
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
    </AntDrawer>
  );
};

export default ProjectDetail;
