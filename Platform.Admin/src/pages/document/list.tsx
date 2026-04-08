import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProDescriptions, ModalForm, ProFormSelect, ProForm, ProFormText } from '@ant-design/pro-components';
import { Space, Tag, Button, Drawer, message, Input, Popconfirm, Upload, Row, Col } from 'antd';
import { FileTextOutlined, PlusOutlined, EyeOutlined, EditOutlined, SendOutlined, DeleteOutlined, CopyOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import {
  type Document,
  type DocumentStatistics,
  DocumentStatus,
} from '@/services/document/api';
import { getWorkflowList } from '@/services/workflow/api';

const documentStatusMap = {
  [DocumentStatus.Draft]: { text: '草稿', color: 'default' },
  [DocumentStatus.Approving]: { text: '审批中', color: 'processing' },
  [DocumentStatus.Approved]: { text: '已通过', color: 'success' },
  [DocumentStatus.Rejected]: { text: '已拒绝', color: 'error' },
};

const api = {
  list: (params: PageParams) => request<ApiResponse<PagedResult<Document>>>('/apiservice/api/documents', { params }),
  get: (id: string) => request<ApiResponse<Document>>(`/api/documents/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/api/documents/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Document>) => request<ApiResponse<Document>>('/apiservice/api/documents', { method: 'POST', data }),
  statistics: () => request<ApiResponse<DocumentStatistics>>('/apiservice/api/documents/statistics'),
};

const DocumentManagement: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as DocumentStatistics | null,
    detailVisible: false,
    viewingId: '',
    search: '',
    formVisible: false,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const columns: ProColumns<Document>[] = [
    { title: '标题', dataIndex: 'title', ellipsis: true, sorter: true, render: (dom: any, r) => <a onClick={() => set({ viewingId: r.id, detailVisible: true })}><FileTextOutlined /> {dom}</a> },
    { title: '类型', dataIndex: 'documentType', ellipsis: true, sorter: true },
    { title: '分类', dataIndex: 'category', ellipsis: true, sorter: true, render: (dom: any) => dom ? <Tag color="blue">{dom}</Tag> : '-' },
    {
      title: '状态', dataIndex: 'status', sorter: true,
      render: (dom: any) => {
        const status = documentStatusMap[dom as DocumentStatus] || { text: '未知', color: 'default' };
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    { title: '创建人', dataIndex: 'createdBy', ellipsis: true, sorter: true },
    { title: '创建时间', dataIndex: 'createdAt', sorter: true, valueType: 'dateTime' },
    {
      title: '操作', valueType: 'option', fixed: 'right', width: 180,
      render: (_: any, r: Document) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingId: r.id, detailVisible: true })}>查看</Button>
          {r.status === DocumentStatus.Draft && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => window.location.href = `/document/edit/${r.id}`}>编辑</Button>
              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => message.info('请在编辑页面提交审批')}>提交</Button>
            </>
          )}
          <Popconfirm title={`确定删除「${r.title}」？`} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
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
            <Space><FileTextOutlined />公文管理</Space>
            <Space size={12}>
              <Tag color="blue">总数 {state.statistics?.totalDocuments || 0}</Tag>
              <Tag color="default">草稿 {state.statistics?.draftCount || 0}</Tag>
              <Tag color="processing">审批中 {state.statistics?.pendingCount || 0}</Tag>
              <Tag color="success">已通过 {state.statistics?.approvedCount || 0}</Tag>
              <Tag color="error">已拒绝 {state.statistics?.rejectedCount || 0}</Tag>
            </Space>
          </Space>
        }
        request={async (params: any) => {
          const { current, pageSize } = params;
          const res = await api.list({ page: current, pageSize, search: state.search });
          api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns} rowKey="id" search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder="搜索..."
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ formVisible: true })}>新建公文</Button>,
        ]}
      />

      <ModalForm
        title="新建公文"
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false }); }}
        onFinish={async (values) => {
          const definitionId = values.workflowDefinitionId;
          if (!definitionId) {
            message.error('请先选择流程');
            return false;
          }
          window.location.href = `/document/create-by-workflow?definitionId=${definitionId}`;
          return true;
        }}
        width={500}
      >
        <ProFormSelect
          name="workflowDefinitionId"
          label="选择流程"
          placeholder="请选择流程定义"
          rules={[{ required: true, message: '请选择流程定义' }]}
          request={async () => {
            try {
              const resp = await getWorkflowList({ page: 1 });
              if (resp.success && resp.data) {
                return (resp.data.queryable || []).map((wf) => ({ label: wf.name, value: wf.id! }));
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
        <ProForm.Item
          name="attachments"
          label="附件（可在下一步继续上传）"
          extra="可在下一步继续上传更多附件"
        >
          <Upload
            name="files"
            multiple
            maxCount={10}
            action="/apiservice/api/upload"
            listType="text"
          >
            <Button icon={<UploadOutlined />}>上传附件</Button>
          </Upload>
        </ProForm.Item>
      </ModalForm>

      <Drawer title="公文详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DocumentDetail id={state.viewingId} />
      </Drawer>
    </PageContainer>
  );
};

const DocumentDetail: React.FC<{ id: string }> = ({ id }) => {
  const [doc, setDoc] = useState<Document | null>(null);
  useEffect(() => {
    if (id) api.get(id).then(r => { if (r.success && r.data) setDoc(r.data); });
  }, [id]);
  if (!doc) return null;
  return (
    <ProDescriptions column={1} bordered size="small">
      <ProDescriptions.Item label="标题"><strong>{doc.title}</strong></ProDescriptions.Item>
      <ProDescriptions.Item label="类型">{doc.documentType}</ProDescriptions.Item>
      <ProDescriptions.Item label="分类">{doc.category ? <Tag color="blue">{doc.category}</Tag> : '-'}</ProDescriptions.Item>
      <ProDescriptions.Item label="状态">
        <Tag color={documentStatusMap[doc.status]?.color || 'default'}>{documentStatusMap[doc.status]?.text || '未知'}</Tag>
      </ProDescriptions.Item>
      <ProDescriptions.Item label="创建人">{doc.createdBy}</ProDescriptions.Item>
      <ProDescriptions.Item label="创建时间">{dayjs(doc.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      <ProDescriptions.Item label="更新时间">{dayjs(doc.updatedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      {doc.content && <ProDescriptions.Item label="内容" span={1}><div dangerouslySetInnerHTML={{ __html: doc.content }} /></ProDescriptions.Item>}
    </ProDescriptions>
  );
};

export default DocumentManagement;
