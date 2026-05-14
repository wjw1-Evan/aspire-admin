import { ProDescriptions } from '@ant-design/pro-components/es/descriptions';
import { useIntl } from '@umijs/max';
import { Drawer, Empty, Grid, Progress, Space, Spin, Tag, Tooltip } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

const { useBreakpoint } = Grid;

import { BarChartOutlined, ProjectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTaskTree, type TaskDto } from '@/services/task/api';
import { type ProjectDto, ProjectPriority, ProjectStatus } from '@/services/task/project';
import { getTaskPriorityColor, getTaskStatusColor } from '@/utils/task';

interface ProjectDetailProps {
  project: ProjectDto;
  onClose: () => void;
}

const CombinedTaskView: React.FC<{ tasks: TaskDto[] }> = ({ tasks }) => {
  const intl = useIntl();

  const flattenTasks = (taskList: TaskDto[]): TaskDto[] => {
    const result: TaskDto[] = [];
    const traverse = (ts: TaskDto[]) => {
      ts.forEach((t) => {
        result.push(t);
        if (t.children?.length) traverse(t.children);
      });
    };
    traverse(taskList);
    return result;
  };

  const allTasks = flattenTasks(tasks);
  const allDates: Date[] = [];
  allTasks.forEach((task) => {
    if (task.plannedStartTime) allDates.push(new Date(task.plannedStartTime));
    if (task.plannedEndTime) allDates.push(new Date(task.plannedEndTime));
  });

  let minDate: Date, maxDate: Date, totalDays: number;
  if (!allDates.length) {
    const today = new Date();
    minDate = new Date(today);
    minDate.setDate(today.getDate() - 7);
    maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    totalDays = 37;
  } else {
    minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const dayWidth = 35;
  const today = new Date();
  const _todayOffset = Math.floor((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const renderTaskRow = (task: TaskDto, level: number) => {
    const hasTimeInfo = task.plannedStartTime && task.plannedEndTime;
    let taskStartOffset = 0,
      taskDuration = 0;

    if (hasTimeInfo) {
      const startDate = new Date(task.plannedStartTime!);
      const endDate = new Date(task.plannedEndTime!);
      taskStartOffset = Math.floor((startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      taskDuration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return (
      <React.Fragment key={task.id}>
        <tr style={{ backgroundColor: level > 0 ? 'var(--ant-color-fill-tertiary)' : 'var(--ant-color-bg-container)' }}>
          <td
            style={{
              padding: '10px 8px',
              borderBottom: '1px solid #f0f0f0',
              borderRight: '1px solid #f0f0f0',
              backgroundColor: 'var(--ant-color-bg-container)',
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 11,
              minWidth: 280,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginLeft: level * 20 }}>
              <span style={{ color: '#bfbfbf', fontSize: 10, marginTop: 2 }}>{level > 0 ? '└' : ''}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: level === 0 ? 600 : 400,
                    color: '#262626',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: 13,
                  }}
                >
                  {task.taskName}
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
                  <Tag color={getTaskStatusColor(task.status)} style={{ fontSize: 10, padding: '0 3px', margin: 0 }}>
                    {task.statusName}
                  </Tag>
                  {task.priorityName && (
                    <Tag
                      color={getTaskPriorityColor(task.priority)}
                      style={{ fontSize: 10, padding: '0 3px', margin: 0 }}
                    >
                      {task.priorityName}
                    </Tag>
                  )}
                  {task.taskType && <Tag style={{ fontSize: 10, padding: '0 3px', margin: 0 }}>{task.taskType}</Tag>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginTop: 2, lineHeight: '18px' }}>
                  {task.assignedToName && <span>分配给: {task.assignedToName}</span>}
                </div>
              </div>
            </div>
          </td>
          <td
            style={{
              padding: '10px 8px',
              borderBottom: '1px solid #f0f0f0',
              borderRight: '1px solid #f0f0f0',
              backgroundColor: 'var(--ant-color-bg-container)',
              position: 'sticky',
              top: 0,
              left: 200,
              zIndex: 11,
              width: 80,
            }}
          >
            <Progress
              percent={task.completionPercentage}
              size="small"
              style={{ margin: 0, width: 60 }}
              strokeColor={task.completionPercentage === 100 ? '#52c41a' : '#1890ff'}
            />
          </td>
          <td
            style={{
              padding: 0,
              borderBottom: '1px solid #f0f0f0',
              position: 'relative',
              height: 48,
              minWidth: totalDays * dayWidth,
            }}
          >
            {Array.from({ length: totalDays }).map((_, i) => {
              const date = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: i * dayWidth,
                    top: 0,
                    bottom: 0,
                    width: dayWidth,
                    backgroundColor: isWeekend ? 'var(--ant-color-fill-tertiary)' : isToday ? 'var(--ant-color-primary-bg)' : 'var(--ant-color-fill-tertiary)',
                    borderRight: '1px solid #e8e8e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#ff4d4f' }} />}
                </div>
              );
            })}
            {hasTimeInfo && (
              <Tooltip
                title={
                  <div>
                    <div style={{ fontWeight: 600 }}>{task.taskName}</div>
                    <div>
                      {dayjs(task.plannedStartTime).format('YYYY-MM-DD')} ~{' '}
                      {dayjs(task.plannedEndTime).format('YYYY-MM-DD')}
                    </div>
                    <div>进度: {task.completionPercentage}%</div>
                  </div>
                }
              >
                <div
                  style={{
                    position: 'absolute',
                    left: taskStartOffset * dayWidth + 2,
                    width: taskDuration * dayWidth - 4,
                    top: 8,
                    height: 32,
                    backgroundColor: task.completionPercentage === 100 ? '#52c41a' : '#1677ff',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 500,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    zIndex: 2,
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {taskDuration >= 2 && (
                    <span
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}
                    >
                      {task.taskName}
                    </span>
                  )}
                </div>
              </Tooltip>
            )}
          </td>
        </tr>
        {task.children?.length && task.children.map((child) => renderTaskRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ position: 'relative', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', maxHeight: 500 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--ant-color-bg-container)' }}>
          <thead>
            <tr>
              <th
                style={{
                  padding: '10px 8px',
                  borderBottom: '2px solid #1890ff',
                  borderRight: '1px solid #f0f0f0',
                  backgroundColor: 'var(--ant-color-primary-bg)',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#1890ff',
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 20,
                  minWidth: 200,
                }}
              >
                {intl.formatMessage({ id: 'pages.project.gantt.table.taskName' })}
              </th>
              <th
                style={{
                  padding: '10px 8px',
                  borderBottom: '2px solid #1890ff',
                  borderRight: '1px solid #f0f0f0',
                  backgroundColor: 'var(--ant-color-primary-bg)',
                  fontWeight: 600,
                  color: '#1890ff',
                  position: 'sticky',
                  top: 0,
                  left: 200,
                  zIndex: 20,
                  width: 80,
                }}
              >
                {intl.formatMessage({ id: 'pages.project.gantt.table.progress' })}
              </th>
              <th
                style={{
                  padding: '10px 8px',
                  borderBottom: '2px solid #1890ff',
                  backgroundColor: 'var(--ant-color-primary-bg)',
                  fontWeight: 600,
                  color: '#1890ff',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  minWidth: totalDays * dayWidth,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span>{dayjs(minDate).format('YYYY-MM-DD')}</span>
                  <span style={{ fontWeight: 400 }}>
                    {totalDays}
                    {intl.formatMessage({ id: 'pages.taskManagement.timeUnit.days' })}
                  </span>
                  <span>{dayjs(maxDate).format('YYYY-MM-DD')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>{tasks.map((task) => renderTaskRow(task, 0))}</tbody>
        </table>
      </div>
    </div>
  );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  const intl = useIntl();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const loadTasks = useCallback(async () => {
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
  }, [project.id]);

  useEffect(() => {
    if (project.id) {
      loadTasks();
    }
  }, [project.id, loadTasks]);

  const statusMap: Record<number, { color: string; text: string }> = {
    [ProjectStatus.Planning]: { color: 'default', text: intl.formatMessage({ id: 'pages.project.status.planning' }) },
    [ProjectStatus.InProgress]: {
      color: 'processing',
      text: intl.formatMessage({ id: 'pages.project.status.inProgress' }),
    },
    [ProjectStatus.OnHold]: { color: 'warning', text: intl.formatMessage({ id: 'pages.project.status.onHold' }) },
    [ProjectStatus.Completed]: { color: 'success', text: intl.formatMessage({ id: 'pages.project.status.completed' }) },
    [ProjectStatus.Cancelled]: { color: 'error', text: intl.formatMessage({ id: 'pages.project.status.cancelled' }) },
  };

  const priorityMap: Record<number, { color: string; text: string }> = {
    [ProjectPriority.Low]: { color: 'default', text: intl.formatMessage({ id: 'pages.project.priority.low' }) },
    [ProjectPriority.Medium]: { color: 'blue', text: intl.formatMessage({ id: 'pages.project.priority.medium' }) },
    [ProjectPriority.High]: { color: 'red', text: intl.formatMessage({ id: 'pages.project.priority.high' }) },
  };

  const statusInfo = statusMap[project.status] || {
    color: 'default',
    text: intl.formatMessage({ id: 'pages.table.unknown' }),
  };
  const priorityInfo = priorityMap[project.priority] || {
    color: 'default',
    text: intl.formatMessage({ id: 'pages.table.unknown' }),
  };

  return (
    <Drawer
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
      <ProDescriptions column={isMobile ? 1 : 2} bordered style={{ marginBottom: 24 }}>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.name' })}>
          {project.name}
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.status' })}>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.priority' })}>
          <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.progress' })}>
          <Progress percent={project.progress} size="small" />
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.detail.budget' })}>
          {project.budget ? `¥${project.budget.toLocaleString()}` : '-'}
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.startDate' })} span={1}>
          {project.startDate || '-'}
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.endDate' })} span={1}>
          {project.endDate || '-'}
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.detail.description' })} span={2}>
          {project.description || '-'}
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.table.createdAt' })}>
          {project.createdAt}
        </ProDescriptions.Item>
        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.project.detail.createdBy' })}>
          {project.createdByName || '-'}
        </ProDescriptions.Item>
      </ProDescriptions>

      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 15, color: '#262626' }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        {intl.formatMessage({ id: 'pages.project.taskTree.title' })}
      </div>
      {project.id ? (
        <Spin spinning={tasksLoading}>
          {tasks.length > 0 ? (
            <CombinedTaskView tasks={tasks} />
          ) : (
            <Empty description={intl.formatMessage({ id: 'pages.project.taskTree.noTasks' })} />
          )}
        </Spin>
      ) : null}
    </Drawer>
  );
};

export default ProjectDetail;
