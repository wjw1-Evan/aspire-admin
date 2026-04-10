import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Progress, Tabs, Space, Grid, Empty, Spin, Segmented, Collapse } from 'antd';
import { Drawer as AntDrawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';

const { useBreakpoint } = Grid;
import {
  ProjectOutlined,
  TeamOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  getProjectMembers,
  type ProjectDto,
  type ProjectMemberDto,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import { getTaskTree, type TaskDto } from '@/services/task/api';
import { getTaskStatusColor, getTaskPriorityColor } from '@/utils/task';
import ProjectMemberManagement from './ProjectMemberManagement';
import GanttChart from './GanttChart';
import dayjs from 'dayjs';

interface ProjectDetailProps {
  project: ProjectDto;
  onClose: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<'gantt' | 'tree'>('gantt');

  useEffect(() => {
    if (project.id) {
      loadMembers();
      loadTasks();
    }
  }, [project.id]);

  const loadMembers = async () => {
    if (!project.id) return;
    setLoading(true);
    try {
      const response = await getProjectMembers(project.id);
      if (response.success && response.data) {
        setMembers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('获取项目成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!project.id) return;
    setTasksLoading(true);
    try {
      const response = await getTaskTree(project.id);
      if (response.success && response.data && Array.isArray(response.data)) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const taskTreeData = useMemo(() => {
    return tasks;
  }, [tasks]);

  const renderTreeNode = (task: TaskDto, level: number) => {
    return (
      <div key={task.id} style={{ marginBottom: 8 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: level === 0 ? '#fafafa' : '#fff',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
          marginLeft: level * 24,
        }}>
          <Space style={{ flex: 1 }}>
            <span style={{ color: '#bfbfbf', fontSize: 10 }}>{'>'}</span>
            <span style={{ fontWeight: level === 0 ? 600 : 400, minWidth: 150 }}>{task.taskName}</span>
            <Tag color={getTaskStatusColor(task.status)} style={{ margin: 0 }}>{task.statusName}</Tag>
            <Tag color={getTaskPriorityColor(task.priority)} style={{ margin: 0 }}>{task.priorityName}</Tag>
            <span style={{ color: task.completionPercentage === 100 ? '#52c41a' : '#8c8c8c', fontSize: 12 }}>{task.completionPercentage}%</span>
            {task.plannedStartTime && (
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                {dayjs(task.plannedStartTime).format('MM-DD')} ~ {task.plannedEndTime ? dayjs(task.plannedEndTime).format('MM-DD') : '-'}
              </span>
            )}
          </Space>
        </div>
        {task.children && task.children.length > 0 && (
          task.children.map((child: TaskDto) => renderTreeNode(child, level + 1))
        )}
      </div>
    );
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
            children: project.id ? (
              <Spin spinning={tasksLoading}>
                <div style={{ marginBottom: 16 }}>
                  <Segmented
                    value={taskViewMode}
                    onChange={(value) => setTaskViewMode(value as 'gantt' | 'tree')}
                    options={[
                      { value: 'gantt', label: intl.formatMessage({ id: 'pages.projectManagement.gantt.title' }), icon: <BarChartOutlined /> },
                      { value: 'tree', label: intl.formatMessage({ id: 'pages.projectManagement.taskTree.view' }), icon: <UnorderedListOutlined /> },
                    ]}
                  />
                </div>
                {taskViewMode === 'gantt' ? (
                  <GanttChart projectId={project.id} />
                ) : (
                  taskTreeData.length > 0 ? (
                    <div style={{ padding: '8px 0' }}>
                      {taskTreeData.map(item => renderTreeNode(item, 0))}
                    </div>
                  ) : (
                    <Empty description={intl.formatMessage({ id: 'pages.projectManagement.taskTree.noTasks' })} />
                  )
                )}
              </Spin>
            ) : null,
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
