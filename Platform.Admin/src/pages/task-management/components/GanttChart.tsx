import React, { useState, useEffect } from 'react';
import { Card, Select, Space } from 'antd';
import { useIntl } from '@umijs/max';
import {
  getTasksByProjectId,
  getTaskTree,
  getCriticalPath,
  type TaskDto,
} from '@/services/task/api';
import { getProjectList, type ProjectDto } from '@/services/task/project';
import dayjs from 'dayjs';

interface GanttChartProps {
  projectId?: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ projectId: initialProjectId }) => {
  const intl = useIntl();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
      loadCriticalPath(selectedProjectId);
    } else {
      loadAllTasks();
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const response = await getProjectList({ page: 1, pageSize: 100 });
      if (response.success && response.data) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  };

  const loadTasks = async (projId: string) => {
    setLoading(true);
    try {
      const response = await getTasksByProjectId(projId);
      if (response.success && response.data) {
        console.log('加载的任务数据:', response.data);
        console.log('任务数量:', Array.isArray(response.data) ? response.data.length : '不是数组');
        setTasks(Array.isArray(response.data) ? response.data : []);
      } else {
        console.warn('加载任务失败:', response);
        setTasks([]);
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const response = await getTaskTree();
      if (response.success && response.data) {
        console.log('加载的任务树数据:', response.data);
        console.log('任务数量:', Array.isArray(response.data) ? response.data.length : '不是数组');
        setTasks(Array.isArray(response.data) ? response.data : []);
      } else {
        console.warn('加载任务树失败:', response);
        setTasks([]);
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCriticalPath = async (projId: string) => {
    try {
      const response = await getCriticalPath(projId);
      if (response.success && response.data) {
        setCriticalPath(response.data);
      }
    } catch (error) {
      console.error('加载关键路径失败:', error);
    }
  };

  // 扁平化任务树，收集所有任务（包括子任务）
  const flattenTasks = (taskList: TaskDto[]): TaskDto[] => {
    const result: TaskDto[] = [];
    const traverse = (tasks: TaskDto[]) => {
      tasks.forEach((task) => {
        result.push(task);
        if (task.children && task.children.length > 0) {
          traverse(task.children);
        }
      });
    };
    traverse(taskList);
    return result;
  };

  // 简化的甘特图渲染（使用表格形式）
  const renderGanttTable = () => {
    console.log('渲染甘特图，当前任务数量:', tasks.length);
    console.log('任务数据:', tasks);
    
    if (tasks.length === 0) {
      return <div style={{ textAlign: 'center', padding: '40px' }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.noTasks' })}</div>;
    }

    // 扁平化所有任务（包括子任务）
    const allTasks = flattenTasks(tasks);
    console.log('扁平化后的任务数量:', allTasks.length);

    // 计算时间范围（只考虑有时间信息的任务）
    const allDates: Date[] = [];
    allTasks.forEach((task) => {
      if (task.plannedStartTime) allDates.push(new Date(task.plannedStartTime));
      if (task.plannedEndTime) allDates.push(new Date(task.plannedEndTime));
    });

    // 如果没有时间信息，使用默认时间范围（当前日期前后30天）
    let minDate: Date;
    let maxDate: Date;
    let totalDays: number;

    if (allDates.length === 0) {
      const today = new Date();
      minDate = new Date(today);
      minDate.setDate(today.getDate() - 30);
      maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 30);
      totalDays = 60;
    } else {
      minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
      maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
      // 确保至少有一天的范围
      totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // 渲染任务行（递归）
    const renderTaskRow = (task: TaskDto, level: number = 0) => {
      const hasTimeInfo = task.plannedStartTime && task.plannedEndTime;
      const isCritical = criticalPath.includes(task.id || '');

      let startOffset = 0;
      let duration = 0;
      let taskWidth = '0%';
      let taskLeft = '0%';
      let minTaskWidth = 'auto';

      if (hasTimeInfo) {
        const startDate = new Date(task.plannedStartTime!);
        const endDate = new Date(task.plannedEndTime!);
        startOffset = Math.floor((startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        taskWidth = `${(duration / totalDays) * 100}%`;
        taskLeft = `${(startOffset / totalDays) * 100}%`;
        minTaskWidth = duration < 1 ? '2px' : 'auto';
      }

      return (
        <React.Fragment key={task.id}>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', paddingLeft: `${8 + level * 20}px`, backgroundColor: '#fff', position: 'sticky', left: 0, zIndex: 1 }}>
              {level > 0 && '└─ '}
              <span style={{ fontWeight: level === 0 ? '500' : 'normal' }}>{task.taskName}</span>
            </td>
            <td style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#fff', position: 'sticky', left: '200px', zIndex: 1 }}>
              <span style={{ color: task.completionPercentage === 100 ? '#52c41a' : task.completionPercentage > 0 ? '#1890ff' : '#8c8c8c' }}>
                {task.completionPercentage}%
              </span>
            </td>
            <td style={{ border: '1px solid #ddd', padding: '8px', position: 'relative', height: '40px', minWidth: `${Math.max(800, totalDays * 2)}px` }}>
              {hasTimeInfo ? (
                <div
                  style={{
                    position: 'absolute',
                    left: taskLeft,
                    width: taskWidth,
                    minWidth: minTaskWidth,
                    height: '28px',
                    backgroundColor: isCritical ? '#ff4d4f' : task.completionPercentage === 100 ? '#52c41a' : '#1890ff',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: isCritical ? 'bold' : 'normal',
                    boxShadow: isCritical ? '0 2px 4px rgba(255, 77, 79, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  title={`${task.taskName}\n${dayjs(task.plannedStartTime).format('YYYY-MM-DD')} - ${dayjs(task.plannedEndTime).format('YYYY-MM-DD')}\n${duration}天 | ${task.completionPercentage}%${isCritical ? ' | 关键路径' : ''}`}
                >
                  {duration >= 1 && <span>{duration}天</span>}
                </div>
              ) : (
                <div
                  style={{
                    padding: '4px 8px',
                    color: '#999',
                    fontSize: '12px',
                    fontStyle: 'italic',
                  }}
                >
                  未设置时间
                </div>
              )}
            </td>
          </tr>
          {task.children && task.children.length > 0 && task.children.map((child) => renderTaskRow(child, level + 1))}
        </React.Fragment>
      );
    };

    // 生成日期标签行
    const renderDateLabels = () => {
      const dateLabels: React.ReactElement[] = [];
      const daysToShow = Math.min(totalDays, 30); // 最多显示30个日期标签，避免过于拥挤
      const step = Math.max(1, Math.ceil(totalDays / daysToShow));
      
      for (let i = 0; i <= totalDays; i += step) {
        const date = new Date(minDate);
        date.setDate(date.getDate() + i);
        dateLabels.push(
          <th
            key={i}
            style={{
              border: '1px solid #ddd',
              padding: '4px',
              fontSize: '11px',
              textAlign: 'center',
              backgroundColor: '#f5f5f5',
            }}
          >
            {dayjs(date).format('MM-DD')}
          </th>
        );
      }
      return dateLabels;
    };

    return (
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', width: '200px', textAlign: 'left', backgroundColor: '#fafafa', position: 'sticky', left: 0, zIndex: 10 }}>
                {intl.formatMessage({ id: 'pages.projectManagement.gantt.table.taskName' })}
              </th>
              <th style={{ border: '1px solid #ddd', padding: '8px', width: '100px', backgroundColor: '#fafafa', position: 'sticky', left: '200px', zIndex: 10 }}>
                {intl.formatMessage({ id: 'pages.projectManagement.gantt.table.progress' })}
              </th>
              <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: `${Math.max(800, totalDays * 2)}px`, backgroundColor: '#fafafa' }}>
                {intl.formatMessage({ id: 'pages.projectManagement.gantt.table.timeline' })}
              </th>
            </tr>
            {totalDays <= 60 && (
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f5f5f5', position: 'sticky', left: 0, zIndex: 9 }}></th>
                <th style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f5f5f5', position: 'sticky', left: '200px', zIndex: 9 }}></th>
                <th colSpan={1} style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f5f5f5', fontSize: '11px', textAlign: 'center' }}>
                  {dayjs(minDate).format('YYYY-MM-DD')} 至 {dayjs(maxDate).format('YYYY-MM-DD')} ({totalDays}天)
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {tasks.map((task) => renderTaskRow(task, 0))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      {!initialProjectId && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span>{intl.formatMessage({ id: 'pages.projectManagement.gantt.selectProject' })}：</span>
            <Select
              placeholder={intl.formatMessage({ id: 'pages.projectManagement.gantt.allProjects' })}
              style={{ width: 200 }}
              value={selectedProjectId}
              onChange={(value) => {
                setSelectedProjectId(value);
              }}
              allowClear
            >
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Card>
      )}

      <Card title={intl.formatMessage({ id: 'pages.projectManagement.gantt.title' })} loading={loading}>
        {renderGanttTable()}
        {criticalPath.length > 0 && (
          <div style={{ marginTop: 16, padding: 8, backgroundColor: '#fff7e6', borderRadius: 4 }}>
            <strong>{intl.formatMessage({ id: 'pages.projectManagement.gantt.criticalPath' })}：</strong>
            {(() => {
              // 递归查找所有关键路径任务（包括子任务）
              const findCriticalTasks = (taskList: TaskDto[]): TaskDto[] => {
                const result: TaskDto[] = [];
                const traverse = (tasks: TaskDto[]) => {
                  tasks.forEach((task) => {
                    if (task.id && criticalPath.includes(task.id)) {
                      result.push(task);
                    }
                    if (task.children && task.children.length > 0) {
                      traverse(task.children);
                    }
                  });
                };
                traverse(taskList);
                return result;
              };
              const criticalTasks = findCriticalTasks(tasks);
              return criticalTasks.map((t) => t.taskName).join(' → ');
            })()}
          </div>
        )}
      </Card>
    </div>
  );
};

export default GanttChart;
