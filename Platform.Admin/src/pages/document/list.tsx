import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useIntl } from '@umijs/max';
import { PageContainer, ProDescriptions, ModalForm, ProFormSelect } from '@ant-design/pro-components';
import { Space, Tag, Button, App, Input, Popconfirm } from 'antd';
import { Drawer } from 'antd';
import { FileTextOutlined, PlusOutlined, EyeOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';
import {
  type Document,
  type DocumentStatistics,
  DocumentStatus,
  submitDocument,
} from '@/services/document/api';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { getWorkflowList } from '@/services/workflow/api';

const documentStatusMap = {
  [DocumentStatus.Draft]: { textId: 'pages.document.status.draft', defaultText: '草稿', color: 'default' },
  [DocumentStatus.Approving]: { textId: 'pages.document.status.approving', defaultText: '审批中', color: 'processing' },
  [DocumentStatus.Approved]: { textId: 'pages.document.status.approved', defaultText: '已通过', color: 'success' },
  [DocumentStatus.Rejected]: { textId: 'pages.document.status.rejected', defaultText: '已拒绝', color: 'error' },
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
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const columns: ProColumns<Document>[] = [
    { title: intl.formatMessage({ id: 'pages.document.columns.title', defaultMessage: '标题' }), dataIndex: 'title', ellipsis: true, sorter: true, render: (dom: any, r) => <a onClick={() => set({ viewingId: r.id, detailVisible: true })}><FileTextOutlined /> {dom}</a> },
    { title: intl.formatMessage({ id: 'pages.document.columns.type', defaultMessage: '类型' }), dataIndex: 'documentType', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.document.columns.category', defaultMessage: '分类' }), dataIndex: 'category', ellipsis: true, sorter: true, render: (dom: any) => dom ? <Tag color="blue">{dom}</Tag> : '-' },
    {
      title: intl.formatMessage({ id: 'pages.document.columns.status', defaultMessage: '状态' }), dataIndex: 'status', sorter: true,
      render: (dom: any) => {
        const status = documentStatusMap[dom as DocumentStatus] || { textId: 'pages.document.status.unknown', defaultText: '未知', color: 'default' };
        return <Tag color={status.color}>{intl.formatMessage({ id: status.textId, defaultMessage: status.defaultText })}</Tag>;
      },
    },
    { title: intl.formatMessage({ id: 'pages.document.columns.createdBy', defaultMessage: '创建人' }), dataIndex: 'createdBy', ellipsis: true, sorter: true },
    { title: intl.formatMessage({ id: 'pages.document.columns.createdAt', defaultMessage: '创建时间' }), dataIndex: 'createdAt', sorter: true, valueType: 'dateTime' },
    {
      title: intl.formatMessage({ id: 'pages.document.table.action', defaultMessage: '操作' }), valueType: 'option', fixed: 'right', width: 180,
      render: (_: any, r: Document) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingId: r.id, detailVisible: true })}>{intl.formatMessage({ id: 'pages.document.view', defaultMessage: '查看' })}</Button>
          {r.status === DocumentStatus.Draft && (
            <>
              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => set({ submitVisible: true, submittingId: r.id! })}>{intl.formatMessage({ id: 'pages.document.submit', defaultMessage: '提交' })}</Button>
            </>
          )}
          <Popconfirm title={intl.formatMessage({ id: 'pages.document.deleteConfirm', defaultMessage: '确定删除「{title}」？' }, { title: r.title })} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.document.delete', defaultMessage: '删除' })}</Button>
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
            <Space><FileTextOutlined />{intl.formatMessage({ id: 'pages.document.title', defaultMessage: '公文管理' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.document.statistics.total', defaultMessage: '总数' })} {state.statistics?.totalDocuments || 0}</Tag>
              <Tag color="default">{intl.formatMessage({ id: 'pages.document.statistics.draft', defaultMessage: '草稿' })} {state.statistics?.draftCount || 0}</Tag>
              <Tag color="processing">{intl.formatMessage({ id: 'pages.document.statistics.pending', defaultMessage: '审批中' })} {state.statistics?.pendingCount || 0}</Tag>
              <Tag color="success">{intl.formatMessage({ id: 'pages.document.statistics.approved', defaultMessage: '已通过' })} {state.statistics?.approvedCount || 0}</Tag>
              <Tag color="error">{intl.formatMessage({ id: 'pages.document.statistics.rejected', defaultMessage: '已拒绝' })} {state.statistics?.rejectedCount || 0}</Tag>
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
            placeholder={intl.formatMessage({ id: 'pages.document.searchPlaceholder', defaultMessage: '搜索...' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ formVisible: true })}>{intl.formatMessage({ id: 'pages.document.createDocument', defaultMessage: '新建公文' })}</Button>,
        ]}
      />

      <ModalForm
        title={intl.formatMessage({ id: 'pages.document.createDocument', defaultMessage: '新建公文' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false }); }}
        onFinish={async (values) => {
          const definitionId = values.workflowDefinitionId;
          if (!definitionId) {
            message.warning(intl.formatMessage({ id: 'pages.document.message.selectWorkflowFirst', defaultMessage: '请先选择流程' }));
            return false;
          }
          window.location.href = `/document/create-by-workflow?definitionId=${definitionId}`;
          return true;
        }}
        width={500}
      >
        <ProFormSelect
          name="workflowDefinitionId"
          label={intl.formatMessage({ id: 'pages.document.selectWorkflow', defaultMessage: '选择流程' })}
          placeholder={intl.formatMessage({ id: 'pages.document.selectWorkflowPlaceholder', defaultMessage: '请选择流程定义' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.document.selectWorkflowRequired', defaultMessage: '请选择流程定义' }) }]}
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

      <Drawer title={intl.formatMessage({ id: 'pages.document.detail', defaultMessage: '公文详情' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DocumentDetail id={state.viewingId} />
      </Drawer>

      <ModalForm
        title={intl.formatMessage({ id: 'pages.document.submitApproval', defaultMessage: '提交审批' })}
        open={state.submitVisible}
        onOpenChange={(open) => { if (!open) set({ submitVisible: false, submittingId: '' }); }}
        onFinish={async (values) => {
          if (!values.workflowDefinitionId) {
            message.error(intl.formatMessage({ id: 'pages.document.message.selectWorkflow', defaultMessage: '请选择流程' }));
            return false;
          }
          try {
            const res = await submitDocument(state.submittingId, { workflowDefinitionId: values.workflowDefinitionId });
            if (res.success) {
              message.success(intl.formatMessage({ id: 'pages.document.message.submitted', defaultMessage: '已提交审批' }));
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
          label={intl.formatMessage({ id: 'pages.document.selectWorkflow', defaultMessage: '选择流程' })}
          placeholder={intl.formatMessage({ id: 'pages.document.selectWorkflowPlaceholder', defaultMessage: '请选择流程定义' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.document.selectWorkflowRequired', defaultMessage: '请选择流程定义' }) }]}
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
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.title', defaultMessage: '标题' })}><strong>{doc.title}</strong></ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.type', defaultMessage: '类型' })}>{doc.documentType}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.category', defaultMessage: '分类' })}>{doc.category ? <Tag color="blue">{doc.category}</Tag> : '-'}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.status', defaultMessage: '状态' })}>
        <Tag color={documentStatusMap[doc.status]?.color || 'default'}>{intl.formatMessage({ id: documentStatusMap[doc.status]?.textId, defaultMessage: documentStatusMap[doc.status]?.defaultText || '未知' })}</Tag>
      </ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.createdBy', defaultMessage: '创建人' })}>{doc.createdBy}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.createdAt', defaultMessage: '创建时间' })}>{dayjs(doc.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.updatedAt', defaultMessage: '更新时间' })}>{dayjs(doc.updatedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      {doc.content && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.document.columns.content', defaultMessage: '内容' })} span={1}><div dangerouslySetInnerHTML={{ __html: doc.content }} /></ProDescriptions.Item>}
    </ProDescriptions>
  );
};

export default DocumentManagement;
