import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { type ColumnsType } from 'antd/es/table';
import { Table, Card, Row, Col, Badge, Tag, Space, App, Grid, Button, Modal, Progress } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/utils/format';
import {
  deleteProject,
  getProjectList,
  getProjectStatistics,
  type ProjectDto,
  type ProjectQueryRequest,
  type ProjectStatistics,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import type { ApiResponse } from '@/types';
import { StatCard } from '@/components';
import ProjectForm from './ProjectForm';
import ProjectDetail from './ProjectDetail';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useModal } from '@/hooks/useModal';

export interface ProjectViewRef {
  reload: () => void;
  refreshStatistics: () => void;
  handleCreate: () => void;
}

const ProjectView = forwardRef<ProjectViewRef>((props, ref) => {
  const intl = useIntl();
  const { styles } = useCommonStyles();
  const { confirm } = useModal();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [viewingProject, setViewingProject] = useState<ProjectDto | null>(null);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [selectedRows, setSelectedRows] = useState<ProjectDto[]>([]);
  const [data, setData] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<ProjectQueryRequest>({
    search: '',
    sortBy: 'CreatedAt',
    sortOrder: 'desc',
  });

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getProjectStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const response = await getProjectList(currentParams);
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
    } catch (error) {
      console.error('获取项目列表失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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

  useImperativeHandle(ref, () => ({
    reload: () => {
      fetchData();
    },
    refreshStatistics: () => {
      fetchStatistics();
    },
    handleCreate: () => {
      setEditingProject(null);
      setFormVisible(true);
    },
  }), [fetchData, fetchStatistics]);


  // 删除项目
  const handleDelete = useCallback(async (projectId: string) => {
    confirm({
      title: intl.formatMessage({ id: 'pages.projectManagement.modal.deleteProject' }),
      content: intl.formatMessage({ id: 'pages.projectManagement.message.confirmDelete' }),
      okText: intl.formatMessage({ id: 'pages.button.delete' }),
      cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProject(projectId);
          message.success(intl.formatMessage({ id: 'pages.projectManagement.message.deleteSuccess' }));
          fetchData();
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.projectManagement.message.deleteFailed' }));
        }
      },
    });
  }, [intl, fetchData, fetchStatistics]);

  // 格式化日期（仅日期部分）
  const formatDate = useCallback((date: string | null | undefined): string => {
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
  }, []);

  // 处理查看项目详情
  const handleViewProject = useCallback((record: ProjectDto) => {
    setViewingProject(record);
    setDetailVisible(true);
  }, []);

  // 处理编辑项目
  const handleEditProject = useCallback((record: ProjectDto) => {
    setEditingProject(record);
    setFormVisible(true);
  }, []);

  // 行选择变化处理
  const handleRowSelectionChange = useCallback((_: React.Key[], selectedRows: ProjectDto[]) => {
    setSelectedRows(selectedRows);
  }, []);

  // 表格列定义（使用 useMemo 避免每次渲染都重新创建）
  const columns: ColumnsType<ProjectDto> = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.name' }),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ProjectDto) => (
        <Space>
          <ProjectOutlined />
          <a
            onClick={() => handleViewProject(record)}
            style={{ cursor: 'pointer' }}
          >
            {text}
          </a>
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.status' }),
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: ProjectDto) => {
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
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.priority' }),
      dataIndex: 'priority',
      key: 'priority',
      render: (_: any, record: ProjectDto) => {
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
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.createdBy' }),
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.startDate' }),
      dataIndex: 'startDate',
      key: 'startDate',
      render: (_: any, record: ProjectDto) => formatDate(record.startDate),
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.endDate' }),
      dataIndex: 'endDate',
      key: 'endDate',
      render: (_: any, record: ProjectDto) => formatDate(record.endDate),
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (_: any, record: ProjectDto) => formatDateTime(record.createdAt),
    },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }),
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_: any, record: ProjectDto) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditProject(record)}
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
  ], [intl, handleViewProject, handleEditProject, handleDelete, formatDateTime, formatDate]);

  // 关闭表单处理
  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
  }, []);

  // 表单成功处理
  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  // 关闭详情处理
  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setViewingProject(null);
  }, []);

  // 搜索处理
  const handleSearch = useCallback((params: any) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {/* 统计卡片 */}
      {statistics && (
        <Card className={styles.card} style={{ marginBottom: 16 }}>
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
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {/* 项目列表表格 */}
      <Table<ProjectDto>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
        rowSelection={{
          onChange: handleRowSelectionChange,
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
      />

      {/* 项目表单弹窗 */}
      {formVisible && (
        <Modal
          title={editingProject ? intl.formatMessage({ id: 'pages.projectManagement.editProject' }) : intl.formatMessage({ id: 'pages.projectManagement.createProject' })}
          open={formVisible}
          onCancel={handleCloseForm}
          footer={null}
          destroyOnHidden
        >
          <ProjectForm
            project={editingProject}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </Modal>
      )}

      {/* 项目详情抽屉 */}
      {detailVisible && viewingProject && (
        <ProjectDetail
          project={viewingProject}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
});

ProjectView.displayName = 'ProjectView';

export default ProjectView;
