import React, { useRef, useState, useCallback } from 'react';
import { PageContainer } from '@/components';
import { Button, Space, Modal, Tag, Switch, Card, Row, Col, Form, Input, Select, Grid } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PartitionOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType } from '@/types/pro-components';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '@/components/DataTable';
import {
  getWorkflowList,
  deleteWorkflow,
  updateWorkflow,
  type WorkflowDefinition,
} from '@/services/workflow/api';
import WorkflowDesigner from './components/WorkflowDesigner';
import WorkflowCreateForm from './components/WorkflowCreateForm';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
const { useBreakpoint } = Grid;
import type { SelectProps } from 'antd';



const WorkflowManagement: React.FC = () => {
  const intl = useIntl();
  const message = useMessage();
  const modal = useModal();
  const actionRef = useRef<ActionType>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 以下为移动端
  const [designerVisible, setDesignerVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewGraph, setPreviewGraph] = useState<any>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState({
    current: 1,
    pageSize: 10,
    keyword: '',
    category: undefined,
    isActive: undefined,
  });

  // 🔧 使用 ref 存储搜索参数，避免 request 函数重新创建导致重复请求
  const searchParamsRef = useRef({
    current: 1,
    pageSize: 10,
    keyword: '',
    category: undefined,
    isActive: undefined,
  });

  const handleRefresh = () => {
    actionRef.current?.reload?.();
  };

  // 搜索
  const handleSearch = (values: any) => {
    const newParams = {
      current: 1,
      pageSize: searchParamsRef.current.pageSize,
      keyword: values.keyword || '',
      category: values.category,
      isActive: values.isActive,
    };
    // 同时更新 ref 和 state
    searchParamsRef.current = newParams;
    setSearchParams(newParams);
    // 手动触发重新加载
    actionRef.current?.reload?.();
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    const resetParams = {
      current: 1,
      pageSize: searchParamsRef.current.pageSize,
      keyword: '',
      category: undefined,
      isActive: undefined,
    };
    // 同时更新 ref 和 state
    searchParamsRef.current = resetParams;
    setSearchParams(resetParams);
    // 手动触发重新加载
    actionRef.current?.reload?.();
  };

  // 🔧 使用 useCallback 定义 request 函数，依赖数组为空，避免函数重新创建
  const fetchWorkflows = useCallback(async (params: any) => {
    const requestData = {
      page: params.current || searchParamsRef.current.current, // 使用 page 参数
      pageSize: params.pageSize || searchParamsRef.current.pageSize,
      // 从 ref 读取搜索参数
      keyword: searchParamsRef.current.keyword,
      category: searchParamsRef.current.category,
      isActive: searchParamsRef.current.isActive,
    };

    try {
      const response = await getWorkflowList(requestData);
      if (response.success && response.data) {
        return {
          data: response.data.list || response.data.data || [], // 兼容不同的响应格式
          success: true,
          total: response.data.total || 0,
        };
      }
      return { data: [], success: false, total: 0 };
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      return { data: [], success: false, total: 0 };
    }
  }, []); // 🔧 空依赖数组，避免函数重新创建

  const columns: ColumnsType<WorkflowDefinition> = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.name' }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.category' }),
      dataIndex: 'category',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.version' }),
      dataIndex: ['version', 'major'],
      render: (_, record) => `v${record.version.major}.${record.version.minor}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.status' }),
      dataIndex: 'isActive',
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
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '',
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.action' }),
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setPreviewGraph(record.graph);
              setPreviewVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.action.preview' })}
          </Button>
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
                      actionRef.current?.reload?.();
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

  const handleSave = async (graph: any) => {
    try {
      if (editingWorkflow) {
        const response = await updateWorkflow(editingWorkflow.id!, { graph });
        if (response.success) {
          message.success(intl.formatMessage({ id: 'pages.workflow.message.saveSuccess' }));
          setDesignerVisible(false);
          setEditingWorkflow(null);
          actionRef.current?.reload?.();
        }
      } else {
        // 创建新流程的逻辑在创建页面处理
        message.info(intl.formatMessage({ id: 'pages.workflow.create.message.designFirst' }));
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error(intl.formatMessage({ id: 'pages.workflow.message.saveFailed' }));
    }
  };


  return (
    <PageContainer
      title={
        <Space>
          <PartitionOutlined />
          {intl.formatMessage({ id: 'pages.workflow.title' })}
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
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout={isMobile ? 'vertical' : 'inline'}
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="流程名称、描述等" allowClear style={{ width: isMobile ? '100%' : 200 }} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: isMobile ? '100%' : 150 }}
              showSearch
              filterOption={((input: string, option: any) => {
                const label = option?.label;
                return typeof label === 'string' && label.toLowerCase().includes(input.toLowerCase());
              }) as SelectProps['filterOption']}
            />
          </Form.Item>
          <Form.Item name="isActive" label="状态">
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: isMobile ? '100%' : 150 }}
              options={[
                { label: '启用', value: true },
                { label: '禁用', value: false },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                style={isMobile ? { width: '100%' } : {}}
              >
                搜索
              </Button>
              <Button
                onClick={handleReset}
                style={isMobile ? { width: '100%' } : {}}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格 */}
      <DataTable<WorkflowDefinition>
        actionRef={actionRef}
        columns={columns}
        request={fetchWorkflows}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 创建流程模态窗体 */}
      <Modal
        title={intl.formatMessage({ id: 'pages.workflow.create.title' })}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={isMobile ? '100%' : 800}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } }}
      >
        <WorkflowCreateForm
          onSuccess={() => {
            setCreateModalVisible(false);
            if (actionRef.current && actionRef.current.reload) {
              actionRef.current.reload();
            }
          }}
          onCancel={() => setCreateModalVisible(false)}
        />
      </Modal>

      {/* 编辑/预览流程模态窗体 */}
      <Modal
        title={
          editingWorkflow
            ? intl.formatMessage({ id: 'pages.workflow.action.edit' })
            : intl.formatMessage({ id: 'pages.workflow.action.preview' })
        }
        open={designerVisible || previewVisible}
        onCancel={() => {
          setDesignerVisible(false);
          setPreviewVisible(false);
          setEditingWorkflow(null);
          setPreviewGraph(null);
        }}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(100vh - 120px)' } }}
      >
        <WorkflowDesigner
          open={designerVisible || previewVisible}
          graph={editingWorkflow?.graph || previewGraph}
          onSave={handleSave}
          onClose={() => {
            setDesignerVisible(false);
            setPreviewVisible(false);
          }}
        />
      </Modal>

    </PageContainer>
  );
};

export default WorkflowManagement;
