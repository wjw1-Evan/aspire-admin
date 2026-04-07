import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Badge, Tag, Space, App, Button, Progress, Input } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ProjectOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  deleteProject,
  getProjectList,
  getProjectStatistics,
  type ProjectDto,
  type ProjectStatistics,
  ProjectStatus,
  ProjectPriority,
} from '@/services/task/project';
import type { ApiResponse, PageParams } from '@/types';
import ProjectForm from './ProjectForm';
import ProjectDetail from './ProjectDetail';
import { useModal } from '@/hooks/useModal';
import { ProTable, ProColumns, ProCard } from '@ant-design/pro-components';

export interface ProjectViewRef {
  reload: () => void;
  refreshStatistics: () => void;
  handleCreate: () => void;
}

const ProjectView = forwardRef<ProjectViewRef>((props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const { message } = App.useApp();
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [viewingProject, setViewingProject] = useState<ProjectDto | null>(null);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [searchText, setSearchText] = useState('');
  const tableActionRef = useRef<any>(null);

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

  useImperativeHandle(ref, () => ({
    reload: () => {
      tableActionRef.current?.reload();
    },
    refreshStatistics: () => {
      fetchStatistics();
    },
    handleCreate: () => {
      setEditingProject(null);
      setFormVisible(true);
    },
  }), [fetchStatistics]);

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
          fetchStatistics();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.projectManagement.message.deleteFailed' }));
        }
      },
    });
  }, [intl, message, confirm, fetchStatistics]);

  const formatDate = useCallback((date: string | null | undefined): string => {
    if (!date) return '-';
    try {
      const dateObj = dayjs(date);
      if (!dateObj.isValid()) return date;
      const hasTime = dateObj.hour() !== 0 || dateObj.minute() !== 0 || dateObj.second() !== 0;
      return hasTime ? dateObj.format('YYYY-MM-DD HH:mm:ss') : dateObj.format('YYYY-MM-DD');
    } catch (error) {
      console.error('日期格式化错误:', error, date);
      return date || '-';
    }
  }, []);

  const handleViewProject = useCallback((record: ProjectDto) => {
    setViewingProject(record);
    setDetailVisible(true);
  }, []);

  const handleEditProject = useCallback((record: ProjectDto) => {
    setEditingProject(record);
    setFormVisible(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormVisible(false);
    fetchStatistics();
  }, [fetchStatistics]);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setViewingProject(null);
  }, []);

  const columns: ProColumns<ProjectDto>[] = useMemo(() => [
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.name' }),
      dataIndex: 'name',
      key: 'name',
      render: (dom: any, record: ProjectDto) => (
        <Space>
          <ProjectOutlined />
          <a
            onClick={() => handleViewProject(record)}
            style={{ cursor: 'pointer' }}
          >
            {dom}
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
      render: (dom: any) => <Progress percent={dom} size="small" />,
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
      render: (dom: any) => dom || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.projectManagement.table.createdBy' }),
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (dom: any) => dom || '-',
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
      render: (_: any, record: ProjectDto) => record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
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
  ], [intl, handleViewProject, handleEditProject, handleDelete, formatDate]);

  return (
    <div>
      {statistics && (
        <ProCard gutter={16} style={{ marginBottom: 16 }}>
          <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{statistics.totalProjects}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{intl.formatMessage({ id: 'pages.projectManagement.statistics.totalProjects' })}</div>
          </ProCard>
          <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{statistics.inProgressProjects}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{intl.formatMessage({ id: 'pages.projectManagement.statistics.inProgressProjects' })}</div>
          </ProCard>
          <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{statistics.completedProjects}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{intl.formatMessage({ id: 'pages.projectManagement.statistics.completedProjects' })}</div>
          </ProCard>
          <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{statistics.delayedProjects}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{intl.formatMessage({ id: 'pages.projectManagement.statistics.delayedProjects' })}</div>
          </ProCard>
        </ProCard>
      )}

      <ProTable<ProjectDto>
        headerTitle={intl.formatMessage({ id: 'pages.projectManagement.title', defaultMessage: '项目管理' })}
        actionRef={tableActionRef}
        rowKey="id"
        search={false}
        request={async (params: any) => {
          const { current, pageSize, sortBy, sortOrder } = params;
          const response = await getProjectList({
            page: current,
            pageSize,
            search: searchText,
            sortBy,
            sortOrder,
          } as PageParams);
          if (response.success && response.data) {
            return { data: response.data.queryable || [], total: response.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => { setSearchText(value); tableActionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { fetchStatistics(); tableActionRef.current?.reload(); }}>刷新</Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProject(null); setFormVisible(true); }}>
            新建项目
          </Button>,
        ]}
      />

      {formVisible && (
        <ProjectForm
          open={formVisible}
          project={editingProject}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseForm}
        />
      )}

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
