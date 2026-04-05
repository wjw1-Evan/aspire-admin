import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import { Space, Tag, Button, Card, Row, Col, Drawer, message } from 'antd';
import { FileTextOutlined, PlusOutlined, EyeOutlined, EditOutlined, SendOutlined, DeleteOutlined, ReloadOutlined, FileProtectOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types/api-response';
import {
  type Document,
  type DocumentStatistics,
  DocumentStatus,
} from '@/services/document/api';

const documentStatusMap = {
  [DocumentStatus.Draft]: { text: '草稿', color: 'default' },
  [DocumentStatus.Approving]: { text: '审批中', color: 'processing' },
  [DocumentStatus.Approved]: { text: '已通过', color: 'success' },
  [DocumentStatus.Rejected]: { text: '已拒绝', color: 'error' },
};

const api = {
  list: (params: PageParams) => request<ApiResponse<PagedResult<Document>>>('/api/documents', { params }),
  get: (id: string) => request<ApiResponse<Document>>(`/api/documents/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/api/documents/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Document>) => request<ApiResponse<Document>>('/api/documents', { method: 'POST', data }),
  statistics: () => request<ApiResponse<DocumentStatistics>>('/api/documents/statistics'),
};

const DocumentManagement: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as DocumentStatistics | null,
    detailVisible: false,
    viewingId: '',
  });
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

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
    { title: '创建时间', dataIndex: 'createdAt', sorter: true, render: (dom: any) => dayjs(dom).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', valueType: 'option', fixed: 'right', width: 180,
      render: (_: any, r: Document) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingId: r.id, detailVisible: true })}>查看</Button>
          {r.status === DocumentStatus.Draft && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => window.location.href = `/document/edit/${r.id}`}>编辑</Button>
              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => message.info('请在编辑页面提交审批')}>提交</Button>
            </>
          )}
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={async () => {
            await api.delete(r.id!);
            actionRef.current?.reload();
            api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); });
          }}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title={<Space><FileTextOutlined />公文管理</Space>}>
      {state.statistics && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            {[
              { key: 'totalDocuments', title: '总数', icon: <FileTextOutlined />, color: '#1890ff' },
              { key: 'draftCount', title: '草稿', icon: <FileProtectOutlined />, color: '#999' },
              { key: 'pendingCount', title: '审批中', icon: <ClockCircleOutlined />, color: '#faad14' },
              { key: 'approvedCount', title: '已通过', icon: <CheckCircleOutlined />, color: '#52c41a' },
              { key: 'rejectedCount', title: '已拒绝', icon: <CloseCircleOutlined />, color: '#f5222d' },
            ].map(item => (
              <Col xs={12} sm={8} md={4} key={item.key}>
                <StatCard title={item.title} value={(state.statistics as any)[item.key] || 0} icon={item.icon} color={item.color} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <ProTable actionRef={actionRef}
        request={async (params: any) => {
          const { pageSize, current } = params;
          const res = await api.list({ page: current, pageSize });
          api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns} rowKey="id" search={false}
        pagination={{ pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 20 }}
        toolBarRender={() => [
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>刷新</Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => window.location.href = '/document/create'}>新建公文</Button>,
        ]}
      />

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
  const status = documentStatusMap[doc.status] || { text: '未知', color: 'default' };
  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col span={24}><strong style={{ fontSize: 18 }}>{doc.title}</strong></Col>
        <Col span={12}>类型：{doc.documentType}</Col>
        <Col span={12}>分类：{doc.category || '-'}</Col>
        <Col span={12}>状态：<Tag color={status.color}>{status.text}</Tag></Col>
        <Col span={12}>创建人：{doc.createdBy}</Col>
        <Col span={12}>创建时间：{dayjs(doc.createdAt).format('YYYY-MM-DD HH:mm')}</Col>
        <Col span={12}>更新时间：{dayjs(doc.updatedAt).format('YYYY-MM-DD HH:mm')}</Col>
      </Row>
      {doc.content && (
        <Card title="内容" style={{ marginTop: 16 }}>
          <div dangerouslySetInnerHTML={{ __html: doc.content }} />
        </Card>
      )}
    </div>
  );
};

export default DocumentManagement;
