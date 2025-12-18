import React, { useState, useEffect } from 'react';
import { Card, Select, Space, Button, message } from 'antd';
import { ReloadOutlined, ProjectOutlined } from '@ant-design/icons';
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
        setTasks(response.data);
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const response = await getTaskTree();
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
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
    if (tasks.length === 0) {
      return <div style={{ textAlign: 'center', padding: '40px' }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.noTasks' })}</div>;
    }

    // 扁平化所有任务（包括子任务）
    const allTasks = flattenTasks(tasks);

    // 计算时间范围
    const allDates: Date[] = [];
    allTasks.forEach((task) => {
      if (task.plannedStartTime) allDates.push(new Date(task.plannedStartTime));
      if (task.plannedEndTime) allDates.push(new Date(task.plannedEndTime));
    });

    if (allDates.length === 0) {
      return <div style={{ textAlign: 'center', padding: '40px' }}>{intl.formatMessage({ id: 'pages.projectManagement.gantt.noTimeInfo' })}</div>;
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    // 渲染任务行（递归）
    const renderTaskRow = (task: TaskDto, level: number = 0) => {
      if (!task.plannedStartTime || !task.plannedEndTime) return null;

      const startDate = new Date(task.plannedStartTime);
      const endDate = new Date(task.plannedEndTime);
      const startOffset = Math.floor((startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const isCritical = criticalPath.includes(task.id || '');

      return (
        <React.Fragment key={task.id}>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', paddingLeft: `${8 + level * 20}px` }}>
              {level > 0 && '└─ '}
              {task.taskName}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
              {task.completionPercentage}%
            </td>
            <td style={{ border: '1px solid #ddd', padding: '8px', position: 'relative', height: '40px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${(startOffset / totalDays) * 100}%`,
                  width: `${(duration / totalDays) * 100}%`,
                  height: '24px',
                  backgroundColor: isCritical ? '#ff4d4f' : task.completionPercentage === 100 ? '#52c41a' : '#1890ff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: isCritical ? 'bold' : 'normal',
                }}
                title={`${dayjs(task.plannedStartTime).format('YYYY-MM-DD')} - ${dayjs(task.plannedEndTime).format('YYYY-MM-DD')}`}
              >
                {duration}天
              </div>
            </td>
          </tr>
          {task.children && task.children.length > 0 && task.children.map((child) => renderTaskRow(child, level + 1))}
        </React.Fragment>
      );
    };

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '200px', textAlign: 'left' }}>
                {intl.formatMessage({ id: 'pages.projectManagement.gantt.table.taskName' })}
              </th>
              <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: '100px' }}>
                {intl.formatMessage({ id: 'pages.projectManagement.gantt.table.progress' })}
              </th>
              <th style={{ border: '1px solid #ddd', padding: '8px', minWidth: `${Math.max(800, totalDays * 2)}px` }}>
                {intl.formatMessage({ id: 'pages.projectManagement.gantt.table.timeline' })}
              </th>
            </tr>
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
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (selectedProjectId) {
                  loadTasks(selectedProjectId);
                  loadCriticalPath(selectedProjectId);
                } else {
                  loadAllTasks();
                }
              }}
            >
              {intl.formatMessage({ id: 'pages.button.refresh' })}
            </Button>
          </Space>
        </Card>
      )}

      {initialProjectId && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (selectedProjectId) {
                  loadTasks(selectedProjectId);
                  loadCriticalPath(selectedProjectId);
                }
              }}
            >
              {intl.formatMessage({ id: 'pages.button.refresh' })}
            </Button>
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
