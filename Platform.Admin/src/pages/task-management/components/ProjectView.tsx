import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { ActionType, ProColumns } from '@/types/pro-components';
import DataTable from '@/components/DataTable';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import {
  Button,
  Tag,
  Space,
  message,
  Modal,
  Form,
  Input,
  Card,
  Row,
  Col,
  Badge,
  Select,
  DatePicker,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import {
  getProjectList,
  deleteProject,
  getProjectStatistics,
  type ProjectDto,
  type ProjectQueryRequest,
  type ProjectStatistics,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import type { ApiResponse } from '@/types/unified-api';
import { StatCard } from '@/components';
import ProjectForm from './ProjectForm';
import ProjectDetail from './ProjectDetail';

export interface ProjectViewRef {
  reload: () => void;
  refreshStatistics: () => void;
  handleCreate: () => void;
}

const ProjectView = forwardRef<ProjectViewRef>((props, ref) => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [searchForm] = Form.useForm();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [viewingProject, setViewingProject] = useState<ProjectDto | null>(null);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [selectedRows, setSelectedRows] = useState<ProjectDto[]>([]);
  const [searchParams, setSearchParams] = useState<ProjectQueryRequest>({
    page: 1,
    pageSize: 10,
    sortBy: 'CreatedAt',
    sortOrder: 'desc',
  });

  // 获取统计信息
  const fetchStatistics = async () => {
    try {
      const response = await getProjectStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reload: () => {
      actionRef.current?.reload();
    },
    refreshStatistics: () => {
      fetchStatistics();
    },
    handleCreate: () => {
      setEditingProject(null);
      setFormVisible(true);
    },
  }));

  // 获取项目列表
  const fetchProjects = async (params: any, sort?: Record<string, any>) => {
    let sortBy = searchParams.sortBy;
    let sortOrder = searchParams.sortOrder;

    if (sort && Object.keys(sort).length > 0) {
      const sortKey = Object.keys(sort)[0];
      const sortValue = sort[sortKey];
      sortBy = sortKey;
      sortOrder = sortValue === 'ascend' ? 'asc' : 'desc';
    }

    const requestData: ProjectQueryRequest = {
      page: params.current || searchParams.page,
      pageSize: params.pageSize || searchParams.pageSize,
      search: searchParams.search,
      status: searchParams.status,
      priority: searchParams.priority,
      managerId: searchParams.managerId,
      startDate: searchParams.startDate,
      endDate: searchParams.endDate,
      sortBy,
      sortOrder,
    };

    try {
      const response = await getProjectList(requestData);
      if (response.success && response.data) {
        return {
          data: response.data.projects,
          success: true,
          total: response.data.total,
        };
      }
      return { data: [], success: false, total: 0 };
    } catch (error) {
      console.error('获取项目列表失败:', error);
      return { data: [], success: false, total: 0 };
    }
  };

  // 处理搜索
  const handleSearch = (values: any) => {
    const newSearchParams: ProjectQueryRequest = {
      page: 1,
      pageSize: searchParams.pageSize,
      search: values.search,
      status: values.status,
      priority: values.priority,
      managerId: values.managerId,
      startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
    };
    setSearchParams(newSearchParams);
    actionRef.current?.reload();
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    const resetParams: ProjectQueryRequest = {
      page: 1,
      pageSize: searchParams.pageSize,
      sortBy: 'CreatedAt',
      sortOrder: 'desc',
    };
    setSearchParams(resetParams);
    actionRef.current?.reload();
  };

  // 删除项目
  const handleDelete = async (projectId: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.projectManagement.modal.deleteProject' }),
      content: intl.formatMessage({ id: 'pages.projectManagement.message.confirmDelete' }),
      okText: intl.formatMessage({ id: 'pages.button.delete' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteProject(projectId);
          message.success(intl.formatMessage({ id: 'pages.projectManagement.message.deleteSuccess' }));
          actionRef.current?.reload();
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.projectManagement.message.deleteFailed' }));
        }
      },
    });
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

  // 格式化日期（仅日期部分）
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    try {
      const dateObj = dayjs(date);
      if (!dateObj.isValid()) return date;
      // 如果包含时间部分且时间为 00:00:00，则只显示日期
      const hasTime = dateObj.hour() !== 0 || dateObj.minute() !== 0 || dateObj.second() !== 0;
      return hasTime ? dateObj.format('YYYY-MM-DD HH:mm:ss') : dateObj.format('YYYY-MM-DD');
    } catch (error) {
      console.error('日期格式化错误:', error, date);
      return date || '-';
    }
  };

  // 表格列定义
  const columns: ProColumns<ProjectDto>[] = [
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.name' }),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ProjectOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.status' }),
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const statusMap: Record<number, { color: string; text: string }> = {
          [ProjectStatus.Planning]: { color: 'default', text: intl.formatMessage({ id: 'pages.projectManagement.status.planning' }) },
          [ProjectStatus.InProgress]: { color: 'processing', text: intl.formatMessage({ id: 'pages.projectManagement.status.inProgress' }) },
          [ProjectStatus.OnHold]: { color: 'warning', text: intl.formatMessage({ id: 'pages.projectManagement.status.onHold' }) },
          [ProjectStatus.Completed]: { color: 'success', text: intl.formatMessage({ id: 'pages.projectManagement.status.completed' }) },
          [ProjectStatus.Cancelled]: { color: 'error', text: intl.formatMessage({ id: 'pages.projectManagement.status.cancelled' }) },
        };
        const statusInfo = statusMap[record.status] || { color: 'default', text: intl.formatMessage({ id: 'pages.table.unknown' }) };
        return <Badge status={statusInfo.color as any} text={statusInfo.text} />;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.progress' }),
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => <Progress percent={progress} size="small" />,
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.priority' }),
      dataIndex: 'priority',
      key: 'priority',
      render: (_, record) => {
        const priorityMap: Record<number, { color: string; text: string }> = {
          [ProjectPriority.Low]: { color: 'default', text: intl.formatMessage({ id: 'pages.projectManagement.priority.low' }) },
          [ProjectPriority.Medium]: { color: 'blue', text: intl.formatMessage({ id: 'pages.projectManagement.priority.medium' }) },
          [ProjectPriority.High]: { color: 'red', text: intl.formatMessage({ id: 'pages.projectManagement.priority.high' }) },
        };
        const priorityInfo = priorityMap[record.priority] || { color: 'default', text: intl.formatMessage({ id: 'pages.table.unknown' }) };
        return <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.manager' }),
      dataIndex: 'managerName',
      key: 'managerName',
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.createdBy' }),
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.startDate' }),
      dataIndex: 'startDate',
      key: 'startDate',
      valueType: 'date',
      render: (_, record) => formatDate(record.startDate),
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.endDate' }),
      dataIndex: 'endDate',
      key: 'endDate',
      valueType: 'date',
      render: (_, record) => formatDate(record.endDate),
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      render: (_, record) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setViewingProject(record);
              setDetailVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.table.view' })}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingProject(record);
              setFormVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.table.edit' })}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => record.id && handleDelete(record.id)}
          >
            {intl.formatMessage({ id: 'pages.button.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      {statistics && (
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.projectManagement.statistics.totalProjects' })}
                value={statistics.totalProjects}
                icon={<ProjectOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.projectManagement.statistics.inProgressProjects' })}
                value={statistics.inProgressProjects}
                icon={<ProjectOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.projectManagement.statistics.completedProjects' })}
                value={statistics.completedProjects}
                icon={<ProjectOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title={intl.formatMessage({ id: 'pages.projectManagement.statistics.delayedProjects' })}
                value={statistics.delayedProjects}
                icon={<ProjectOutlined />}
                color="#ff4d4f"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="search" label={intl.formatMessage({ id: 'pages.projectManagement.search.label' })}>
            <Input placeholder={intl.formatMessage({ id: 'pages.projectManagement.search.placeholder' })} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label={intl.formatMessage({ id: 'pages.projectManagement.filter.status.label' })}>
            <Select placeholder={intl.formatMessage({ id: 'pages.projectManagement.filter.status.all' })} style={{ width: 120 }} allowClear>
              <Select.Option value={ProjectStatus.Planning}>{intl.formatMessage({ id: 'pages.projectManagement.status.planning' })}</Select.Option>
              <Select.Option value={ProjectStatus.InProgress}>{intl.formatMessage({ id: 'pages.projectManagement.status.inProgress' })}</Select.Option>
              <Select.Option value={ProjectStatus.OnHold}>{intl.formatMessage({ id: 'pages.projectManagement.status.onHold' })}</Select.Option>
              <Select.Option value={ProjectStatus.Completed}>{intl.formatMessage({ id: 'pages.projectManagement.status.completed' })}</Select.Option>
              <Select.Option value={ProjectStatus.Cancelled}>{intl.formatMessage({ id: 'pages.projectManagement.status.cancelled' })}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label={intl.formatMessage({ id: 'pages.projectManagement.filter.priority.label' })}>
            <Select placeholder={intl.formatMessage({ id: 'pages.projectManagement.filter.priority.all' })} style={{ width: 120 }} allowClear>
              <Select.Option value={ProjectPriority.Low}>{intl.formatMessage({ id: 'pages.projectManagement.priority.low' })}</Select.Option>
              <Select.Option value={ProjectPriority.Medium}>{intl.formatMessage({ id: 'pages.projectManagement.priority.medium' })}</Select.Option>
              <Select.Option value={ProjectPriority.High}>{intl.formatMessage({ id: 'pages.projectManagement.priority.high' })}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label={intl.formatMessage({ id: 'pages.projectManagement.filter.createdAt.label' })}>
            <DatePicker.RangePicker style={{ width: 240 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {intl.formatMessage({ id: 'pages.button.query' })}
              </Button>
              <Button onClick={handleReset}>{intl.formatMessage({ id: 'pages.button.reset' })}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 项目列表表格 */}
      <DataTable<ProjectDto>
        actionRef={actionRef}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        search={false}
        request={fetchProjects}
        columns={columns}
        rowSelection={{
          onChange: (_, selectedRows) => {
            setSelectedRows(selectedRows);
          },
        }}
        pagination={{
          pageSize: 10,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 项目表单弹窗 */}
      {formVisible && (
        <Modal
          title={editingProject ? intl.formatMessage({ id: 'pages.projectManagement.editProject' }) : intl.formatMessage({ id: 'pages.projectManagement.createProject' })}
          open={formVisible}
          onCancel={() => setFormVisible(false)}
          footer={null}
          width={600}
          destroyOnHidden
        >
          <ProjectForm
            project={editingProject}
            onSuccess={() => {
              setFormVisible(false);
              actionRef.current?.reload();
              fetchStatistics();
            }}
            onCancel={() => setFormVisible(false)}
          />
        </Modal>
      )}

      {/* 项目详情抽屉 */}
      {detailVisible && viewingProject && (
        <ProjectDetail
          project={viewingProject}
          onClose={() => setDetailVisible(false)}
        />
      )}
    </div>
  );
});

ProjectView.displayName = 'ProjectView';

export default ProjectView;
