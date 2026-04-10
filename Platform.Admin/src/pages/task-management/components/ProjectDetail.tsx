import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Progress, Tabs, Space, Grid, Empty, Spin, Tooltip } from 'antd';
import { Drawer as AntDrawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';

const { useBreakpoint } = Grid;
import {
  ProjectOutlined,
  TeamOutlined,
  BarChartOutlined,
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
import dayjs from 'dayjs';

interface ProjectDetailProps {
  project: ProjectDto;
  onClose: () => void;
}

const CombinedTaskView: React.FC<{ tasks: TaskDto[] }> = ({ tasks }) => {
  const intl = useIntl();
  
  const flattenTasks = (taskList: TaskDto[]): TaskDto[] => {
    const result: TaskDto[] = [];
    const traverse = (ts: TaskDto[]) => { ts.forEach(t => { result.push(t); if (t.children?.length) traverse(t.children); }); };
    traverse(taskList);
    return result;
  };

  const allTasks = flattenTasks(tasks);
  const allDates: Date[] = [];
  allTasks.forEach(task => {
    if (task.plannedStartTime) allDates.push(new Date(task.plannedStartTime));
    if (task.plannedEndTime) allDates.push(new Date(task.plannedEndTime));
  });

  let minDate: Date, maxDate: Date, totalDays: number;
  if (!allDates.length) {
    const today = new Date();
    minDate = new Date(today); minDate.setDate(today.getDate() - 7);
    maxDate = new Date(today); maxDate.setDate(today.getDate() + 30);
    totalDays = 37;
  } else {
    minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const dayWidth = 35;
  const today = new Date();
  const todayOffset = Math.floor((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const renderTaskRow = (task: TaskDto, level: number) => {
    const hasTimeInfo = task.plannedStartTime && task.plannedEndTime;
    let taskStartOffset = 0, taskDuration = 0;

    if (hasTimeInfo) {
      const startDate = new Date(task.plannedStartTime!);
      const endDate = new Date(task.plannedEndTime!);
      taskStartOffset = Math.floor((startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      taskDuration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return (
      <React.Fragment key={task.id}>
        <tr style={{ backgroundColor: level > 0 ? '#fafafa' : '#fff' }}>
          <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', position: 'sticky', top: 0, left: 0, zIndex: 11, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: level * 20 }}>
              <span style={{ color: '#bfbfbf', fontSize: 10 }}>{level > 0 ? '└' : ''}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: level === 0 ? 600 : 400, color: '#262626', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>{task.taskName}</div>
                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                  <Tag color={getTaskStatusColor(task.status)} style={{ fontSize: 10, padding: '0 3px', margin: 0 }}>{task.statusName}</Tag>
                  {task.priorityName && <Tag color={getTaskPriorityColor(task.priority)} style={{ fontSize: 10, padding: '0 3px', margin: 0 }}>{task.priorityName}</Tag>}
                </div>
              </div>
            </div>
          </td>
          <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', position: 'sticky', top: 0, left: 200, zIndex: 11, width: 80 }}>
            <Progress percent={task.completionPercentage} size="small" style={{ margin: 0, width: 60 }} strokeColor={task.completionPercentage === 100 ? '#52c41a' : '#1890ff'} />
          </td>
          <td style={{ padding: 0, borderBottom: '1px solid #f0f0f0', position: 'relative', height: 48, minWidth: totalDays * dayWidth }}>
            {Array.from({ length: totalDays }).map((_, i) => {
              const date = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={i} style={{ position: 'absolute', left: i * dayWidth, top: 0, bottom: 0, width: dayWidth, backgroundColor: isWeekend ? '#fafafa' : isToday ? '#e6f7ff' : 'transparent', borderRight: '1px dashed #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#1890ff' }} />}
                </div>
              );
            })}
            {hasTimeInfo && (
              <Tooltip title={<div><div style={{ fontWeight: 600 }}>{task.taskName}</div><div>{dayjs(task.plannedStartTime).format('YYYY-MM-DD')} ~ {dayjs(task.plannedEndTime).format('YYYY-MM-DD')}</div><div>进度: {task.completionPercentage}%</div></div>}>
                <div style={{
                  position: 'absolute',
                  left: taskStartOffset * dayWidth + 2,
                  width: taskDuration * dayWidth - 4,
                  top: 8,
                  height: 32,
                  backgroundColor: task.completionPercentage === 100 ? 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)' : 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 500,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 2,
                }}>
                  {taskDuration >= 2 && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>{task.taskName}</span>}
                </div>
              </Tooltip>
            )}
          </td>
        </tr>
        {task.children?.length && task.children.map(child => renderTaskRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ position: 'relative', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', maxHeight: 500 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 8px', borderBottom: '2px solid #1890ff', borderRight: '1px solid #f0f0f0', backgroundColor: '#e6f7ff', textAlign: 'left', fontWeight: 600, color: '#1890ff', position: 'sticky', top: 0, left: 0, zIndex: 20, minWidth: 200 }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.table.taskName' })}</th>
              <th style={{ padding: '10px 8px', borderBottom: '2px solid #1890ff', borderRight: '1px solid #f0f0f0', backgroundColor: '#e6f7ff', fontWeight: 600, color: '#1890ff', position: 'sticky', top: 0, left: 200, zIndex: 20, width: 80 }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.table.progress' })}</th>
              <th style={{ padding: '10px 8px', borderBottom: '2px solid #1890ff', backgroundColor: '#e6f7ff', fontWeight: 600, color: '#1890ff', position: 'sticky', top: 0, zIndex: 10, minWidth: totalDays * dayWidth }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span>{dayjs(minDate).format('YYYY-MM-DD')}</span>
                  <span style={{ fontWeight: 400 }}>{totalDays}天</span>
                  <span>{dayjs(maxDate).format('YYYY-MM-DD')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>{tasks.map(task => renderTaskRow(task, 0))}</tbody>
        </table>
      </div>
    </div>
  );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loading, setLoading] = useState(false);

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
                {tasks.length > 0 ? (
                  <CombinedTaskView tasks={tasks} />
                ) : (
                  <Empty description={intl.formatMessage({ id: 'pages.projectManagement.taskTree.noTasks' })} />
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
