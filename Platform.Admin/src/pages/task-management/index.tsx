import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { ProColumns } from '@ant-design/pro-table';
import { PageContainer, StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Button, Tag, Space, Card, Row, Col, Grid, App, Progress, Drawer } from 'antd';
import { ProTable, ActionType } from '@ant-design/pro-table';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ReloadOutlined, PlayCircleOutlined, StopOutlined, TeamOutlined, UnorderedListOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types/api-response';
import { getTaskStatusColor, getTaskPriorityColor } from '@/utils/task';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import TaskExecutionPanel from './components/TaskExecutionPanel';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';

const { useBreakpoint } = Grid;

// ==================== Types ====================
interface TaskDto {
  id?: string; taskName: string; description?: string; taskType?: string;
  status?: number; statusName?: string; priority?: number; priorityName?: string;
  completionPercentage?: number; assignedTo?: string; assignedToName?: string;
  createdByName?: string; plannedEndTime?: string; createdAt?: string;
  projectId?: string; projectName?: string; tags?: string[];
  participantIds?: string[]; participants?: { userId: string; username: string }[];
  assignedAt?: string; actualStartTime?: string; actualEndTime?: string;
  estimatedDuration?: number; actualDuration?: number; remarks?: string;
  parentTaskId?: string;
}
interface TaskStatistics {
  totalTasks: number; inProgressTasks: number; completedTasks: number; completionRate: number;
}
interface TaskFormData {
  taskName: string; description?: string; taskType: string | string[];
  priority?: number; assignedUserIds?: string[]; participantIds?: string[];
  plannedStartTime?: string; plannedEndTime?: string; estimatedDuration?: number;
  tags?: string[]; remarks?: string; projectId?: string; parentTaskId?: string;
}

// ==================== API ====================
const api = {
  list: (params: PageParams & { status?: number; priority?: number; assignedTo?: string; taskType?: string; projectId?: string }) =>
    request<ApiResponse<PagedResult<TaskDto>>>('/api/task/list', { params }),
  get: (id: string) => request<ApiResponse<TaskDto>>(`/api/task/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/api/task/${id}`, { method: 'DELETE' }),
  cancel: (id: string) => request<ApiResponse<void>>(`/api/task/${id}/cancel`, { method: 'POST' }),
  statistics: () => request<ApiResponse<TaskStatistics>>('/api/task/statistics'),
  getProjectList: (params: PageParams) => request<ApiResponse<PagedResult<{ id: string; name: string }>>>('/api/project/list', { params }),
};

// ==================== Constants ====================
const TaskStatus = { Pending: 0, Assigned: 1, InProgress: 2, Completed: 3, Cancelled: 4, Failed: 5, Paused: 6 };
const TaskPriority = { Low: 0, Medium: 1, High: 2, Urgent: 3 };

// ==================== Main ====================
const TaskManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const [state, setState] = useState({
    statistics: null as TaskStatistics | null,
    formVisible: false, detailVisible: false, executionVisible: false,
    editingTask: null as TaskDto | null, viewingTask: null as TaskDto | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    searchText: '',
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

  useEffect(() => {
    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
    api.getProjectList({ page: 1, pageSize: 1000 }).then(r => { if (r.success && r.data) setProjects(r.data.queryable || []); });
  }, []);

  const columns: ProColumns<TaskDto>[] = useMemo(() => [
    { title: '任务名称', dataIndex: 'taskName', key: 'taskName', width: 200, render: (_: any, r: TaskDto) => <a onClick={() => set({ viewingTask: r, detailVisible: true })}>{r.taskName}</a> },
    { title: '任务类型', dataIndex: 'taskType', key: 'taskType', width: 100, render: (t: string) => t ? <Tag>{t}</Tag> : '-' },
    { title: '项目名称', dataIndex: 'projectName', key: 'projectName', width: 150, render: (t: string) => t || '-' },
    { title: '状态', dataIndex: 'statusName', key: 'status', width: 100, filters: [
      { text: '待处理', value: TaskStatus.Pending }, { text: '已分配', value: TaskStatus.Assigned },
      { text: '进行中', value: TaskStatus.InProgress }, { text: '已完成', value: TaskStatus.Completed },
      { text: '已取消', value: TaskStatus.Cancelled }, { text: '失败', value: TaskStatus.Failed }, { text: '已暂停', value: TaskStatus.Paused },
    ], onFilter: (v, r) => r.status === v, render: (_: any, r: TaskDto) => <Tag color={getTaskStatusColor(r.status)}>{r.statusName}</Tag> },
    { title: '优先级', dataIndex: 'priorityName', key: 'priority', width: 80, filters: [
      { text: '低', value: TaskPriority.Low }, { text: '中', value: TaskPriority.Medium },
      { text: '高', value: TaskPriority.High }, { text: '紧急', value: TaskPriority.Urgent },
    ], onFilter: (v, r) => r.priority === v, render: (_: any, r: TaskDto) => <Tag color={getTaskPriorityColor(r.priority)}>{r.priorityName}</Tag> },
    { title: '进度', dataIndex: 'completionPercentage', key: 'completionPercentage', width: 120, render: (_: any, r: TaskDto) => <Progress percent={r.completionPercentage} size="small" status={r.completionPercentage === 100 ? 'success' : r.status === TaskStatus.Failed ? 'exception' : 'active'} /> },
    { title: '分配给', dataIndex: 'assignedToName', key: 'assignedTo', width: 100, render: (_: any, r: TaskDto) => r.assignedToName || '-' },
    { title: '创建者', dataIndex: 'createdByName', key: 'createdBy', width: 100, render: (_: any, r: TaskDto) => r.createdByName || '-' },
    { title: '计划完成', dataIndex: 'plannedEndTime', key: 'plannedEndTime', width: 150, render: (_: any, r: TaskDto) => r.plannedEndTime ? dayjs(r.plannedEndTime).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, sorter: true, render: (_: any, r: TaskDto) => r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '操作', key: 'action', width: 200, fixed: 'right', valueType: 'option', render: (_: any, r: TaskDto) => [
      <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingTask: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.action.edit' })}</Button>,
      r.status !== TaskStatus.Completed && r.status !== TaskStatus.Cancelled && (
        <Space key="exec" size={4}>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => set({ viewingTask: r, executionVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.action.execute' })}</Button>
          <Button type="link" size="small" icon={<StopOutlined />} onClick={() => {
            const task = r;
            message.warning('确认取消此任务?').then(() => api.cancel(task.id || '').then(res => { if (res.success) { message.success('任务已取消'); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); } }));
          }}>{intl.formatMessage({ id: 'pages.taskManagement.action.cancel' })}</Button>
        </Space>
      ),
      <Button key="delete" type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
        const task = r;
        message.warning('确认删除此任务?').then(() => api.delete(task.id || '').then(res => { if (res.success) { message.success('删除成功'); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); } }));
      }}>{intl.formatMessage({ id: 'pages.taskManagement.action.delete' })}</Button>,
    ]},
  ], [intl]);

  const statsConfig = [
    { title: '总任务数', key: 'totalTasks', icon: <TeamOutlined />, color: '#1890ff' },
    { title: '进行中', key: 'inProgressTasks', icon: <PlayCircleOutlined />, color: '#1890ff' },
    { title: '已完成', key: 'completedTasks', icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: '完成率', key: 'completionRate', suffix: '%', icon: <ReloadOutlined />, color: '#faad14' },
  ];

  return (
    <PageContainer title={<Space><UnorderedListOutlined />{intl.formatMessage({ id: 'pages.taskManagement.title' })}</Space>}
      extra={<Space wrap>
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); actionRef.current?.reload(); }}>{intl.formatMessage({ id: 'pages.taskManagement.refresh' })}</Button>
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingTask: null, formVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.createTask' })}</Button>
      </Space>}
    >
      {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>
        {statsConfig.map(i => <Col xs={24} sm={12} md={6} key={i.key}><StatCard title={i.title} value={i.key === 'completionRate' ? state.statistics![i.key as keyof TaskStatistics]?.toFixed(1) : state.statistics![i.key as keyof TaskStatistics] as number} suffix={i.suffix} icon={i.icon} color={i.color} /></Col>)}
      </Row></Card>}

      <ProTable actionRef={actionRef} request={async (params: any) => {
        const { pageSize, current } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await api.list({ page: current, pageSize, search: state.searchText, ...sortParams });
        api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [<Button key="refresh" icon={<ReloadOutlined />} onClick={() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); actionRef.current?.reload(); }}>刷新</Button>]}
      />

      <TaskForm open={state.formVisible} task={state.editingTask} projects={projects}
        onClose={() => set({ formVisible: false, editingTask: null })}
        onSuccess={() => { set({ formVisible: false, editingTask: null }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}
      />

      <Drawer title="任务详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingTask: null })} size={typeof window !== 'undefined' && window.innerWidth < 768 ? 'large' : 800}>
        <TaskDetail id={state.viewingTask?.id || ''} />
      </Drawer>

      <TaskExecutionPanel open={state.executionVisible} task={state.viewingTask}
        onClose={() => set({ executionVisible: false, viewingTask: null })}
        onSuccess={() => { set({ executionVisible: false, viewingTask: null }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }}
      />
    </PageContainer>
  );
};

export default TaskManagement;