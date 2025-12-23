import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Space, Modal, message, Tag, Switch } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  PartitionOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { DataTable } from '@/components/DataTable';
import {
  getWorkflowList,
  deleteWorkflow,
  updateWorkflow,
  type WorkflowDefinition,
} from '@/services/workflow/api';
import WorkflowDesigner from './components/WorkflowDesigner';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';

const WorkflowManagement: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  const [designerVisible, setDesignerVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewGraph, setPreviewGraph] = useState<any>(null);

  const handleRefresh = () => {
    actionRef.current?.reload?.();
  };

  const columns: ProColumns<WorkflowDefinition> = [
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
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.action' }),
      valueType: 'option',
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
              Modal.confirm({
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
            onClick={() => {
              window.location.href = '/workflow/create';
            }}
          >
            {intl.formatMessage({ id: 'pages.workflow.create' })}
          </Button>
        </Space>
      }
    >
      <DataTable<WorkflowDefinition>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const response = await getWorkflowList({
            current: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword,
            category: params.category as string,
            isActive: params.isActive as boolean | undefined,
          });
          if (response.success && response.data) {
            return {
              data: response.data.list,
              success: true,
              total: response.data.total,
            };
          }
          return { data: [], success: false, total: 0 };
        }}
        rowKey="id"
        search={{
          labelWidth: 'auto',
          options: {
            fullScreen: true,
          },
        }}
      />

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
        bodyStyle={{ height: 'calc(100vh - 120px)' }}
      >
        <WorkflowDesigner
          visible={designerVisible || previewVisible}
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
