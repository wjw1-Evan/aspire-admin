import React, { useState, useEffect } from 'react';
import { Select, Space, Progress, Tag, Tooltip, Empty } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { getTasksByProjectId, getTaskTree, getCriticalPath, type TaskDto } from '@/services/task/api';
import { getProjectList, type ProjectDto } from '@/services/task/project';
import { getTaskStatusColor, getTaskPriorityColor } from '@/utils/task';
import dayjs from 'dayjs';

interface GanttChartProps { projectId?: string; }

const GanttChart: React.FC<GanttChartProps> = ({ projectId: initialProjectId }) => {
  const intl = useIntl();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => {
    if (selectedProjectId) { loadTasks(selectedProjectId); loadCriticalPath(selectedProjectId); }
    else { loadAllTasks(); }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const response = await getProjectList({});
      if (response.success && response.data) setProjects(response.data.queryable);
    } catch (error) { console.error('加载项目列表失败:', error); }
  };

  const loadTasks = async (projId: string) => {
    setLoading(true);
    try {
      const response = await getTasksByProjectId(projId);
      setTasks(response.success && response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) { console.error('加载任务列表失败:', error); setTasks([]); }
    finally { setLoading(false); }
  };

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const response = await getTaskTree();
      setTasks(response.success && response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) { console.error('加载任务树失败:', error); setTasks([]); }
    finally { setLoading(false); }
  };

  const loadCriticalPath = async (projId: string) => {
    try {
      const response = await getCriticalPath(projId);
      if (response.success && response.data) setCriticalPath(response.data);
    } catch (error) { console.error('加载关键路径失败:', error); }
  };

  const flattenTasks = (taskList: TaskDto[]): TaskDto[] => {
    const result: TaskDto[] = [];
    const traverse = (tasks: TaskDto[]) => { tasks.forEach(task => { result.push(task); if (task.children?.length) traverse(task.children); }); };
    traverse(taskList);
    return result;
  };

  const getStatusColor = (status: number) => {
    const colors: Record<number, string> = { 0: '#d9d9d9', 1: '#1890ff', 2: '#faad14', 3: '#52c41a', 4: '#ff4d4f', 5: '#ff4d4f', 6: '#faad14' };
    return colors[status] || '#d9d9d9';
  };

  const renderGanttTable = () => {
    if (!tasks.length) return <Empty description={intl.formatMessage({ id: 'pages.projectManagement.gantt.noTasks' })} />;

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

    const dayWidth = 40;
    const today = new Date();
    const todayOffset = Math.floor((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    const renderTaskRow = (task: TaskDto, level = 0) => {
      const hasTimeInfo = task.plannedStartTime && task.plannedEndTime;
      const isCritical = criticalPath.includes(task.id || '');
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
            <td style={{ padding: '12px 8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', position: 'sticky', left: 0, zIndex: 1, minWidth: 250 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {level > 0 && <span style={{ color: '#bfbfbf', fontSize: 10 }}>└</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: level === 0 ? 600 : 400, color: '#262626', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.taskName}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <Tag color={getStatusColor(task.status)} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>{task.statusName}</Tag>
                    {task.priorityName && <Tag color={getTaskPriorityColor(task.priority)} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>{task.priorityName}</Tag>}
                  </div>
                </div>
              </div>
            </td>
            <td style={{ padding: '12px 8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', position: 'sticky', left: 250, zIndex: 1, width: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Progress percent={task.completionPercentage} size="small" style={{ margin: 0, width: 60 }} strokeColor={task.completionPercentage === 100 ? '#52c41a' : '#1890ff'} />
              </div>
            </td>
            <td style={{ padding: 0, borderBottom: '1px solid #f0f0f0', position: 'relative', height: 52, minWidth: totalDays * dayWidth }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const date = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <div key={i} style={{ position: 'absolute', left: i * dayWidth, top: 0, bottom: 0, width: dayWidth, backgroundColor: isWeekend ? '#f5f5f5' : i === todayOffset ? '#e6f7ff' : 'transparent', borderRight: '1px dashed #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {date.getDate() === 1 || date.getDate() === 15 || i === 0 || i === totalDays - 1 ? <span style={{ fontSize: 10, color: '#8c8c8c' }}>{date.getDate()}日</span> : null}
                    {isToday && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#1890ff', marginTop: 2 }} />}
                  </div>
                );
              })}
              {hasTimeInfo && (
                <Tooltip title={<div><div style={{ fontWeight: 600 }}>{task.taskName}</div><div>{dayjs(task.plannedStartTime).format('YYYY-MM-DD')} ~ {dayjs(task.plannedEndTime).format('YYYY-MM-DD')}</div><div>进度: {task.completionPercentage}% {isCritical && '| 关键路径'}</div></div>}>
                  <div style={{
                    position: 'absolute',
                    left: taskStartOffset * dayWidth + 2,
                    width: taskDuration * dayWidth - 4,
                    top: 10,
                    height: 32,
                    backgroundColor: isCritical ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)' : task.completionPercentage === 100 ? 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)' : 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 500,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: 2,
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
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 8px', borderBottom: '2px solid #1890ff', borderRight: '1px solid #f0f0f0', backgroundColor: '#e6f7ff', textAlign: 'left', fontWeight: 600, color: '#1890ff', position: 'sticky', left: 0, zIndex: 10, minWidth: 250 }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.table.taskName' })}</th>
              <th style={{ padding: '12px 8px', borderBottom: '2px solid #1890ff', borderRight: '1px solid #f0f0f0', backgroundColor: '#e6f7ff', fontWeight: 600, color: '#1890ff', position: 'sticky', left: 250, zIndex: 10, width: 120 }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.table.progress' })}</th>
              <th style={{ padding: '12px 8px', borderBottom: '2px solid #1890ff', backgroundColor: '#e6f7ff', fontWeight: 600, color: '#1890ff', minWidth: totalDays * dayWidth }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{dayjs(minDate).format('YYYY-MM-DD')}</span>
                  <span style={{ fontSize: 12, fontWeight: 400 }}>共 {totalDays} 天</span>
                  <span>{dayjs(maxDate).format('YYYY-MM-DD')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>{tasks.map(task => renderTaskRow(task, 0))}</tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {!initialProjectId && (
        <ProCard style={{ marginBottom: 16, borderRadius: 8 }}>
          <Space>
            <span style={{ fontWeight: 500 }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.selectProject' })}：</span>
            <Select
              placeholder={intl.formatMessage({ id: 'pages.projectManagement.gantt.allProjects' })}
              style={{ width: 220 }}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {projects.map(project => <Select.Option key={project.id} value={project.id}>{project.name}</Select.Option>)}
            </Select>
          </Space>
        </ProCard>
      )}
      <ProCard loading={loading} style={{ borderRadius: 8 }}>
        {renderGanttTable()}
        {criticalPath.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: 'linear-gradient(90deg, #fff7e6 0%, #fffbe6 100%)', borderRadius: 8, border: '1px solid #ffe7ba' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <strong style={{ color: '#d46b08' }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.criticalPath' })}</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(() => {
                const findCriticalTasks = (taskList: TaskDto[]): TaskDto[] => {
                  const result: TaskDto[] = [];
                  const traverse = (tasks: TaskDto[]) => { tasks.forEach(task => { if (task.id && criticalPath.includes(task.id)) result.push(task); if (task.children?.length) traverse(task.children); }); };
                  traverse(taskList); return result;
                };
                return findCriticalTasks(tasks).map((t, i) => (
                  <React.Fragment key={t.id}>
                    <Tag color="red" style={{ fontWeight: 500 }}>{t.taskName}</Tag>
                    {i < findCriticalTasks(tasks).length - 1 && <span style={{ color: '#ff4d4f' }}>→</span>}
                  </React.Fragment>
                ));
              })()}
            </div>
          </div>
        )}
      </ProCard>
    </div>
  );
};

export default GanttChart;