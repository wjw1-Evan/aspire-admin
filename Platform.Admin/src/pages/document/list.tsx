import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { PageContainer, ProDescriptions, ProFormSelect, ProFormText, ProFormTextArea, ModalForm } from '@ant-design/pro-components';
import { Space, Tag, Button, App, Input, Popconfirm, Form, Modal } from 'antd';
import { Drawer } from 'antd';
import { FileTextOutlined, PlusOutlined, EyeOutlined, SendOutlined, DeleteOutlined, EditOutlined, FileProtectOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';
import {
  type Document,
  type DocumentStatistics,
  DocumentStatus,
  submitDocument,
  updateDocument,
  archiveDocument,
} from '@/services/document/api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { getWorkflowList } from '@/services/workflow/api';

const documentStatusMap = {
  [DocumentStatus.Draft]: { textId: 'pages.document.status.draft', defaultText: '草稿', color: 'default' },
  [DocumentStatus.Approving]: { textId: 'pages.document.status.approving', defaultText: '审批中', color: 'processing' },
  [DocumentStatus.Approved]: { textId: 'pages.document.status.approved', defaultText: '已通过', color: 'success' },
  [DocumentStatus.Rejected]: { textId: 'pages.document.status.rejected', defaultText: '已拒绝', color: 'error' },
  [DocumentStatus.Archived]: { textId: 'pages.document.status.archived', defaultText: '已归档', color: 'warning' },
};

const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Document>>>('/apiservice/api/documents', { params }),
  get: (id: string) => request<ApiResponse<Document>>(`/apiservice/api/documents/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/documents/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Document>) => request<ApiResponse<Document>>('/apiservice/api/documents', { method: 'POST', data }),
  statistics: () => request<ApiResponse<DocumentStatistics>>('/apiservice/api/documents/statistics'),
};

const DocumentManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
const [state, setState] = useState({
    statistics: null as DocumentStatistics | null,
    detailVisible: false,
    viewingId: '',
    search: '',
    formVisible: false,
    submitVisible: false,
    submittingId: '',
    editVisible: false,
    editingId: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const columns: ProColumns<Document>[] = [
    { title: intl.formatMessage({ id: 'pages.document.columns.title' }), dataIndex: 'title', ellipsis: true, sorter: true, render: (dom: any, r) => <a onClick={() => set({ viewingId: r.id, detailVisible: true })}><FileTextOutlined /> {dom}</a> },
    { title: intl.formatMessage({ id: 'pages.document.columns.type' }), dataIndex: 'documentType', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.document.columns.category' }), dataIndex: 'category', ellipsis: true, sorter: true, render: (dom: any) => dom ? <Tag color="blue">{dom}</Tag> : '-' },
    {
      title: intl.formatMessage({ id: 'pages.document.columns.status' }), dataIndex: 'status', sorter: true,
      render: (dom: any) => {
        const status = documentStatusMap[dom as DocumentStatus] || { textId: 'pages.document.status.unknown', defaultText: '未知', color: 'default' };
        return <Tag color={status.color}>{intl.formatMessage({ id: status.textId})}</Tag>;
      },
    },
    { title: intl.formatMessage({ id: 'pages.document.columns.createdBy' }), dataIndex: 'createdBy', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.document.columns.createdAt' }), dataIndex: 'createdAt', sorter: true, valueType: 'dateTime' },
{
      title: intl.formatMessage({ id: 'pages.document.table.action' }), valueType: 'option', fixed: 'right', width: 220,
      render: (_: any, r: Document) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingId: r.id, detailVisible: true })}>{intl.formatMessage({ id: 'pages.document.view' })}</Button>
          {r.status === DocumentStatus.Draft && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editVisible: true, editingId: r.id! })}>{intl.formatMessage({ id: 'pages.document.action.edit' })}</Button>
              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => set({ submitVisible: true, submittingId: r.id! })}>{intl.formatMessage({ id: 'pages.document.submit' })}</Button>
            </>
          )}
          {r.status === DocumentStatus.Approved && (
            <Button type="link" size="small" icon={<FileProtectOutlined />} onClick={() => {
              Modal.confirm({
                title: intl.formatMessage({ id: 'pages.document.action.archive' }),
                content: intl.formatMessage({ id: 'pages.document.message.confirmArchive' }, { title: r.title }),
                okText: intl.formatMessage({ id: 'pages.document.confirm' }),
                cancelText: intl.formatMessage({ id: 'pages.document.cancel' }),
                onOk: async () => {
                  const res = await archiveDocument(r.id!);
                  if (res.success) {
                    message.success(intl.formatMessage({ id: 'pages.document.message.archiveSuccess' }));
                    actionRef.current?.reload();
                    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
                  }
                },
              });
            }}>{intl.formatMessage({ id: 'pages.document.action.archive' })}</Button>
          )}
          <Popconfirm title={intl.formatMessage({ id: 'pages.document.deleteConfirm' }, { title: r.title })} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.document.delete' })}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  useEffect(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space><FileTextOutlined />{intl.formatMessage({ id: 'pages.document.title' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.document.statistics.total' })} {state.statistics?.totalDocuments || 0}</Tag>
              <Tag color="default">{intl.formatMessage({ id: 'pages.document.statistics.draft' })} {state.statistics?.draftCount || 0}</Tag>
              <Tag color="processing">{intl.formatMessage({ id: 'pages.document.statistics.pending' })} {state.statistics?.pendingCount || 0}</Tag>
              <Tag color="success">{intl.formatMessage({ id: 'pages.document.statistics.approved' })} {state.statistics?.approvedCount || 0}</Tag>
              <Tag color="warning">{intl.formatMessage({ id: 'pages.document.statistics.archived' })} {state.statistics?.archivedCount || 0}</Tag>
              <Tag color="error">{intl.formatMessage({ id: 'pages.document.statistics.rejected' })} {state.statistics?.rejectedCount || 0}</Tag>
            </Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const { current, pageSize } = params;
          const res = await api.list({ page: current, pageSize, search: state.search, sort, filter });
          api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns} rowKey="id" search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.document.searchPlaceholder' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ formVisible: true })}>{intl.formatMessage({ id: 'pages.document.createDocument' })}</Button>,
        ]}
      />

      <ModalForm
        title={intl.formatMessage({ id: 'pages.document.createDocument' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false }); }}
        onFinish={async (values) => {
          const definitionId = values.workflowDefinitionId;
          if (!definitionId) {
            message.warning(intl.formatMessage({ id: 'pages.document.message.selectWorkflowFirst' }));
            return false;
          }
          window.location.href = `/document/create-by-workflow?definitionId=${definitionId}`;
          return true;
        }}
        width={500}
      >
        <ProFormSelect
          name="workflowDefinitionId"
          label={intl.formatMessage({ id: 'pages.document.selectWorkflow' })}
          placeholder={intl.formatMessage({ id: 'pages.document.selectWorkflowPlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.document.selectWorkflowRequired' }) }]}
          request={async () => {
            try {
              const resp = await getWorkflowList({ page: 1 });
              if (resp.success && resp.data) {
                return (resp.data.queryable || []).map((wf: any) => ({ label: wf.name, value: wf.id! }));
              }
            } catch (e) {
              console.error('加载流程列表失败:', e);
            }
            return [];
          }}
          fieldProps={{
            showSearch: true,
            filterOption: (input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase()),
          }}
        />
      </ModalForm>

      <Drawer title={intl.formatMessage({ id: 'pages.document.detail' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DocumentDetail id={state.viewingId} />
      </Drawer>

      <DocumentEditDrawer
        id={state.editingId}
        visible={state.editVisible}
        onClose={() => set({ editVisible: false, editingId: '' })}
        onSuccess={() => {
          actionRef.current?.reload();
          api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        }}
      />

      <ModalForm
        title={intl.formatMessage({ id: 'pages.document.submitApproval' })}
        open={state.submitVisible}
        onOpenChange={(open) => { if (!open) set({ submitVisible: false, submittingId: '' }); }}
        onFinish={async (values) => {
          if (!values.workflowDefinitionId) {
            message.error(intl.formatMessage({ id: 'pages.document.message.selectWorkflow' }));
            return false;
          }
          try {
            const res = await submitDocument(state.submittingId, { workflowDefinitionId: values.workflowDefinitionId });
            if (res.success) {
              message.success(intl.formatMessage({ id: 'pages.document.message.submitted' }));
              set({ submitVisible: false, submittingId: '' });
              actionRef.current?.reload();
              api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
              return true;
            }
            return false;
          } catch (err) {
            message.error(getErrorMessage(err as any, 'pages.document.submitFailed'));
            return false;
          }
        }}
        width={500}
      >
        <ProFormSelect
          name="workflowDefinitionId"
          label={intl.formatMessage({ id: 'pages.document.selectWorkflow' })}
          placeholder={intl.formatMessage({ id: 'pages.document.selectWorkflowPlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.document.selectWorkflowRequired' }) }]}
          request={async () => {
            try {
              const resp = await getWorkflowList({ page: 1 });
              if (resp.success && resp.data) {
                return (resp.data.queryable || []).map((wf: any) => ({ label: wf.name, value: wf.id! }));
              }
            } catch (e) {
              console.error('加载流程列表失败:', e);
            }
            return [];
          }}
          fieldProps={{
            showSearch: true,
            filterOption: (input: string, option: any) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase()),
          }}
        />
      </ModalForm>
    </PageContainer>
  );
};

const DocumentDetail: React.FC<{ id: string }> = ({ id }) => {
  const intl = useIntl();
  const [doc, setDoc] = useState<Document | null>(null);
  useEffect(() => {
    if (id) api.get(id).then(r => { if (r.success && r.data) setDoc(r.data); });
  }, [id]);
  if (!doc) return null;
  return (
    <ProDescriptions column={1} bordered size="small">
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.title' })}><strong>{doc.title}</strong></ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.type' })}>{doc.documentType}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.category' })}>{doc.category ? <Tag color="blue">{doc.category}</Tag> : '-'}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.status' })}>
        <Tag color={documentStatusMap[doc.status]?.color || 'default'}>{intl.formatMessage({ id: documentStatusMap[doc.status]?.textId})}</Tag>
      </ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.createdBy' })}>{doc.createdBy}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.createdAt' })}>{dayjs(doc.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.updatedAt' })}>{dayjs(doc.updatedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      {doc.content && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.content' })} span={1}><div dangerouslySetInnerHTML={{ __html: doc.content }} /></ProDescriptions.Item>}
    </ProDescriptions>
  );
};

const DocumentEditDrawer: React.FC<{ id: string; visible: boolean; onClose: () => void; onSuccess: () => void }> = ({ id, visible, onClose, onSuccess }) => {
  const intl = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && visible) {
      api.get(id).then(r => {
        if (r.success && r.data) {
          setDoc(r.data);
          form.setFieldsValue({
            title: r.data.title,
            content: r.data.content,
            documentType: r.data.documentType,
            category: r.data.category,
          });
        }
      });
    }
  }, [id, visible, form]);

  const handleFinish = async (values: any) => {
    if (!id) return false;
    setLoading(true);
    try {
      const res = await updateDocument(id, {
        title: values.title,
        content: values.content,
        documentType: values.documentType,
        category: values.category,
      });
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.document.message.updateSuccess' }));
        onSuccess();
        onClose();
        return true;
      }
      return false;
    } catch (err) {
      message.error(getErrorMessage(err as any, 'pages.document.message.updateFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={intl.formatMessage({ id: 'pages.document.edit.title' })}
      placement="right"
      open={visible}
      onClose={onClose}
      size="large"
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'pages.document.form.title' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.document.form.titleRequired' }) }]}
        />
        <ProFormTextArea
          name="content"
          label={intl.formatMessage({ id: 'pages.document.form.content' })}
          rows={6}
        />
        <ProFormText
          name="documentType"
          label={intl.formatMessage({ id: 'pages.document.form.documentType' })}
        />
        <ProFormText
          name="category"
          label={intl.formatMessage({ id: 'pages.document.form.category' })}
        />
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>{intl.formatMessage({ id: 'pages.document.save' })}</Button>
            <Button onClick={onClose}>{intl.formatMessage({ id: 'pages.document.cancel' })}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default DocumentManagement;
