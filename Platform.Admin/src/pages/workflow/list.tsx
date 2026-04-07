import React, { useState, useRef } from 'react';
import { PageContainer, ModalForm, ProFormText, ProFormSelect, ProFormSwitch } from '@ant-design/pro-components';
import { Button, Space, Tag, App, Modal, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PartitionOutlined, SearchOutlined, ApiOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { getWorkflowList, deleteWorkflow, type WorkflowDefinition } from '@/services/workflow/api';
import WorkflowCreateForm from './components/WorkflowCreateForm';
import WorkflowEditForm from './components/WorkflowEditForm';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import type { PageParams } from '@/types';

const WorkflowManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [designerVisible, setDesignerVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

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
                  if (response.success) { message.success(intl.formatMessage({ id: 'pages.workflow.message.deleteSuccess' })); actionRef.current?.reload(); }
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
    <PageContainer>
      <ProTable
        headerTitle={
          <Space size={24}>
            <Space><ApiOutlined />{intl.formatMessage({ id: 'pages.workflow.table.name' })}</Space>
          </Space>
        }
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async (params: any) => {
          const { current, pageSize, sortBy, sortOrder } = params;
          const response = await getWorkflowList({ page: current, pageSize, search: searchText, sortBy, sortOrder } as PageParams);
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
            onSearch={(value) => { setSearchText(value); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>{intl.formatMessage({ id: 'pages.workflow.create' })}</Button>,
        ]}
      />
      <Modal title={intl.formatMessage({ id: 'pages.workflow.create.title' })} open={createModalVisible} onCancel={() => setCreateModalVisible(false)} footer={null} width="95%" style={{ top: 20 }} styles={{ body: { height: 'calc(100vh - 100px)', padding: '12px 24px' } }} destroyOnHidden>
        <WorkflowCreateForm onSuccess={() => { setCreateModalVisible(false); actionRef.current?.reload(); }} onCancel={() => setCreateModalVisible(false)} />
      </Modal>
      <Modal title={editingWorkflow && designerVisible ? intl.formatMessage({ id: 'pages.workflow.action.edit' }) : intl.formatMessage({ id: 'pages.workflow.action.preview' })} open={designerVisible || previewVisible} onCancel={() => { setDesignerVisible(false); setPreviewVisible(false); setEditingWorkflow(null); }} footer={null} width="95%" style={{ top: 20 }} styles={{ body: { height: 'calc(100vh - 100px)', padding: '12px 24px' } }} destroyOnHidden>
        {editingWorkflow && (
          <WorkflowEditForm workflow={editingWorkflow} readOnly={previewVisible} onSuccess={() => { setDesignerVisible(false); setEditingWorkflow(null); actionRef.current?.reload(); }} onCancel={() => { setDesignerVisible(false); setPreviewVisible(false); setEditingWorkflow(null); }} />
        )}
      </Modal>
    </PageContainer>
  );
};

export default WorkflowManagement;
