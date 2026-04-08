import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PageContainer, ProDescriptions } from '@ant-design/pro-components';
import { Space, Tag, Button, Tabs, Drawer, message, Input } from 'antd';
import { CheckCircleOutlined, FileTextOutlined, CloseOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types';
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
  pending: (params: PageParams) => request<ApiResponse<PagedResult<Document>>>('/apiservice/api/documents/pending', { params }),
  list: (params: PageParams & { filterType?: string }) => request<ApiResponse<PagedResult<Document>>>('/apiservice/api/documents', { params }),
  get: (id: string) => request<ApiResponse<Document>>(`/api/documents/${id}`),
  approve: (id: string) => request<ApiResponse<boolean>>(`/api/documents/${id}/approve`, { method: 'POST' }),
  reject: (id: string, comment: string) => request<ApiResponse<boolean>>(`/api/documents/${id}/reject`, { method: 'POST', data: { comment } }),
  delete: (id: string) => request<ApiResponse<void>>(`/api/documents/${id}`, { method: 'DELETE' }),
  statistics: () => request<ApiResponse<DocumentStatistics>>('/apiservice/api/documents/statistics'),
};

const ApprovalPage: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as DocumentStatistics | null,
    activeTab: 'pending',
    detailVisible: false,
    viewingId: '',
    search: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  useEffect(() => {
    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
  }, []);

  const columns: ProColumns<Document>[] = [
    { title: '标题', dataIndex: 'title', ellipsis: true, sorter: true, render: (dom: any, r) => <a onClick={() => set({ viewingId: r.id, detailVisible: true })}>{dom}</a> },
    { title: '类型', dataIndex: 'documentType', ellipsis: true, sorter: true },
    { title: '分类', dataIndex: 'category', ellipsis: true, render: (dom: any) => dom ? <Tag color="blue">{dom}</Tag> : '-' },
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
          {state.activeTab === 'pending' && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={async () => { await api.approve(r.id!); message.success('审批通过'); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>通过</Button>
              <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={async () => { await api.reject(r.id!, '不符合要求'); message.success('已拒绝'); actionRef.current?.reload(); api.statistics().then(res => { if (res.success && res.data) set({ statistics: res.data }); }); }}>拒绝</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const fetchData = async (params: any) => {
    const { current, pageSize } = params;
    let res;
    if (state.activeTab === 'pending') {
      res = await api.pending({ page: current, pageSize, search: state.search });
    } else {
      res = await api.list({ page: current, pageSize, filterType: state.activeTab, search: state.search });
    }
    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
  };

  const tabItems = [
    { key: 'pending', label: '待审批', fetchData: () => fetchData },
    { key: 'approved', label: '已通过', fetchData: () => fetchData },
    { key: 'rejected', label: '已拒绝', fetchData: () => fetchData },
  ];

  return (
    <PageContainer>
      <Tabs
        activeKey={state.activeTab}
        onChange={(key) => { set({ activeTab: key }); actionRef.current?.reload(); }}
        items={[
          {
            key: 'pending',
            label: (
              <Space>
                <span>待审批</span>
                {state.statistics?.pendingCount ? <Tag color="processing">{state.statistics.pendingCount}</Tag> : null}
              </Space>
            ),
            children: (
              <ProTable
                actionRef={actionRef}
                headerTitle={
                  <Space size={24}>
                    <Space><CheckCircleOutlined />公文审批</Space>
                    <Space size={12}>
                      <Tag color="processing">待审批 {state.statistics?.pendingCount || 0}</Tag>
                      <Tag color="blue">我发起 {state.statistics?.myCreatedCount || 0}</Tag>
                      <Tag color="success">已通过 {state.statistics?.approvedCount || 0}</Tag>
                      <Tag color="error">已拒绝 {state.statistics?.rejectedCount || 0}</Tag>
                    </Space>
                  </Space>
                }
                request={fetchData}
                columns={columns}
                rowKey="id"
                search={false}
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
                ]}
              />
            ),
          },
          {
            key: 'approved',
            label: '已通过',
            children: (
              <ProTable
                actionRef={actionRef}
                request={fetchData}
                columns={columns}
                rowKey="id"
                search={false}
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
                ]}
              />
            ),
          },
          {
            key: 'rejected',
            label: '已拒绝',
            children: (
              <ProTable
                actionRef={actionRef}
                request={fetchData}
                columns={columns}
                rowKey="id"
                search={false}
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
                ]}
              />
            ),
          },
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
  useEffect(() => { if (id) api.get(id).then(r => { if (r.success && r.data) setDoc(r.data); }); }, [id]);
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

export default ApprovalPage;
