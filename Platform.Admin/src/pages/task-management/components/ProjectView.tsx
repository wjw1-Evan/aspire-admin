import { DeleteOutlined, EditOutlined, PlusOutlined, ProjectOutlined, SearchOutlined } from '@ant-design/icons';
import { useIntl, useSearchParams } from '@umijs/max';
import { App, Badge, Button, Input, Progress, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useModal } from '@/hooks/useModal';
import {
  deleteProject,
  getProjectById,
  getProjectList,
  getProjectStatistics,
  type ProjectDto,
  ProjectPriority,
  type ProjectStatistics,
  ProjectStatus,
} from '@/services/task/project';
import ProjectDetail from './ProjectDetail';
import ProjectForm from './ProjectForm';
import { ProColumns, ProTable } from '@ant-design/pro-components';


export interface ProjectViewRef {
  reload: () => void;
  refreshStatistics: () => void;
  handleCreate: () => void;
}

const ProjectView = forwardRef<ProjectViewRef>((_props, ref) => {
  const intl = useIntl();
  const { confirm } = useModal();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
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

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId) {
      getProjectById(projectId).then((response) => {
        if (response.success && response.data) {
          setViewingProject(response.data);
          setDetailVisible(true);
        }
      });
    }
  }, [searchParams]);

  useImperativeHandle(
    ref,
    () => ({
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
    }),
    [fetchStatistics],
  );

  const handleDelete = useCallback(
    async (projectId: string) => {
      confirm({
        title: intl.formatMessage({ id: 'pages.project.modal.deleteProject' }),
        content: intl.formatMessage({ id: 'pages.project.message.confirmDelete' }),
        okText: intl.formatMessage({ id: 'pages.button.delete' }),
        cancelText: intl.formatMessage({ id: 'pages.table.cancel' }),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteProject(projectId);
            message.success(intl.formatMessage({ id: 'pages.project.message.deleteSuccess' }));
            fetchStatistics();
          } catch (_error) {
            message.error(intl.formatMessage({ id: 'pages.project.message.deleteFailed' }));
          }
        },
      });
    },
    [intl, message, confirm, fetchStatistics],
  );

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
    tableActionRef.current?.reload();
  }, [fetchStatistics]);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setViewingProject(null);
  }, []);

  const columns: ProColumns<ProjectDto>[] = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'pages.project.table.name' }),
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        render: (dom: any, record: ProjectDto) => (
          <Space>
            <ProjectOutlined />
            <a onClick={() => handleViewProject(record)} style={{ cursor: 'pointer' }}>
              {dom}
            </a>
          </Space>
        ),
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.status' }),
        dataIndex: 'status',
        key: 'status',
        sorter: true,
        render: (_: any, record: ProjectDto) => {
          const statusMap: Record<number, { color: string; text: string }> = {
            [ProjectStatus.Planning]: {
              color: 'default',
              text: intl.formatMessage({ id: 'pages.project.status.planning' }),
            },
            [ProjectStatus.InProgress]: {
              color: 'processing',
              text: intl.formatMessage({ id: 'pages.project.status.inProgress' }),
            },
            [ProjectStatus.OnHold]: {
              color: 'warning',
              text: intl.formatMessage({ id: 'pages.project.status.onHold' }),
            },
            [ProjectStatus.Completed]: {
              color: 'success',
              text: intl.formatMessage({ id: 'pages.project.status.completed' }),
            },
            [ProjectStatus.Cancelled]: {
              color: 'error',
              text: intl.formatMessage({ id: 'pages.project.status.cancelled' }),
            },
          };
          const statusInfo = statusMap[record.status] || {
            color: 'default',
            text: intl.formatMessage({ id: 'pages.table.unknown' }),
          };
          return <Badge status={statusInfo.color as any} text={statusInfo.text} />;
        },
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.progress' }),
        dataIndex: 'progress',
        key: 'progress',
        sorter: true,
        render: (dom: any) => <Progress percent={dom} size="small" />,
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.priority' }),
        dataIndex: 'priority',
        key: 'priority',
        sorter: true,
        render: (_: any, record: ProjectDto) => {
          const priorityMap: Record<number, { color: string; text: string }> = {
            [ProjectPriority.Low]: { color: 'default', text: intl.formatMessage({ id: 'pages.project.priority.low' }) },
            [ProjectPriority.Medium]: {
              color: 'blue',
              text: intl.formatMessage({ id: 'pages.project.priority.medium' }),
            },
            [ProjectPriority.High]: { color: 'red', text: intl.formatMessage({ id: 'pages.project.priority.high' }) },
          };
          const priorityInfo = priorityMap[record.priority] || {
            color: 'default',
            text: intl.formatMessage({ id: 'pages.table.unknown' }),
          };
          return <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>;
        },
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.members' }),
        dataIndex: 'projectMembers',
        key: 'projectMembers',
        sorter: true,
        render: (_dom: any, record: ProjectDto) => {
          if (record.projectMembers && record.projectMembers.length > 0) {
            return record.projectMembers.map((m) => m.userName || m.userId).join(', ');
          }
          return '-';
        },
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.createdBy' }),
        dataIndex: 'createdByName',
        key: 'createdByName',
        sorter: true,
        render: (dom: any) => dom || '-',
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.startDate' }),
        dataIndex: 'startDate',
        key: 'startDate',
        sorter: true,
        render: (_: any, record: ProjectDto) => formatDate(record.startDate),
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.endDate' }),
        dataIndex: 'endDate',
        key: 'endDate',
        sorter: true,
        render: (_: any, record: ProjectDto) => formatDate(record.endDate),
      },
      {
        title: intl.formatMessage({ id: 'pages.project.table.createdAt' }),
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: true,
        render: (_: any, record: ProjectDto) =>
          record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      },
      {
        title: intl.formatMessage({ id: 'pages.table.action' }),
        key: 'action',
        fixed: 'right',
        width: 150,
        render: (_: any, record: ProjectDto) => (
          <Space>
            {record.canEdit && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditProject(record)}>
                {intl.formatMessage({ id: 'pages.table.edit' })}
              </Button>
            )}
            {record.canDelete && (
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => record.id && handleDelete(record.id)}
              >
                {intl.formatMessage({ id: 'pages.button.delete' })}
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [intl, handleViewProject, handleEditProject, handleDelete, formatDate],
  );

  return (
    <div>
      <ProTable<ProjectDto>
        headerTitle={
          <Space size={24}>
            <Space>
              <ProjectOutlined />
              {intl.formatMessage({ id: 'pages.project.title' })}
            </Space>
            <Space size={12}>
              <Tag color="blue">
                {intl.formatMessage({ id: 'pages.project.statistics.totalProjects' })} {statistics?.totalProjects || 0}
              </Tag>
              <Tag color="green">
                {intl.formatMessage({ id: 'pages.project.statistics.inProgressProjects' })}{' '}
                {statistics?.inProgressProjects || 0}
              </Tag>
              <Tag color="cyan">
                {intl.formatMessage({ id: 'pages.project.statistics.completedProjects' })}{' '}
                {statistics?.completedProjects || 0}
              </Tag>
              <Tag color="red">
                {intl.formatMessage({ id: 'pages.project.statistics.delayedProjects' })}{' '}
                {statistics?.delayedProjects || 0}
              </Tag>
            </Space>
          </Space>
        }
        actionRef={tableActionRef}
        rowKey="id"
        search={false}
        request={async (params: any, sort: any, filter: any) => {
          const response = await getProjectList({ ...params, search: searchText, sort, filter });
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
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => {
              setSearchText(value);
              tableActionRef.current?.reload();
            }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProject(null);
              setFormVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.project.createProject' })}
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

      {detailVisible && viewingProject && <ProjectDetail project={viewingProject} onClose={handleCloseDetail} />}
    </div>
  );
});

ProjectView.displayName = 'ProjectView';

export default ProjectView;
