import React, { useRef, useState, useEffect, useCallback } from 'react';
import { request } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Modal, Form, Input } from 'antd';
import { Drawer } from 'antd';
import { PageContainer, ModalForm, ProDescriptions, ProTable, ProColumns, ActionType, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { PlusOutlined, ExportOutlined, LockOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CopyOutlined, DownloadOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

interface Entry {
  id: string;
  platform: string;
  account: string;
  url?: string;
  category?: string;
  tags: string[];
  notes?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  password?: string;
}

interface Stats {
  totalEntries: number;
  categoryCount: number;
  tagCount: number;
  recentUsedCount: number;
}

const api = {
  list: (params: PageParams & { sort?: Record<string, any>; filter?: Record<string, any> }) => {
    const queryParams: Record<string, any> = {};
    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.search) queryParams.search = params.search;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    return request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params: queryParams });
  },
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
  statistics: () => request<ApiResponse<Stats>>('/apiservice/api/password-book/statistics'),
  export: (format: string) => request<any>('/apiservice/api/password-book/export', { method: 'POST', data: { format }, responseType: 'blob', getResponse: true }),
};

const PasswordBook: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as Stats | null,
    exportVisible: false,
    editingEntry: null as Entry | null,
    formVisible: false,
    detailVisible: false,
    viewingId: '',
    detailLoading: false,
    search: '' as string,
  });
  const [formState, setFormState] = useState({ tags: [] as string[] });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => {
      if (r.success && r.data) set({ statistics: r.data });
    });
  }, [set]);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);

  const handleView = (id: string) => {
    set({ viewingId: id, detailVisible: true });
  };

  const columns: ProColumns<Entry>[] = [
    { title: '平台', dataIndex: 'platform', key: 'platform', sorter: true },
    { title: '账号', dataIndex: 'account', key: 'account', sorter: true },
    { title: '网址', dataIndex: 'url', key: 'url', sorter: true, render: (dom) => dom ? <a href={dom as string} target="_blank">{dom}</a> : '-' },
    { title: '分类', dataIndex: 'category', key: 'category', sorter: true, render: (dom) => dom ? <Tag color="blue">{dom as string}</Tag> : '-' },
    { title: '标签', dataIndex: 'tags', render: (dom) => dom && typeof dom === 'object' && 'length' in dom ? <Space size={[0, 4]} wrap>{(dom as string[]).map((t) => <Tag key={t}>{t}</Tag>)}</Space> : '-' },
    { title: '最后使用', dataIndex: 'lastUsedAt', key: 'lastUsedAt', sorter: true, valueType: 'dateTime' },
    {
      title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleView(r.id)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={async () => {
            const res = await api.get(r.id);
            if (res.success && res.data) {
              set({ editingEntry: res.data, formVisible: true });
              setFormState(p => ({ ...p, tags: res.data?.tags || [] }));
            }
          }}>编辑</Button>
          <Popconfirm title={`确定删除「${r.platform}」？`} onConfirm={async () => { await api.delete(r.id); actionRef.current?.reload(); loadStatistics(); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleFinish = async (values: Record<string, any>) => {
    const data = {
      platform: values.platform,
      account: values.account,
      password: values.password,
      url: values.url,
      category: Array.isArray(values.category) ? values.category[0] : values.category,
      tags: formState.tags,
      notes: values.notes,
    };
    const res = state.editingEntry ? await api.update(state.editingEntry.id, data) : await api.create(data);
    if (res.success) {
      set({ formVisible: false, editingEntry: null });
      actionRef.current?.reload();
      loadStatistics();
    }
    return res.success;
  };

  const handleExport = async () => {
    const res = await api.export('json');
    const blob = res.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-book-${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    set({ exportVisible: false });
  };

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space><LockOutlined />密码本</Space>
            <Space size={12}>
              <Tag color="blue">总条目 {state.statistics?.totalEntries || 0}</Tag>
              <Tag color="green">分类 {state.statistics?.categoryCount || 0}</Tag>
              <Tag color="orange">标签 {state.statistics?.tagCount || 0}</Tag>
              <Tag color="purple">最近使用 {state.statistics?.recentUsedCount || 0}</Tag>
            </Space>
          </Space>
        }

        request={async (params: PageParams) => {
          const res = await api.list(params);
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}

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
          <Button key="export" icon={<ExportOutlined />} onClick={() => set({ exportVisible: true })}>导出</Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingEntry: null, formVisible: true })}>新建</Button>,
        ]}
      />



      <ModalForm
        key={state.editingEntry?.id || 'create'}
        title={state.editingEntry ? '编辑密码本' : '新建密码本'}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
        initialValues={state.editingEntry ? { platform: state.editingEntry.platform, account: state.editingEntry.account, password: state.editingEntry.password, url: state.editingEntry.url, category: state.editingEntry.category ? [state.editingEntry.category] : [], notes: state.editingEntry.notes } : undefined}
        onFinish={handleFinish}
        autoFocusFirstInput
        width={600}
      >
        <ProFormText name="platform" label="平台名称" placeholder="请输入平台名称" rules={[{ required: true, message: '请输入平台名称' }]} />
        <ProFormText name="account" label="账号" placeholder="请输入账号" rules={[{ required: true, message: '请输入账号' }]} />
        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
        <ProFormText name="url" label="网址" placeholder="请输入网址" />
        <ProFormSelect name="category" label="分类" placeholder="选择或输入分类" showSearch allowClear mode="tags" />
        <ProFormSelect name="tags" label="标签" placeholder="输入标签后按回车" mode="tags" />
        <ProFormTextArea name="notes" label="备注" placeholder="请输入备注" />
      </ModalForm>

      <Drawer title="密码本详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DetailContent id={state.viewingId} />
      </Drawer>

      <Modal title="导出密码本" open={state.exportVisible} onCancel={() => set({ exportVisible: false })} footer={null} width={400}>
        <Button type="primary" icon={<DownloadOutlined />} block onClick={handleExport}>导出 JSON</Button>
      </Modal>
    </PageContainer>
  );
};

const DetailContent: React.FC<{ id: string }> = ({ id }) => {
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => {
    if (id) api.get(id).then(r => { if (r.success && r.data) setEntry(r.data); });
  }, [id]);

  if (!entry) return null;

  return (
    <ProDescriptions column={1} bordered size="small">
      <ProDescriptions.Item label="平台"><strong>{entry.platform}</strong></ProDescriptions.Item>
      <ProDescriptions.Item label="账号">
        <Space>{entry.account}<CopyButton text={entry.account} /></Space>
      </ProDescriptions.Item>
      <ProDescriptions.Item label="密码">
        <Space>
          <Input.Password value={entry.password} variant="borderless" readOnly />
          <CopyButton text={entry.password || ''} />
        </Space>
      </ProDescriptions.Item>
      {entry.url && <ProDescriptions.Item label="网址"><a href={entry.url} target="_blank">{entry.url}</a></ProDescriptions.Item>}
      {entry.category && <ProDescriptions.Item label="分类"><Tag color="blue">{entry.category}</Tag></ProDescriptions.Item>}
      {entry.tags?.length > 0 && <ProDescriptions.Item label="标签"><Space wrap>{entry.tags.map(t => <Tag key={t}>{t}</Tag>)}</Space></ProDescriptions.Item>}
      {entry.lastUsedAt && <ProDescriptions.Item label="最后使用">{dayjs(entry.lastUsedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>}
      <ProDescriptions.Item label="创建时间">{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      <ProDescriptions.Item label="更新时间">{dayjs(entry.updatedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      {entry.notes && <ProDescriptions.Item label="备注" span={1}><div style={{ whiteSpace: 'pre-wrap' }}>{entry.notes}</div></ProDescriptions.Item>}
    </ProDescriptions>
  );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return <Button type="text" size="small" icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />} onClick={handleCopy}>{copied ? '已复制' : ''}</Button>;
};

export default PasswordBook;
