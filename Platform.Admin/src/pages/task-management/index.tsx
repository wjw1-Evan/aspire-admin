import React, { useRef, useState, useEffect } from 'react';
import type { ActionType, ProColumns } from '@/types/pro-components';
import { PageContainer } from '@/components'; import DataTable from '@/components/DataTable';
import { useIntl, history, useLocation } from '@umijs/max';
import {
  Button,
  Tag,
  Space,
  message,
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
} from 'antd';
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
import { StatCard } from '@/components';

const TaskManagement: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const actionRef = useRef<ActionType>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchForm] = Form.useForm();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [executionVisible, setExecutionVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskDto | null>(null);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
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
  });

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await getTaskStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 初始化时获取统计信息
  useEffect(() => {
    fetchStatistics();
  }, []);

  // 根据 URL 中的 taskId 查询参数，实时弹出任务详情
  useEffect(() => {
    const search = location?.search || '';
    const params = new URLSearchParams(search);
    const taskId = params.get('taskId');

    if (taskId) {
      // 如果 taskId 变化，才重新加载
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
        // 如果已有相同任务但抽屉被关闭，重新打开
        setDetailVisible(true);
      }
    } else {
      // 没有 taskId 时，关闭抽屉
      if (detailVisible) {
        setDetailVisible(false);
        setViewingTask(null);
      }
    }
  }, [location?.search]);

  // 获取任务列表
  const fetchTasks = async (params: any, sort?: Record<string, any>) => {
    let sortBy = searchParams.sortBy;
    let sortOrder = searchParams.sortOrder;

    if (sort && Object.keys(sort).length > 0) {
      const sortKey = Object.keys(sort)[0];
      const sortValue = sort[sortKey];
      sortBy = sortKey;
      sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
    }

    const requestData = {
      page: params.current || searchParams.page,
      pageSize: params.pageSize || searchParams.pageSize,
      search: searchParams.search,
      status: searchParams.status,
      priority: searchParams.priority,
      assignedTo: searchParams.assignedTo,
      taskType: searchParams.taskType,
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
  };

  // 处理创建任务
  const handleCreateTask = () => {
    setEditingTask(null);
    setFormVisible(true);
  };

  // 处理编辑任务
  const handleEditTask = (task: TaskDto) => {
    setEditingTask(task);
    setFormVisible(true);
  };

  // 处理查看任务详情
  const handleViewTask = (task: TaskDto) => {
    setViewingTask(task);
    setDetailVisible(true);
  };

  // 处理执行任务
  const handleExecuteTask = (task: TaskDto) => {
    setViewingTask(task);
    setExecutionVisible(true);
  };

  // 处理删除任务
  const handleDeleteTask = (task: TaskDto) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.taskManagement.modal.deleteTask' }),
      content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmDelete' }),
      okText: intl.formatMessage({ id: 'pages.table.ok' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      onOk: async () => {
        try {
          await deleteTask(task.id!);
          message.success(intl.formatMessage({ id: 'pages.taskManagement.message.deleteSuccess' }));
          actionRef.current?.reload();
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.taskManagement.message.deleteFailed' }));
        }
      },
    });
  };

  // 处理取消任务
  const handleCancelTask = (task: TaskDto) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.taskManagement.modal.cancelTask' }),
      content: intl.formatMessage({ id: 'pages.taskManagement.message.confirmCancel' }),
      okText: intl.formatMessage({ id: 'pages.table.ok' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      onOk: async () => {
        try {
          await cancelTask(task.id!);
          message.success(intl.formatMessage({ id: 'pages.taskManagement.message.cancelSuccess' }));
          actionRef.current?.reload();
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.taskManagement.message.cancelFailed' }));
        }
      },
    });
  };

  // 处理表单提交成功
  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingTask(null);
    actionRef.current?.reload();
    fetchStatistics();
  };

  // 处理执行成功
  const handleExecutionSuccess = () => {
    setExecutionVisible(false);
    setViewingTask(null);
    actionRef.current?.reload();
    fetchStatistics();
  };

  // 处理搜索
  const handleSearch = (values: any) => {
    const newSearchParams = {
      ...searchParams,
      page: 1,
      search: values.search,
      status: values.status,
      priority: values.priority,
      assignedTo: values.assignedTo,
      taskType: values.taskType,
    };
    setSearchParams(newSearchParams);
    actionRef.current?.reload();
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    const resetParams = {
      page: 1,
      pageSize: 10,
      sortBy: 'CreatedAt',
      sortOrder: 'desc',
      search: undefined as string | undefined,
      status: undefined as number | undefined,
      priority: undefined as number | undefined,
      assignedTo: undefined as string | undefined,
      taskType: undefined as string | undefined,
    };
    setSearchParams(resetParams);
    actionRef.current?.reload();
  };

  // 获取状态标签颜色
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

  // 获取优先级标签颜色
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

  // 格式化日期时间
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

  // 表格列定义
  const columns: ProColumns<TaskDto>[] = [
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.taskName' }),
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      render: (_, record) => (
        <a onClick={() => handleViewTask(record)}>
          {record.taskName}
        </a>
      ),
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
      onFilter: (value, record) => record.status === value,
      render: (_, record) => (
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
      onFilter: (value, record) => record.priority === value,
      render: (_, record) => (
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
      render: (_, record) => (
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
      render: (_, record) => record.assignedToName || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.createdBy' }),
      dataIndex: 'createdByName',
      key: 'createdBy',
      width: 100,
      render: (_, record) => record.createdByName || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.plannedEndTime' }),
      dataIndex: 'plannedEndTime',
      key: 'plannedEndTime',
      width: 150,
      render: (_, record) => formatDateTime(record.plannedEndTime),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: true,
      render: (_, record) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.taskManagement.table.action' }),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
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
  ];

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
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => {
              actionRef.current?.reload();
              fetchStatistics();
            }}
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
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
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
      <Card style={{ marginBottom: 16 }}>
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">{intl.formatMessage({ id: 'pages.button.query' })}</Button>
              <Button onClick={handleReset}>{intl.formatMessage({ id: 'pages.button.reset' })}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 任务列表表格 */}
      <div ref={tableRef}>
        <DataTable<TaskDto>
          actionRef={actionRef}
          columns={columns}
          request={async (params, sort) => {
            return fetchTasks(params, sort);
          }}
          rowKey="id"
          search={false}
          pagination={{
            pageSize: 10,
            pageSizeOptions: [10, 20, 50, 100],
          }}
          rowSelection={{
            onChange: (_, selectedRows) => {
              setSelectedRows(selectedRows);
            },
          }}
          options={{
            setting: {
              listsHeight: 400,
            },
          }}
        />
      </div>

      {/* 创建/编辑任务表单 */}
      <TaskForm
        visible={formVisible}
        task={editingTask}
        onClose={() => {
          setFormVisible(false);
          setEditingTask(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* 任务详情抽屉 */}
      <TaskDetail
        visible={detailVisible}
        task={viewingTask}
        onClose={() => {
          setDetailVisible(false);
          setViewingTask(null);
        }}
      />

      {/* 任务执行面板 */}
      <TaskExecutionPanel
        visible={executionVisible}
        task={viewingTask}
        onClose={() => {
          setExecutionVisible(false);
          setViewingTask(null);
        }}
        onSuccess={handleExecutionSuccess}
      />
    </PageContainer>
  );
};

export default TaskManagement;

