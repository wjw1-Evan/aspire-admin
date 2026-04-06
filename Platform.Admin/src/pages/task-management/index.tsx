import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { ProColumns } from '@ant-design/pro-table';
import { PageContainer, StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Button, Tag, Space, Card, Row, Col, Grid, App, Modal, Progress, Drawer, Descriptions, Spin, Timeline, Empty, Avatar } from 'antd';
import { ProTable, ActionType } from '@ant-design/pro-table';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ReloadOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import { getTaskStatusColor, getTaskPriorityColor } from '@/utils/task';
import { getTaskById, getTaskExecutionLogs, TaskStatus as TaskStatusEnum, type TaskDto, type TaskExecutionLogDto } from '@/services/task/api';
import TaskForm from './components/TaskForm';
import TaskExecutionPanel from './components/TaskExecutionPanel';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';

const { useBreakpoint } = Grid;

// ==================== Types ====================
interface TaskStatistics {
  totalTasks: number; inProgressTasks: number; completedTasks: number; completionRate: number;
}

// ==================== API ====================
const api = {
  list: (params: PageParams & { status?: number; priority?: number; assignedTo?: string; taskType?: string; projectId?: string }) =>
    request<ApiResponse<PagedResult<TaskDto>>>('/api/task/query', { method: 'POST', data: params }),
  delete: (id: string) => request<ApiResponse<void>>(`/api/task/${id}`, { method: 'DELETE' }),
  cancel: (id: string) => request<ApiResponse<void>>(`/api/task/${id}/cancel`, { method: 'POST' }),
  statistics: () => request<ApiResponse<TaskStatistics>>('/api/task/statistics'),
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
    <Drawer title={intl.formatMessage({ id: 'pages.taskManagement.detail.title' })} placement="right" open={open} onClose={onClose} size={isMobile ? 'large' : 800}>
      <Spin spinning={loading}>
        {taskDetail ? (
          <>
            <Card title={intl.formatMessage({ id: 'pages.taskManagement.detail.basicInfo' })} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.name' })} span={2}>{taskDetail.taskName}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.type' })}><Tag>{taskDetail.taskType}</Tag></Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.status' })}><Tag color={getTaskStatusColor(taskDetail.status)}>{taskDetail.statusName}</Tag></Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.priority' })}><Tag color={getTaskPriorityColor(taskDetail.priority)}>{taskDetail.priorityName}</Tag></Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.progress' })}>{taskDetail.completionPercentage}%</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.description' })} span={2}>{taskDetail.description || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title={intl.formatMessage({ id: 'pages.taskManagement.detail.assignment' })} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.createdBy' })}>{taskDetail.createdByName || '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.createdAt' })}>{dayjs(taskDetail.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.assignedTo' })}>{taskDetail.assignedToName || '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.assignedAt' })}>{taskDetail.assignedAt ? dayjs(taskDetail.assignedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title={intl.formatMessage({ id: 'pages.taskManagement.detail.timeInfo' })} style={{ marginBottom: 16 }}>
              <Descriptions column={isMobile ? 1 : 2} size="small">
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.plannedStart' })}>{taskDetail.plannedStartTime ? dayjs(taskDetail.plannedStartTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.plannedEnd' })}>{taskDetail.plannedEndTime ? dayjs(taskDetail.plannedEndTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.actualStart' })}>{taskDetail.actualStartTime ? dayjs(taskDetail.actualStartTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.actualEnd' })}>{taskDetail.actualEndTime ? dayjs(taskDetail.actualEndTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.estimatedDuration' })}>{taskDetail.estimatedDuration ? `${taskDetail.estimatedDuration} 分钟` : '-'}</Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.taskManagement.table.actualDuration' })}>{taskDetail.actualDuration ? `${taskDetail.actualDuration} 分钟` : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {taskDetail.participants && taskDetail.participants.length > 0 && (
              <Card title={intl.formatMessage({ id: 'pages.taskManagement.detail.participants' })} style={{ marginBottom: 16 }}>
                <Space wrap>{taskDetail.participants.map(p => <Tag key={p.userId}>{p.username}</Tag>)}</Space>
              </Card>
            )}

            {taskDetail.tags && taskDetail.tags.length > 0 && (
              <Card title={intl.formatMessage({ id: 'pages.taskManagement.table.tags' })} style={{ marginBottom: 16 }}>
                <Space wrap>{taskDetail.tags.map(t => <Tag key={t} color="blue">{t}</Tag>)}</Space>
              </Card>
            )}

            {taskDetail.remarks && (
              <Card title={intl.formatMessage({ id: 'pages.taskManagement.table.remarks' })} style={{ marginBottom: 16 }}><p>{taskDetail.remarks}</p></Card>
            )}

            <Card title={intl.formatMessage({ id: 'pages.taskManagement.detail.executionLogs' })} loading={logsLoading}>
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
            </Card>
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
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    searchText: '',
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));
  const refreshStats = useCallback(() => api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }), []);

  useEffect(() => {
    refreshStats();
    api.list({}).then(r => { if (r.success && r.data) setProjects(r.data.queryable?.map(t => ({ id: t.id!, name: t.taskName || '' })) || []); });
  }, []);

  const columns: ProColumns<TaskDto>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.name' }), dataIndex: 'taskName', key: 'taskName', width: 200, render: (_: any, r: TaskDto) => <a onClick={() => set({ viewingTask: r, detailVisible: true })}>{r.taskName}</a> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.type' }), dataIndex: 'taskType', key: 'taskType', width: 100, render: (_: any, r: TaskDto) => r.taskType ? <Tag>{r.taskType}</Tag> : '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.projectName' }), dataIndex: 'projectName', key: 'projectName', width: 150, render: (_: any, r: TaskDto) => r.projectName || '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.status' }), dataIndex: 'statusName', key: 'status', width: 100, filters: [
      { text: intl.formatMessage({ id: 'pages.taskManagement.status.pending' }), value: TaskStatusEnum.Pending }, { text: intl.formatMessage({ id: 'pages.taskManagement.status.assigned' }), value: TaskStatusEnum.Assigned },
      { text: intl.formatMessage({ id: 'pages.taskManagement.status.inProgress' }), value: TaskStatusEnum.InProgress }, { text: intl.formatMessage({ id: 'pages.taskManagement.status.completed' }), value: TaskStatusEnum.Completed },
      { text: intl.formatMessage({ id: 'pages.taskManagement.status.cancelled' }), value: TaskStatusEnum.Cancelled }, { text: intl.formatMessage({ id: 'pages.taskManagement.status.failed' }), value: TaskStatusEnum.Failed }, { text: intl.formatMessage({ id: 'pages.taskManagement.status.paused' }), value: TaskStatusEnum.Paused },
    ], onFilter: (v, r) => r.status === v, render: (_: any, r: TaskDto) => <Tag color={getTaskStatusColor(r.status)}>{r.statusName}</Tag> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.priority' }), dataIndex: 'priorityName', key: 'priority', width: 80, filters: [
      { text: intl.formatMessage({ id: 'pages.taskManagement.priority.low' }), value: 0 }, { text: intl.formatMessage({ id: 'pages.taskManagement.priority.medium' }), value: 1 },
      { text: intl.formatMessage({ id: 'pages.taskManagement.priority.high' }), value: 2 }, { text: intl.formatMessage({ id: 'pages.taskManagement.priority.urgent' }), value: 3 },
    ], onFilter: (v, r) => r.priority === v, render: (_: any, r: TaskDto) => <Tag color={getTaskPriorityColor(r.priority)}>{r.priorityName}</Tag> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.progress' }), dataIndex: 'completionPercentage', key: 'completionPercentage', width: 120, render: (_: any, r: TaskDto) => <Progress percent={r.completionPercentage} size="small" status={r.completionPercentage === 100 ? 'success' : r.status === TaskStatusEnum.Failed ? 'exception' : 'active'} /> },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.assignedTo' }), dataIndex: 'assignedToName', key: 'assignedTo', width: 100, render: (_: any, r: TaskDto) => r.assignedToName || '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.createdBy' }), dataIndex: 'createdByName', key: 'createdBy', width: 100, render: (_: any, r: TaskDto) => r.createdByName || '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.plannedEnd' }), dataIndex: 'plannedEndTime', key: 'plannedEndTime', width: 150, render: (_: any, r: TaskDto) => r.plannedEndTime ? dayjs(r.plannedEndTime).format('YYYY-MM-DD HH:mm') : '-' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', width: 150, sorter: true, render: (_: any, r: TaskDto) => r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm') : '-' },
    { title: intl.formatMessage({ id: 'pages.table.action' }), key: 'action', width: 200, fixed: 'right', valueType: 'option', render: (_: any, r: TaskDto) => [
      <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingTask: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.action.edit' })}</Button>,
      r.status !== TaskStatusEnum.Completed && r.status !== TaskStatusEnum.Cancelled && (
        <Space key="exec" size={4}>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => set({ viewingTask: r, executionVisible: true })}>{intl.formatMessage({ id: 'pages.taskManagement.action.execute' })}</Button>
          <Button type="link" size="small" icon={<StopOutlined />} onClick={() => {
            Modal.confirm({ title: intl.formatMessage({ id: 'pages.taskManagement.action.cancel' }), content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmCancel' }), onOk: () => api.cancel(r.id || '').then(res => { if (res.success) { message.success(intl.formatMessage({ id: 'pages.taskManagement.message.cancelSuccess' })); actionRef.current?.reload(); refreshStats(); } }) });
          }}>{intl.formatMessage({ id: 'pages.taskManagement.action.cancel' })}</Button>
        </Space>
      ),
      <Button key="delete" type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
        Modal.confirm({ title: intl.formatMessage({ id: 'pages.taskManagement.action.delete' }), content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmDelete' }), onOk: () => api.delete(r.id || '').then(res => { if (res.success) { message.success(intl.formatMessage({ id: 'pages.taskManagement.message.deleteSuccess' })); actionRef.current?.reload(); refreshStats(); } }) });
      }}>{intl.formatMessage({ id: 'pages.taskManagement.action.delete' })}</Button>,
    ]},
  ], [intl, message, refreshStats]);

  const statsConfig = [
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.totalTasks' }), key: 'totalTasks', icon: <PlusOutlined />, color: '#1890ff' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.inProgressTasks' }), key: 'inProgressTasks', icon: <PlayCircleOutlined />, color: '#1890ff' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.completedTasks' }), key: 'completedTasks', icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.completionRate' }), key: 'completionRate', suffix: '%', icon: <ReloadOutlined />, color: '#faad14' },
  ];

  return (
    <PageContainer title={<Space><PlusOutlined />{intl.formatMessage({ id: 'pages.taskManagement.title' })}</Space>}
      extra={<Space wrap>
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { refreshStats(); actionRef.current?.reload(); }}>{intl.formatMessage({ id: 'pages.taskManagement.refresh' })}</Button>
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
        refreshStats();
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [<Button key="refresh" icon={<ReloadOutlined />} onClick={() => { refreshStats(); actionRef.current?.reload(); }}>{intl.formatMessage({ id: 'pages.taskManagement.refresh' })}</Button>]}
      />

      <TaskForm open={state.formVisible} task={state.editingTask} projects={projects}
        onClose={() => set({ formVisible: false, editingTask: null })}
        onSuccess={() => { set({ formVisible: false, editingTask: null }); actionRef.current?.reload(); refreshStats(); }}
      />

      <TaskDetail id={state.viewingTask?.id || ''} open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingTask: null })} isMobile={isMobile} />

      <TaskExecutionPanel open={state.executionVisible} task={state.viewingTask}
        onClose={() => set({ executionVisible: false, viewingTask: null })}
        onSuccess={() => { set({ executionVisible: false, viewingTask: null }); actionRef.current?.reload(); refreshStats(); }}
      />
    </PageContainer>
  );
};

export default TaskManagement;
