import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components';
import { Button, Space, Modal, Tag, Card, Table, App, Form } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PartitionOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getWorkflowList,
  deleteWorkflow,
  updateWorkflow,
  type WorkflowDefinition,
} from '@/services/workflow/api';
import type { PagedResult } from '@/types/api-response';
import WorkflowCreateForm from './components/WorkflowCreateForm';
import WorkflowEditForm from './components/WorkflowEditForm';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import type { PageParams } from '@/types/api-response';


const WorkflowManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const { styles } = useCommonStyles();
  const [designerVisible, setDesignerVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchForm] = Form.useForm();
  const [data, setData] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const searchParamsRef = useRef<PageParams>({
    search: '',
  });

  const fetchData = useCallback(async () => {
    const currentParams = searchParamsRef.current;

    setLoading(true);
    try {
      const response = await getWorkflowList(currentParams);
      if (response.success && response.data) {
        const paged = response.data as PagedResult<WorkflowDefinition>;
        setData(paged.queryable || []);
        setPagination(prev => ({
          ...prev,
          page: currentParams.page ?? prev.page,
          pageSize: currentParams.pageSize ?? prev.pageSize,
          total: paged.rowCount ?? 0,
        }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const columns: ColumnsType<WorkflowDefinition> = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.name' }),
      dataIndex: 'name',
      ellipsis: true,
      sorter: true,
      render: (name, record) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => {
            setEditingWorkflow(record);
            setPreviewVisible(true);
          }}
        >
          {name}
        </Button>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.category' }),
      dataIndex: 'category',
      ellipsis: true,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.version' }),
      dataIndex: ['version', 'major'],
      render: (_, record) => `v${record.version.major}.${record.version.minor}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.status' }),
      dataIndex: 'isActive',
      sorter: true,
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive
            ? intl.formatMessage({ id: 'pages.workflow.status.enabled' })
            : intl.formatMessage({ id: 'pages.workflow.status.disabled' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.createdAt' }),
      dataIndex: 'createdAt',
      sorter: true,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '',
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.action' }),
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingWorkflow(record);
              setDesignerVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.action.edit' })}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={async () => {
              modal.confirm({
                title: intl.formatMessage({ id: 'pages.workflow.modal.confirmDelete' }),
                content: intl.formatMessage(
                  { id: 'pages.workflow.modal.confirmDeleteContent' },
                  { name: record.name }
                ),
                onOk: async () => {
                  try {
                    const response = await deleteWorkflow(record.id!);
                    if (response.success) {
                      message.success(intl.formatMessage({ id: 'pages.workflow.message.deleteSuccess' }));
                      fetchData();
                    }
                  } catch (error) {
                    console.error('删除失败:', error);
                  }
                },
              });
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];



  return (
    <PageContainer
      title={
        <Space>
          <PartitionOutlined />
          {intl.formatMessage({ id: 'pages.workflow.title' })}
        </Space>
      }
      extra={
        <Space wrap>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {intl.formatMessage({ id: 'pages.button.refresh' })}
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            {intl.formatMessage({ id: 'pages.workflow.create' })}
          </Button>
        </Space>
      }
    >
      {/* 搜索表单 */}
      <SearchBar
        initialParams={searchParamsRef.current}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {/* 数据表格 */}
      <Table<WorkflowDefinition>
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
      />

      {/* 创建流程模态窗体 */}
      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.create.title' })}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width="95%"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(100vh - 100px)', padding: '12px 24px' } }}
        destroyOnHidden
      >
        <WorkflowCreateForm
          onSuccess={() => {
            setCreateModalVisible(false);
            fetchData();
          }}
          onCancel={() => setCreateModalVisible(false)}
        />
      </Modal>

      {/* 编辑/预览流程模态窗体 */}
      <Modal
        title={
          editingWorkflow && designerVisible
            ? intl.formatMessage({ id: 'pages.workflow.action.edit' })
            : intl.formatMessage({ id: 'pages.workflow.action.preview' })
        }
        open={designerVisible || previewVisible}
        onCancel={() => {
          setDesignerVisible(false);
          setPreviewVisible(false);
          setEditingWorkflow(null);
        }}
        footer={null}
        width="95%"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(100vh - 100px)', padding: '12px 24px' } }}
        destroyOnHidden
      >
        {editingWorkflow && (
          <WorkflowEditForm
            workflow={editingWorkflow}
            readOnly={previewVisible}
            onSuccess={() => {
              setDesignerVisible(false);
              setEditingWorkflow(null);
              fetchData();
            }}
            onCancel={() => {
              setDesignerVisible(false);
              setPreviewVisible(false);
              setEditingWorkflow(null);
            }}
          />
        )}
      </Modal>


    </PageContainer >
  );
};

export default WorkflowManagement;
