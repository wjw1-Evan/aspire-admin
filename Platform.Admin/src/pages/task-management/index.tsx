import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { ProColumns } from '@ant-design/pro-table';
import { PageContainer, ProDescriptions, ProCard } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Button, Tag, Space, Grid, App, Modal, Spin, Timeline, Empty, Progress, Input, Popconfirm } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ActionType } from '@ant-design/pro-table';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ReloadOutlined, PlayCircleOutlined, StopOutlined, SearchOutlined, ProjectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';
import { getTaskStatusColor, getTaskPriorityColor } from '@/utils/task';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { getTaskById, getTaskExecutionLogs, TaskStatus as TaskStatusEnum, type TaskDto, type TaskExecutionLogDto } from '@/services/task/api';
import { getProjectList } from '@/services/task/project';

import TaskForm from './components/TaskForm';
import TaskExecutionPanel from './components/TaskExecutionPanel';

const { useBreakpoint } = Grid;

// ==================== Types ====================
interface TaskStatistics {
  totalTasks: number; inProgressTasks: number; completedTasks: number; completionRate: number;
}

// ==================== API ====================
const api = {
  list: (params: any) =>
    request<ApiResponse<PagedResult<TaskDto>>>('/apiservice/api/task/query', { params }),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/task/${id}`, { method: 'DELETE' }),
  cancel: (id: string) => request<ApiResponse<void>>(`/apiservice/api/task/${id}/cancel`, { method: 'POST' }),
  statistics: () => request<ApiResponse<TaskStatistics>>('/apiservice/api/task/statistics'),
};

// ==================== Task Detail Component ====================
const TaskDetail: React.FC<{ id: string; onClose: () => void; open: boolean; isMobile: boolean }> = ({ id, onClose, open, isMobile }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDto | null>(null);
  const [executionLogs, setExecutionLogs] = useState<TaskExecutionLogDto[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (open && id) { loadTaskDetail(); loadExecutionLogs(); }
  }, [open, id]);

  const loadTaskDetail = async () => {
    setLoading(true);
    try {
      const response = await getTaskById(id);
      if (response.success && response.data) setTaskDetail(response.data);
    } catch { /* error handled silently */ } finally { setLoading(false); }
  };

  const loadExecutionLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await getTaskExecutionLogs(id, 1, 100);
      if (response.success && response.data?.queryable) setExecutionLogs(response.data.queryable);
    } catch { /* error handled silently */ } finally { setLogsLoading(false); }
  };

  const getExecutionResultColor = (result: number) => {
    if (result === 1) return 'success';
    if (result === 2) return 'error';
    if (result === 3 || result === 4) return 'warning';
    return 'default';
  };

  return (
    <Drawer title={intl.formatMessage({ id: 'pages.taskManagement.detail.title' })} placement="right" open={open} onClose={() => onClose()} size="large">
      <Spin spinning={loading}>
        {taskDetail ? (
          <>
            <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.detail.basicInfo' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.name' })} span={2}>{taskDetail.taskName}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.type' })}><Tag>{taskDetail.taskType}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.status' })}><Tag color={getTaskStatusColor(taskDetail.status)}>{taskDetail.statusName}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.priority' })}><Tag color={getTaskPriorityColor(taskDetail.priority)}>{taskDetail.priorityName}</Tag></ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.progress' })}>{taskDetail.completionPercentage}%</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.description' })} span={2}>{taskDetail.description || '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>

            <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.detail.assignment' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.createdBy' })}>{taskDetail.createdByName || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.createdAt' })}>{dayjs(taskDetail.createdAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.assignedTo' })}>{taskDetail.assignedToName || '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.assignedAt' })}>{taskDetail.assignedAt ? dayjs(taskDetail.assignedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>

            <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.detail.timeInfo' })} style={{ marginBottom: 16 }}>
              <ProDescriptions column={isMobile ? 1 : 2} size="small">
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.plannedStart' })}>{taskDetail.plannedStartTime ? dayjs(taskDetail.plannedStartTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.plannedEnd' })}>{taskDetail.plannedEndTime ? dayjs(taskDetail.plannedEndTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.actualStart' })}>{taskDetail.actualStartTime ? dayjs(taskDetail.actualStartTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.actualEnd' })}>{taskDetail.actualEndTime ? dayjs(taskDetail.actualEndTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.estimatedDuration' })}>{taskDetail.estimatedDuration ? `${taskDetail.estimatedDuration} 分钟` : '-'}</ProDescriptions.Item>
                <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.actualDuration' })}>{taskDetail.actualDuration ? `${taskDetail.actualDuration} 分钟` : '-'}</ProDescriptions.Item>
              </ProDescriptions>
            </ProCard>

            {taskDetail.participants && taskDetail.participants.length > 0 && (
              <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.detail.participants' })} style={{ marginBottom: 16 }}>
                <Space wrap>{taskDetail.participants.map(p => <Tag key={p.userId}>{p.username}</Tag>)}</Space>
              </ProCard>
            )}

            {taskDetail.tags && taskDetail.tags.length > 0 && (
              <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.table.tags' })} style={{ marginBottom: 16 }}>
                <Space wrap>{taskDetail.tags.map(t => <Tag key={t} color="blue">{t}</Tag>)}</Space>
              </ProCard>
            )}

            {taskDetail.remarks && (
              <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.table.remarks' })} style={{ marginBottom: 16 }}><p>{taskDetail.remarks}</p></ProCard>
            )}

            <ProCard title={intl.formatMessage({ id: 'pages.taskManagement.detail.executionLogs' })} loading={logsLoading}>
              {executionLogs.length > 0 ? (
                <Timeline items={executionLogs.map(log => ({
                  icon: <Tag color={getExecutionResultColor(log.status)}>{log.statusName}</Tag>,
                  content: (
                    <div>
                      <p><strong>{log.executedByName}</strong> 在 {dayjs(log.startTime).format('YYYY-MM-DD HH:mm:ss')} 执行</p>
                      {log.message && <p>消息: {log.message}</p>}
                      {log.message && <p style={{ color: 'red' }}>错误: {log.message}</p>}
                      <p>进度: {log.progressPercentage}%</p>
                    </div>
                  ),
                }))} />
              ) : <Empty description={intl.formatMessage({ id: 'pages.taskManagement.detail.noLogs' })} />}
            </ProCard>
          </>
        ) : <Empty description={intl.formatMessage({ id: 'pages.taskManagement.detail.notFound' })} />}
      </Spin>
    </Drawer>
  );
};

// ==================== Main ====================
const TaskManagement: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [state, setState] = useState({
    statistics: null as TaskStatistics | null,
    formVisible: false, detailVisible: false, executionVisible: false,
    editingTask: null as TaskDto | null, viewingTask: null as TaskDto | null,
    search: '',
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }), []);

  useEffect(() => {
    loadStatistics();
    getProjectList({ page: 1, pageSize: 100 }).then(r => { if (r.success && r.data) setProjects(r.data.queryable?.map(p => ({ id: p.id!, name: p.name })) || []); });
  }, [loadStatistics]);

  const columns: ProColumns<TaskDto>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.name' }), dataIndex: 'taskName', key: 'taskName', width: 200, sorter: true, render: (_: unknown, r: TaskDto) => <a onClick={() => set({ viewingTask: r, detailVisible: true })}>{r.taskName}</a> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.type' }), dataIndex: 'taskType', key: 'taskType', width: 100, sorter: true, render: (_: unknown, r: TaskDto) => r.taskType ? <Tag>{r.taskType}</Tag> : '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.projectName' }), dataIndex: 'projectName', key: 'projectName', width: 150, sorter: true, render: (_: unknown, r: TaskDto) => r.projectName || '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.status' }), dataIndex: 'statusName', key: 'status', width: 100, sorter: true, render: (_: unknown, r: TaskDto) => <Tag color={getTaskStatusColor(r.status)}>{r.statusName}</Tag> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.priority' }), dataIndex: 'priorityName', key: 'priority', width: 80, sorter: true, render: (_: unknown, r: TaskDto) => <Tag color={getTaskPriorityColor(r.priority)}>{r.priorityName}</Tag> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.progress' }), dataIndex: 'completionPercentage', key: 'completionPercentage', width: 120, sorter: true, render: (_: unknown, r: TaskDto) => <Progress percent={r.completionPercentage} size="small" status={r.completionPercentage === 100 ? 'success' : r.status === TaskStatusEnum.Failed ? 'exception' : 'active'} /> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.assignedTo' }), dataIndex: 'assignedToName', key: 'assignedTo', width: 100, sorter: true, render: (_: unknown, r: TaskDto) => r.assignedToName || '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.createdBy' }), dataIndex: 'createdByName', key: 'createdBy', width: 100, sorter: true, render: (_: unknown, r: TaskDto) => r.createdByName || '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.plannedEnd' }), dataIndex: 'plannedEndTime', key: 'plannedEndTime', width: 150, sorter: true, render: (_: unknown, r: TaskDto) => r.plannedEndTime ? dayjs(r.plannedEndTime).format('YYYY-MM-DD HH:mm') : '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', width: 150, sorter: true, render: (_: unknown, r: TaskDto) => r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm') : '-' },
    { title: intl.formatMessage({ id: 'pages.table.action' }), key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_: React.ReactNode, r: TaskDto) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingTask: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.action.edit' })}</Button>
        {r.status !== TaskStatusEnum.Completed && r.status !== TaskStatusEnum.Cancelled && (
          <>
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => set({ viewingTask: r, executionVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.action.execute' })}</Button>
            <Button type="link" size="small" icon={<StopOutlined />} onClick={() => {
              Modal.confirm({ title: intl.formatMessage({ id: 'pages.taskManagement.action.cancel' }), content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmCancel' }), onOk: () => api.cancel(r.id || '').then(res => { if (res.success) { message.success(intl.formatMessage({ id: 'pages.taskManagement.message.cancelSuccess' })); actionRef.current?.reload(); loadStatistics(); } else { message.error(getErrorMessage(res, 'pages.taskManagement.message.cancelFailed')); } }) });
            }}>{intl.formatMessage({ id: 'pages.taskManagement.action.cancel' })}</Button>
          </>
        )}
        <Popconfirm title={`确定删除任务「${r.taskName}」？`} onConfirm={() => api.delete(r.id || '').then(res => { if (res.success) { message.success(intl.formatMessage({ id: 'pages.taskManagement.message.deleteSuccess' })); actionRef.current?.reload(); loadStatistics(); } else { message.error(getErrorMessage(res, 'pages.taskManagement.message.deleteFailed')); } })}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.taskManagement.action.delete' })}</Button>
        </Popconfirm>
      </Space>
    )},
  ], [intl, message, loadStatistics]);

  return (
    <PageContainer>
      <ProTable actionRef={actionRef} request={async (params: any, sort: any, filter: any) => {
        const res = await api.list({ ...params, search: state.search, sort, filter });
        loadStatistics();
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        headerTitle={
          <Space size={24}>
            <Space><ProjectOutlined />任务管理</Space>
            <Space size={12}>
              <Tag color="blue">总数 {state.statistics?.totalTasks || 0}</Tag>
              <Tag color="orange">进行中 {state.statistics?.inProgressTasks || 0}</Tag>
              <Tag color="green">已完成 {state.statistics?.completedTasks || 0}</Tag>
              <Tag color="purple">完成率 {state.statistics?.completionRate ? `${state.statistics.completionRate.toFixed(1)}%` : '0%'}</Tag>
            </Space>
          </Space>
        }
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingTask: null, formVisible: true })}>新建任务</Button>,
        ]}
      />

      <TaskForm open={state.formVisible} task={state.editingTask} projects={projects}
        onClose={() => set({ formVisible: false, editingTask: null })}
        onSuccess={() => { set({ formVisible: false, editingTask: null }); actionRef.current?.reload(); loadStatistics(); }}
      />

      <TaskDetail id={state.viewingTask?.id || ''} open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingTask: null })} isMobile={isMobile} />

      <TaskExecutionPanel open={state.executionVisible} task={state.viewingTask}
        onClose={() => set({ executionVisible: false, viewingTask: null })}
        onSuccess={() => { set({ executionVisible: false, viewingTask: null }); actionRef.current?.reload(); loadStatistics(); }}
      />
    </PageContainer>
  );
};

export default TaskManagement;
