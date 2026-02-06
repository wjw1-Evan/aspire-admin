import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components';
import SearchFormCard from '@/components/SearchFormCard';
import useCommonStyles from '@/hooks/useCommonStyles';
import DataTable from '@/components/DataTable';
import { useIntl, history, useLocation } from '@umijs/max';
import {
  Button,
  Tag,
  Space,
  Modal,
  Drawer,
  Row,
  Col,
  Badge,
  Form,
  Input,
  Card,
  DatePicker,
  Select,
  Progress,
  Grid,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';

const { useBreakpoint } = Grid;
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  TeamOutlined,
  BellOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  queryTasks,
  deleteTask,
  cancelTask,
  getTaskStatistics,
  getTaskById,
  TaskStatus,
  TaskPriority,
  TaskExecutionResult,
  type TaskDto,
  type TaskStatistics,
} from '@/services/task/api';
import type { ApiResponse } from '@/types/unified-api';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import TaskExecutionPanel from './components/TaskExecutionPanel';
import UnifiedNotificationCenter from '@/components/UnifiedNotificationCenter';
import { getProjectList, type ProjectDto } from '@/services/task/project';
import { StatCard } from '@/components';

// 提取纯函数到组件外部，避免每次渲染都重新创建
const getStatusColor = (status: number) => {
  switch (status) {
    case TaskStatus.Pending:
      return 'default';
    case TaskStatus.Assigned:
      return 'processing';
    case TaskStatus.InProgress:
      return 'processing';
    case TaskStatus.Completed:
      return 'success';
    case TaskStatus.Cancelled:
      return 'error';
    case TaskStatus.Failed:
      return 'error';
    case TaskStatus.Paused:
      return 'warning';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: number) => {
  switch (priority) {
    case TaskPriority.Low:
      return 'blue';
    case TaskPriority.Medium:
      return 'cyan';
    case TaskPriority.High:
      return 'orange';
    case TaskPriority.Urgent:
      return 'red';
    default:
      return 'blue';
  }
};

const formatDateTime = (dateTime: string | null | undefined): string => {
  if (!dateTime) return '-';
  try {
    const date = dayjs(dateTime);
    if (!date.isValid()) return dateTime;
    return date.format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.error('日期格式化错误:', error, dateTime);
    return dateTime || '-';
  }
};

const TaskManagement: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const modal = useModal();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchForm] = Form.useForm();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [executionVisible, setExecutionVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskDto | null>(null);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedRows, setSelectedRows] = useState<TaskDto[]>([]);
  const [searchParams, setSearchParams] = useState({
    page: 1,
    pageSize: 10,
    sortBy: 'CreatedAt',
    sortOrder: 'desc',
    search: undefined as string | undefined,
    status: undefined as number | undefined,
    priority: undefined as number | undefined,
    assignedTo: undefined as string | undefined,
    taskType: undefined as string | undefined,
    projectId: undefined as string | undefined,
  });

  // 🔧 修复：使用 ref 存储搜索参数，避免 fetchTasks 函数重新创建导致重复请求
  const searchParamsRef = useRef({
    page: 1,
    pageSize: 10,
    sortBy: 'CreatedAt',
    sortOrder: 'desc',
    search: undefined as string | undefined,
    status: undefined as number | undefined,
    priority: undefined as number | undefined,
    assignedTo: undefined as string | undefined,
    taskType: undefined as string | undefined,
    projectId: undefined as string | undefined,
  });
  const { styles } = useCommonStyles();

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getTaskStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    try {
      const response = await getProjectList({ page: 1, pageSize: 1000 });
      if (response.success && response.data) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  }, []);

  // 初始化时获取统计信息和项目列表
  useEffect(() => {
    fetchStatistics();
    loadProjects();
  }, [fetchStatistics, loadProjects]);

  // 处理 URL 查询参数（taskId, status, priority, search 等）
  useEffect(() => {
    const search = location?.search || '';
    const params = new URLSearchParams(search);
    const taskId = params.get('taskId');
    const status = params.get('status');
    const priority = params.get('priority');
    const searchQuery = params.get('search');

    let shouldReload = false;
    const formValues: any = {};

    // 处理状态过滤
    if (status !== null) {
      const statusNum = parseInt(status, 10);
      if (!isNaN(statusNum)) {
        searchParamsRef.current.status = statusNum;
        formValues.status = statusNum;
        shouldReload = true;
      }
    }

    // 处理优先级过滤
    if (priority !== null) {
      const priorityNum = parseInt(priority, 10);
      if (!isNaN(priorityNum)) {
        searchParamsRef.current.priority = priorityNum;
        formValues.priority = priorityNum;
        shouldReload = true;
      }
    }

    // 处理搜索关键词
    if (searchQuery !== null) {
      searchParamsRef.current.search = searchQuery;
      formValues.search = searchQuery;
      shouldReload = true;
    }

    // 如果有过滤参数，更新表单并重载数据
    if (shouldReload) {
      searchForm.setFieldsValue(formValues);
      setSearchParams({ ...searchParamsRef.current });
      actionRef.current?.reload?.();
    }

    // 处理 taskId 弹出详情
    if (taskId) {
      if (!viewingTask || viewingTask.id !== taskId) {
        (async () => {
          try {
            const resp = await getTaskById(taskId);
            if (resp.success && resp.data) {
              setViewingTask(resp.data);
              setDetailVisible(true);
            }
          } catch {
            // 忽略错误
          }
        })();
      } else if (!detailVisible) {
        setDetailVisible(true);
      }
    } else {
      if (detailVisible) {
        setDetailVisible(false);
        setViewingTask(null);
      }
    }
  }, [location?.search, searchForm]);

  // 获取任务列表
  const fetchTasks = useCallback(async (params: any, sort?: Record<string, any>) => {
    let sortBy = searchParamsRef.current.sortBy;
    let sortOrder = searchParamsRef.current.sortOrder;

    if (sort && Object.keys(sort).length > 0) {
      const sortKey = Object.keys(sort)[0];
      const sortValue = sort[sortKey];
      sortBy = sortKey;
      sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
    }

    const requestData = {
      page: params.current || searchParamsRef.current.page,
      pageSize: params.pageSize || searchParamsRef.current.pageSize,
      search: searchParamsRef.current.search,
      status: searchParamsRef.current.status,
      priority: searchParamsRef.current.priority,
      assignedTo: searchParamsRef.current.assignedTo,
      taskType: searchParamsRef.current.taskType,
      projectId: searchParamsRef.current.projectId,
      sortBy,
      sortOrder,
    };

    try {
      const response = await queryTasks(requestData);

      if (response.success && response.data) {
        return {
          data: response.data.tasks,
          success: true,
          total: response.data.total,
        };
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.message.loadFailed' }));
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  }, [intl]); // 🔧 修复：移除 searchParams 依赖，使用 ref 避免函数重新创建

  // 处理创建任务
  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setFormVisible(true);
  }, []);

  // 处理编辑任务
  const handleEditTask = useCallback((task: TaskDto) => {
    setEditingTask(task);
    setFormVisible(true);
  }, []);

  // 处理查看任务详情
  const handleViewTask = useCallback((task: TaskDto) => {
    setViewingTask(task);
    setDetailVisible(true);
  }, []);

  // 处理执行任务
  const handleExecuteTask = useCallback((task: TaskDto) => {
    setViewingTask(task);
    setExecutionVisible(true);
  }, []);

  // 处理删除任务
  const handleDeleteTask = useCallback((task: TaskDto) => {
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.taskManagement.modal.deleteTask' }),
      content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmDelete' }),
      okText: intl.formatMessage({ id: 'pages.table.ok' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      onOk: async () => {
        try {
          await deleteTask(task.id!);
          message.success(intl.formatMessage({ id: 'pages.taskManagement.message.deleteSuccess' }));
          actionRef.current?.reload?.();
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.taskManagement.message.deleteFailed' }));
        }
      },
    });
  }, [intl, fetchStatistics]);

  // 处理取消任务
  const handleCancelTask = useCallback((task: TaskDto) => {
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.taskManagement.modal.cancelTask' }),
      content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmCancel' }),
      okText: intl.formatMessage({ id: 'pages.table.ok' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      onOk: async () => {
        try {
          await cancelTask(task.id!);
          message.success(intl.formatMessage({ id: 'pages.taskManagement.message.cancelSuccess' }));
          actionRef.current?.reload?.();
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.taskManagement.message.cancelFailed' }));
        }
      },
    });
  }, [intl, fetchStatistics]);

  // 处理表单提交成功
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
    actionRef.current?.reload?.();
    fetchStatistics();
  }, [fetchStatistics]);

  // 处理执行成功
  const handleExecutionSuccess = useCallback(() => {
    setExecutionVisible(false);
    setViewingTask(null);
    actionRef.current?.reload?.();
    fetchStatistics();
  }, [fetchStatistics]);

  // 处理搜索
  const handleSearch = useCallback((values: any) => {
    const newSearchParams = {
      ...searchParamsRef.current,
      page: 1,
      search: values.search,
      status: values.status,
      priority: values.priority,
      assignedTo: values.assignedTo,
      taskType: values.taskType,
      projectId: values.projectId,
    };
    // 更新 ref 和 state
    searchParamsRef.current = newSearchParams;
    setSearchParams(newSearchParams);
    // 手动触发重新加载
    actionRef.current?.reload?.();
  }, []);

  // 重置搜索
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    const resetParams = {
      page: 1,
      pageSize: searchParamsRef.current.pageSize,
      sortBy: 'CreatedAt',
      sortOrder: 'desc',
      search: undefined as string | undefined,
      status: undefined as number | undefined,
      priority: undefined as number | undefined,
      assignedTo: undefined as string | undefined,
      taskType: undefined as string | undefined,
      projectId: undefined as string | undefined,
    };
    // 更新 ref 和 state
    searchParamsRef.current = resetParams;
    setSearchParams(resetParams);
    // 手动触发重新加载
    actionRef.current?.reload?.();
  }, [searchForm]);

  // 表格列定义（使用 useMemo 避免每次渲染都重新创建）
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
        <Tag color={getStatusColor(record.status)}>
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
        <Tag color={getPriorityColor(record.priority)}>
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
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditTask(record)}
          >
            {intl.formatMessage({ id: 'pages.taskManagement.action.edit' })}
          </Button>
          {record.status !== TaskStatus.Completed && record.status !== TaskStatus.Cancelled && (
            <>
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
            </>
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

  // 行选择变化处理
  const handleRowSelectionChange = useCallback((_: React.Key[], selectedRows: TaskDto[]) => {
    setSelectedRows(selectedRows);
  }, []);

  // 请求函数（使用 useCallback 包装）
  const requestFunction = useCallback(async (params: any, sort?: Record<string, any>) => {
    return fetchTasks(params, sort);
  }, [fetchTasks]);

  // 刷新处理
  const handleRefresh = useCallback(() => {
    actionRef.current?.reload?.();
    fetchStatistics();
  }, [fetchStatistics]);

  // 关闭表单处理
  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
  }, []);

  // 关闭详情处理
  const handleDetailClose = useCallback(() => {
    setDetailVisible(false);
    setViewingTask(null);
  }, []);

  // 关闭执行面板处理
  const handleExecutionClose = useCallback(() => {
    setExecutionVisible(false);
    setViewingTask(null);
  }, []);

  return (
    <PageContainer
      title={
        <Space>
          <UnorderedListOutlined />
          {intl.formatMessage({ id: 'pages.taskManagement.title' })}
        </Space>
      }
      style={{ paddingBlock: 12 }}
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
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
      {/* 统计卡片：与 Welcome 页面保持一致的紧凑横向布局 */}
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.taskManagement.statistics.totalTasks' })}
                value={statistics.totalTasks}
                icon={<TeamOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.taskManagement.statistics.inProgressTasks' })}
                value={statistics.inProgressTasks}
                icon={<PlayCircleOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completedTasks' })}
                value={statistics.completedTasks}
                icon={<CheckCircleOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.taskManagement.statistics.completionRate' })}
                value={statistics.completionRate.toFixed(1)}
                suffix="%"
                icon={<ReloadOutlined />}
                color="#faad14"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 搜索表单 */}
      <SearchFormCard>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
        >
          <Form.Item name="search" label={intl.formatMessage({ id: 'pages.taskManagement.search.label' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.taskManagement.search.placeholder' })} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label={intl.formatMessage({ id: 'pages.taskManagement.filter.status.label' })}>
            <Select placeholder={intl.formatMessage({ id: 'pages.taskManagement.filter.status.all' })} style={{ width: 120 }} allowClear>
              <Select.Option value={TaskStatus.Pending}>{intl.formatMessage({ id: 'pages.taskManagement.status.pending' })}</Select.Option>
              <Select.Option value={TaskStatus.Assigned}>{intl.formatMessage({ id: 'pages.taskManagement.status.assigned' })}</Select.Option>
              <Select.Option value={TaskStatus.InProgress}>{intl.formatMessage({ id: 'pages.taskManagement.status.inProgress' })}</Select.Option>
              <Select.Option value={TaskStatus.Completed}>{intl.formatMessage({ id: 'pages.taskManagement.status.completed' })}</Select.Option>
              <Select.Option value={TaskStatus.Cancelled}>{intl.formatMessage({ id: 'pages.taskManagement.status.cancelled' })}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="taskType" label="任务类型">
            <Select
              placeholder="请选择或输入"
              style={{ width: 130 }}
              allowClear
              showSearch
              options={[
                { label: '开发', value: '开发' },
                { label: '设计', value: '设计' },
                { label: '测试', value: '测试' },
                { label: '文档', value: '文档' },
                { label: '其他', value: '其他' },
              ]}
            />
          </Form.Item>
          <Form.Item name="projectId" label="项目">
            <Select
              placeholder="所属项目"
              style={{ width: 180 }}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">{intl.formatMessage({ id: 'pages.button.query' })}</Button>
              <Button onClick={handleReset}>{intl.formatMessage({ id: 'pages.button.reset' })}</Button>
            </Space>
          </Form.Item>
        </Form>
      </SearchFormCard>

      {/* 任务列表表格 */}
      <div ref={tableRef}>
        <DataTable<TaskDto>
          actionRef={actionRef}
          columns={columns}
          request={requestFunction}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          search={false}
          pagination={{
            pageSize: 10,
            pageSizeOptions: [10, 20, 50, 100],
          }}
          rowSelection={{
            onChange: handleRowSelectionChange,
          }}
        />
      </div>

      {/* 创建/编辑任务表单 */}
      <TaskForm
        open={formVisible}
        task={editingTask}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* 任务详情抽屉 */}
      <TaskDetail
        open={detailVisible}
        task={viewingTask}
        onClose={handleDetailClose}
      />

      {/* 任务执行面板 */}
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

