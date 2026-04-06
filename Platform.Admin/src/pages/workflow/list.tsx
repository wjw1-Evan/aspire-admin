import React, { useState } from 'react';
import { PageContainer } from '@/components';
import { Button, Space, Modal, Tag, App, Form } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PartitionOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProTable, ProColumns } from '@ant-design/pro-table';
import { getWorkflowList, deleteWorkflow, type WorkflowDefinition } from '@/services/workflow/api';
import WorkflowCreateForm from './components/WorkflowCreateForm';
import WorkflowEditForm from './components/WorkflowEditForm';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import type { PageParams } from '@/types';

const WorkflowManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const [designerVisible, setDesignerVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const columns: ProColumns<WorkflowDefinition>[] = [
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.name' }), dataIndex: 'name', ellipsis: true, sorter: true,
      render: (dom, record) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => { setEditingWorkflow(record); setPreviewVisible(true); }}>{dom}</Button>
      ),
    },
    { title: intl.formatMessage({ id: 'pages.workflow.table.category' }), dataIndex: 'category', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.workflow.table.version' }), dataIndex: ['version', 'major'], render: (_, record) => `v${record.version.major}.${record.version.minor}` },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.status' }), dataIndex: 'isActive', sorter: true,
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive ? intl.formatMessage({ id: 'pages.workflow.status.enabled' }) : intl.formatMessage({ id: 'pages.workflow.status.disabled' })}
        </Tag>
      ),
    },
    { title: intl.formatMessage({ id: 'pages.workflow.table.createdAt' }), dataIndex: 'createdAt', sorter: true, render: (dom) => dom ? dayjs(dom as string).format('YYYY-MM-DD HH:mm:ss') : '' },
    {
      title: intl.formatMessage({ id: 'pages.workflow.table.action' }), width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingWorkflow(record); setDesignerVisible(true); }}>
            {intl.formatMessage({ id: 'pages.workflow.action.edit' })}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
            modal.confirm({
              title: intl.formatMessage({ id: 'pages.workflow.modal.confirmDelete' }),
              content: intl.formatMessage({ id: 'pages.workflow.modal.confirmDeleteContent' }, { name: record.name }),
              onOk: async () => {
                try {
                  const response = await deleteWorkflow(record.id!);
                  if (response.success) { message.success(intl.formatMessage({ id: 'pages.workflow.message.deleteSuccess' })); }
                } catch (error) { console.error('删除失败:', error); }
              },
            });
          }}>
            {intl.formatMessage({ id: 'pages.workflow.action.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={<Space><PartitionOutlined />{intl.formatMessage({ id: 'pages.workflow.title' })}</Space>}
      extra={<Space wrap>
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>{intl.formatMessage({ id: 'pages.workflow.create' })}</Button>
      </Space>}
    >
      <ProTable
        headerTitle={intl.formatMessage({ id: 'pages.workflow.table.name' })}
        actionRef={undefined}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params: any) => {
          const { current, pageSize, ...rest } = params;
          const response = await getWorkflowList({ page: current, pageSize, ...rest } as PageParams);
          if (response.success && response.data) {
            return { data: response.data.queryable || [], total: response.data.rowCount || 0, success: true };
          }
          return { data: [], total: 0, success: false };
        }}
        columns={columns}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button>,
        ]}
      />
      <Modal title={intl.formatMessage({ id: 'pages.workflow.create.title' })} open={createModalVisible} onCancel={() => setCreateModalVisible(false)} footer={null} width="95%" style={{ top: 20 }} styles={{ body: { height: 'calc(100vh - 100px)', padding: '12px 24px' } }} destroyOnHidden>
        <WorkflowCreateForm onSuccess={() => { setCreateModalVisible(false); window.location.reload(); }} onCancel={() => setCreateModalVisible(false)} />
      </Modal>
      <Modal title={editingWorkflow && designerVisible ? intl.formatMessage({ id: 'pages.workflow.action.edit' }) : intl.formatMessage({ id: 'pages.workflow.action.preview' })} open={designerVisible || previewVisible} onCancel={() => { setDesignerVisible(false); setPreviewVisible(false); setEditingWorkflow(null); }} footer={null} width="95%" style={{ top: 20 }} styles={{ body: { height: 'calc(100vh - 100px)', padding: '12px 24px' } }} destroyOnHidden>
        {editingWorkflow && (
          <WorkflowEditForm workflow={editingWorkflow} readOnly={previewVisible} onSuccess={() => { setDesignerVisible(false); setEditingWorkflow(null); window.location.reload(); }} onCancel={() => { setDesignerVisible(false); setPreviewVisible(false); setEditingWorkflow(null); }} />
        )}
      </Modal>
    </PageContainer>
  );
};

export default WorkflowManagement;
