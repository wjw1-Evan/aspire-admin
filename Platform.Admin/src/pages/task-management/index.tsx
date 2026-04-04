import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer, StatCard } from '@/components';
import SearchBar from '@/components/SearchBar';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useIntl } from '@umijs/max';
import {
  Button,
  Tag,
  Space,
  Modal,
  Drawer,
  Row,
  Col,
  Card,
  Input,
  Select,
  Progress,
  Grid,
  Table,
  App,
} from 'antd';
import { useModal } from '@/hooks/useModal';

const { useBreakpoint } = Grid;
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/utils/format';
import { getTaskStatusColor, getTaskPriorityColor } from '@/utils/task';
import {
  queryTasks,
  deleteTask,
  cancelTask,
  getTaskStatistics,
  TaskStatus,
  TaskPriority,
  type TaskDto,
  type TaskStatistics,
} from '@/services/task/api';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import TaskExecutionPanel from './components/TaskExecutionPanel';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import { getProjectList, type ProjectDto } from '@/services/task/project';
import type { PageParams } from '@/types/page-params';

const TaskManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const customModal = useModal();
  const screens = useBreakpoint();
  const { styles } = useCommonStyles();

  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [executionVisible, setExecutionVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskDto | null>(null);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedRows, setSelectedRows] = useState<TaskDto[]>([]);
  const [data, setData] = useState<TaskDto[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams & {
    status?: number;
    priority?: number;
    assignedTo?: string;
    taskType?: string;
    projectId?: string;
  }>({
    sortBy: 'CreatedAt',
    sortOrder: 'desc',
    search: '',
    status: undefined,
    priority: undefined,
    assignedTo: undefined,
    taskType: undefined,
    projectId: undefined,
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;
    setLoading(true);
    try {
      const response = await queryTasks({
        page: currentParams.page ?? 1,
        pageSize: currentParams.pageSize ?? 10,
        sortBy: currentParams.sortBy,
        sortOrder: currentParams.sortOrder,
        search: currentParams.search,
        status: currentParams.status,
        priority: currentParams.priority,
        assignedTo: currentParams.assignedTo,
        taskType: currentParams.taskType,
        projectId: currentParams.projectId,
      });

      if (response.success && response.data) {
        setData(response.data.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: response.data!.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(() => {
    getTaskStatistics().then((res) => {
      if (res.success && res.data) setStatistics(res.data);
    });
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const response = await getProjectList({ page: 1, pageSize: 1000 });
      if (response.success && response.data) {
        setProjects(response.data.queryable);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  useEffect(() => {
    fetchStatistics();
    loadProjects();
    fetchData();
  }, [fetchStatistics, loadProjects, fetchData]);

  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setFormVisible(true);
  }, []);

  const handleEditTask = useCallback((task: TaskDto) => {
    setEditingTask(task);
    setFormVisible(true);
  }, []);

  const handleViewTask = useCallback((task: TaskDto) => {
    setViewingTask(task);
    setDetailVisible(true);
  }, []);

  const handleExecuteTask = useCallback((task: TaskDto) => {
    setViewingTask(task);
    setExecutionVisible(true);
  }, []);

  const handleDeleteTask = useCallback((task: TaskDto) => {
    customModal.confirm({
      title: intl.formatMessage({ id: 'pages.taskManagement.modal.deleteTask' }),
      content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmDelete' }),
      okText: intl.formatMessage({ id: 'pages.table.ok' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      onOk: async () => {
        try {
          await deleteTask(task.id || '');
          message.success(intl.formatMessage({ id: 'pages.taskManagement.message.deleteSuccess' }));
          refreshAll();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.taskManagement.message.deleteFailed' }));
        }
      },
    });
  }, [intl, customModal, message, refreshAll]);

  const handleCancelTask = useCallback((task: TaskDto) => {
    customModal.confirm({
      title: intl.formatMessage({ id: 'pages.taskManagement.modal.cancelTask' }),
      content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmCancel' }),
      okText: intl.formatMessage({ id: 'pages.table.ok' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      onOk: async () => {
        try {
          await cancelTask(task.id || '');
          message.success(intl.formatMessage({ id: 'pages.taskManagement.message.cancelSuccess' }));
          refreshAll();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.taskManagement.message.cancelFailed' }));
        }
      },
    });
  }, [intl, customModal, message, refreshAll]);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
    refreshAll();
  }, [refreshAll]);

  const handleExecutionSuccess = useCallback(() => {
    setExecutionVisible(false);
    setViewingTask(null);
    refreshAll();
  }, [refreshAll]);

  const columns: ColumnsType<TaskDto> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.taskName' }),
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      render: (_: any, record: TaskDto) => (
        <a onClick={() => handleViewTask(record)}>
          {record.taskName}
        </a>
      ),
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      render: (text: string) => <Tag>{text || '-'}</Tag>,
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.status' }),
      dataIndex: 'statusName',
      key: 'status',
      width: 100,
      filters: [
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.pending' }), value: TaskStatus.Pending },
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.assigned' }), value: TaskStatus.Assigned },
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.inProgress' }), value: TaskStatus.InProgress },
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.completed' }), value: TaskStatus.Completed },
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.cancelled' }), value: TaskStatus.Cancelled },
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.failed' }), value: TaskStatus.Failed },
        { text: intl.formatMessage({ id: 'pages.taskManagement.status.paused' }), value: TaskStatus.Paused },
      ],
      onFilter: (value, record) => record.status === (value as number),
      render: (_: any, record: TaskDto) => (
        <Tag color={getTaskStatusColor(record.status)}>
          {record.statusName}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.priority' }),
      dataIndex: 'priorityName',
      key: 'priority',
      width: 80,
      filters: [
        { text: intl.formatMessage({ id: 'pages.taskManagement.priority.low' }), value: TaskPriority.Low },
        { text: intl.formatMessage({ id: 'pages.taskManagement.priority.medium' }), value: TaskPriority.Medium },
        { text: intl.formatMessage({ id: 'pages.taskManagement.priority.high' }), value: TaskPriority.High },
        { text: intl.formatMessage({ id: 'pages.taskManagement.priority.urgent' }), value: TaskPriority.Urgent },
      ],
      onFilter: (value, record) => record.priority === (value as number),
      render: (_: any, record: TaskDto) => (
        <Tag color={getTaskPriorityColor(record.priority)}>
          {record.priorityName}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.progress' }),
      dataIndex: 'completionPercentage',
      key: 'completionPercentage',
      width: 120,
      render: (_: any, record: TaskDto) => (
        <Progress
          percent={record.completionPercentage}
          size="small"
          status={
            record.completionPercentage === 100
              ? 'success'
              : record.status === TaskStatus.Failed
                ? 'exception'
                : 'active'
          }
        />
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.assignedTo' }),
      dataIndex: 'assignedToName',
      key: 'assignedTo',
      width: 100,
      render: (_: any, record: TaskDto) => record.assignedToName || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.createdBy' }),
      dataIndex: 'createdByName',
      key: 'createdBy',
      width: 100,
      render: (_: any, record: TaskDto) => record.createdByName || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.plannedEndTime' }),
      dataIndex: 'plannedEndTime',
      key: 'plannedEndTime',
      width: 150,
      render: (_: any, record: TaskDto) => formatDateTime(record.plannedEndTime),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: true,
      render: (_: any, record: TaskDto) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.action' }),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_: any, record: TaskDto) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditTask(record)}
          >
            {intl.formatMessage({ id: 'pages.taskManagement.action.edit' })}
          </Button>
          {record.status !== TaskStatus.Completed && record.status !== TaskStatus.Cancelled && (
            <Space>
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleExecuteTask(record)}
              >
                {intl.formatMessage({ id: 'pages.taskManagement.action.execute' })}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<StopOutlined />}
                onClick={() => handleCancelTask(record)}
              >
                {intl.formatMessage({ id: 'pages.taskManagement.action.cancel' })}
              </Button>
            </Space>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTask(record)}
          >
            {intl.formatMessage({ id: 'pages.taskManagement.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ], [intl, handleViewTask, handleEditTask, handleExecuteTask, handleCancelTask, handleDeleteTask]);

  const handleRowSelectionChange = useCallback((_: React.Key[], selectedRows: TaskDto[]) => {
    setSelectedRows(selectedRows);
  }, []);

  const handleSearch = useCallback((params: PageParams) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
    
    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
      sortBy,
      sortOrder,
    };
    fetchData();
  }, [fetchData]);

  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailVisible(false);
    setViewingTask(null);
  }, []);

  const handleExecutionClose = useCallback(() => {
    setExecutionVisible(false);
    setViewingTask(null);
  }, []);

  const statsConfig = [
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.totalTasks' }), value: statistics?.totalTasks, icon: <TeamOutlined />, color: '#1890ff' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.inProgressTasks' }), value: statistics?.inProgressTasks, icon: <PlayCircleOutlined />, color: '#1890ff' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.completedTasks' }), value: statistics?.completedTasks, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: intl.formatMessage({ id: 'pages.taskManagement.statistics.completionRate' }), value: statistics?.completionRate.toFixed(1), suffix: '%', icon: <ReloadOutlined />, color: '#faad14' },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <UnorderedListOutlined />
          {intl.formatMessage({ id: 'pages.taskManagement.title' })}
        </Space>
      }
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={refreshAll}
          >
            {intl.formatMessage({ id: 'pages.taskManagement.refresh' })}
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateTask}
          >
            {intl.formatMessage({ id: 'pages.taskManagement.createTask' })}
          </Button>
        </Space>
      }
    >
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            {statsConfig.map((stat, idx) => (
              <Col xs={24} sm={12} md={6} key={idx}>
                <StatCard title={stat.title} value={stat.value ?? 0} suffix={stat.suffix} icon={stat.icon} color={stat.color} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      <Table<TaskDto>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
        rowSelection={{
          onChange: handleRowSelectionChange,
        }}
      />

      <TaskForm
        open={formVisible}
        task={editingTask}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      <TaskDetail
        open={detailVisible}
        task={viewingTask}
        onClose={handleDetailClose}
      />

      <TaskExecutionPanel
        open={executionVisible}
        task={viewingTask}
        onClose={handleExecutionClose}
        onSuccess={handleExecutionSuccess}
      />
    </PageContainer>
  );
};

export default TaskManagement;
