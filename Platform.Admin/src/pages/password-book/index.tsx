import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Space, Card, Row, Col, Button, Input, Popconfirm, Drawer, Descriptions, Modal, Typography, Select } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-form';
import { PlusOutlined, ExportOutlined, LockOutlined, FolderOutlined, ClockCircleOutlined, TagOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CopyOutlined, DownloadOutlined, KeyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';


// ==================== Types ====================
interface Entry { id: string; platform: string; account: string; url?: string; category?: string; tags: string[]; notes?: string; lastUsedAt?: string; createdAt: string; updatedAt: string; password?: string; }
interface Stats { totalEntries: number; categoryCount: number; tagCount: number; recentUsedCount: number; }
interface EntryFormData { platform: string; account: string; password?: string; url?: string; category?: string; tags: string[]; notes?: string; }
interface GenerateParams { length?: number; includeUppercase?: boolean; includeLowercase?: boolean; includeNumbers?: boolean; includeSymbols?: boolean; }

// ==================== API ====================
const api = {
  list: (params: PageParams) => request<ApiResponse<PagedResult<Entry>>>('/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/api/password-book/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/api/password-book/${id}`, { method: 'DELETE' }),
  create: (data: EntryFormData) => request<ApiResponse<Entry>>('/api/password-book', { method: 'POST', data }),
  update: (id: string, data: EntryFormData) => request<ApiResponse<Entry>>(`/api/password-book/${id}`, { method: 'PUT', data }),
  statistics: () => request<ApiResponse<Stats>>('/api/password-book/statistics'),
  categories: () => request<ApiResponse<string[]>>('/api/password-book/categories'),
  generate: (data: GenerateParams) => request<ApiResponse<{ password: string }>>('/api/password-book/generate', { method: 'POST', data }),
  export: (data: { format: string }) => request<any>('/api/password-book/export', { method: 'POST', data, responseType: 'blob', getResponse: true }),
};

// ==================== Main ====================
const PasswordBook: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({ statistics: null as Stats | null, exportVisible: false, editingEntry: null as Entry | null, formVisible: false, detailVisible: false, viewingId: '', sorter: undefined as { sortBy: string; sortOrder: string } | undefined, searchText: '' });
  const [formState, setFormState] = useState({ categories: [] as string[], tags: [] as string[], passwordValue: '', generatorVisible: false });
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));



  const columns: ProColumns<Entry>[] = [
    { title: '平台', dataIndex: 'platform', sorter: true, render: (dom: any, r) => <a onClick={() => set({ viewingId: r.id, detailVisible: true })}><LockOutlined /> {dom}</a> },
    { title: '账号', dataIndex: 'account', sorter: true },
    { title: '网址', dataIndex: 'url', sorter: true, render: (dom: any) => dom ? <a href={dom} target="_blank">{dom}</a> : '-' },
    { title: '分类', dataIndex: 'category', sorter: true, render: (dom: any) => dom ? <Tag color="blue">{dom}</Tag> : '-' },
    { title: '标签', dataIndex: 'tags', render: (dom: any) => dom?.length ? <Space size={[0, 4]} wrap>{dom.map((t: string) => <Tag key={t}>{t}</Tag>)}</Space> : '-' },
    { title: '最后使用', dataIndex: 'lastUsedAt', sorter: true, render: (dom: any) => dom ? new Date(dom).toLocaleString() : '-' },
    { title: '操作', valueType: 'option', fixed: 'right', width: 120, render: (_: any, r: Entry) => [
      <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => { set({ editingEntry: r, formVisible: true }); setFormState(p => ({ ...p, passwordValue: r.password || '', tags: r.tags || [] })); }}>编辑</Button>,
      <Popconfirm key="delete" title={`确定删除「${r.platform}」？`} onConfirm={async () => { await api.delete(r.id); actionRef.current?.reload(); }}><Button type="link" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>,
    ]},
  ];

  return (
    <PageContainer title={<Space><LockOutlined />密码本</Space>}>
      {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>
        {[{ key: 'totalEntries', title: '总条目数', icon: <LockOutlined />, color: '#1890ff' }, { key: 'categoryCount', title: '分类数量', icon: <FolderOutlined />, color: '#52c41a' }, { key: 'tagCount', title: '标签数量', icon: <TagOutlined />, color: '#722ed1' }, { key: 'recentUsedCount', title: '最近使用', icon: <ClockCircleOutlined />, color: '#faad14' }].map(i => (
          <Col xs={24} sm={12} md={6} key={i.key}><StatCard title={i.title} value={state.statistics![i.key as keyof Stats]} icon={i.icon} color={i.color} /></Col>
        ))}
      </Row></Card>}

      <ProTable actionRef={actionRef} request={async (params: any) => {
        const { pageSize, current } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await api.list({ page: current, pageSize, search: state.searchText, ...sortParams });
        api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [
          <Input.Search key="search" placeholder="搜索..." style={{ width: 200 }} allowClear value={state.searchText} onChange={(e) => set({ searchText: e.target.value })} onSearch={(v) => { set({ searchText: v }); actionRef.current?.reload(); }} prefix={<SearchOutlined />} />,
          <Button key="export" icon={<ExportOutlined />} onClick={() => set({ exportVisible: true })}>导出</Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingEntry: null, formVisible: true })}>新建</Button>,
        ]}
      />

      <ModalForm key={state.editingEntry?.id || 'create'} title={state.editingEntry ? '编辑密码本' : '新建密码本'} open={state.formVisible} onOpenChange={(open) => {
        if (!open) set({ formVisible: false, editingEntry: null });
      }}
        initialValues={state.editingEntry ? { platform: state.editingEntry.platform, account: state.editingEntry.account, url: state.editingEntry.url, category: state.editingEntry.category ? [state.editingEntry.category] : [], notes: state.editingEntry.notes } : undefined}
        onFinish={async (values) => {
          const data = { platform: values.platform, account: values.account, password: values.password || formState.passwordValue, url: values.url, category: Array.isArray(values.category) ? values.category[0] : values.category, tags: formState.tags, notes: values.notes };
          const res = state.editingEntry ? await api.update(state.editingEntry.id, data) : await api.create(data);
          if (res.success) { set({ formVisible: false, editingEntry: null }); actionRef.current?.reload(); api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }
          return res.success;
        }} autoFocusFirstInput width={600}>
        <ProFormText name="platform" label="平台名称" placeholder="例如：GitHub" rules={[{ required: true, message: '请输入平台名称' }]} />
        <ProFormText name="account" label="账号" placeholder="请输入账号" rules={[{ required: true, message: '请输入账号' }]} />
        <div style={{ marginBottom: 24 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>密码</Typography.Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password placeholder="请输入密码" value={formState.passwordValue} onChange={(e) => setFormState(p => ({ ...p, passwordValue: e.target.value }))} />
            <Button icon={<KeyOutlined />} onClick={() => setFormState(p => ({ ...p, generatorVisible: true }))} />
          </Space.Compact>
        </div>
        <ProFormText name="url" label="网址" placeholder="https://example.com" />
        <ProFormSelect name="category" label="分类" mode="tags" placeholder="选择或输入分类" showSearch allowClear options={formState.categories.map(c => ({ label: c, value: c }))} />
        <div style={{ marginBottom: 24 }}><Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>标签</Typography.Text><Select mode="tags" placeholder="输入标签后按回车" value={formState.tags} onChange={(v: string[]) => setFormState(p => ({ ...p, tags: v }))} style={{ width: '100%' }} /></div>
        <ProFormText name="notes" label="备注" placeholder="备注信息" />
        <Modal title="密码生成器" open={formState.generatorVisible} onCancel={() => setFormState(p => ({ ...p, generatorVisible: false }))} footer={[<Button onClick={() => setFormState(p => ({ ...p, generatorVisible: false }))}>取消</Button>, <Button type="primary" onClick={() => setFormState(p => ({ ...p, generatorVisible: false }))}>使用</Button>]} width={400}>
          <Button type="primary" icon={<KeyOutlined />} block>生成随机密码</Button>
        </Modal>
      </ModalForm>

      <Drawer title="密码本详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DetailContent id={state.viewingId} />
      </Drawer>

      <Modal title="导出密码本" open={state.exportVisible} onCancel={() => set({ exportVisible: false })} footer={null} width={400}>
        <Button type="primary" icon={<DownloadOutlined />} block onClick={async () => {
          const res = await api.export({ format: 'json' });
          const blob = res.data;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `password-book-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
          set({ exportVisible: false });
        }}>导出 JSON</Button>
      </Modal>
    </PageContainer>
  );
};

const DetailContent: React.FC<{ id: string }> = ({ id }) => {
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => { if (id) api.get(id).then(r => { if (r.success && r.data) setEntry(r.data); }); }, [id]);
  if (!entry) return null;
  const copy = (text: string) => navigator.clipboard.writeText(text);
  return (
    <>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="平台"><strong>{entry.platform}</strong></Descriptions.Item>
        <Descriptions.Item label="账号"><Space>{entry.account}<Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(entry.account)} /></Space></Descriptions.Item>
        <Descriptions.Item label="密码"><Space><Input.Password value={entry.password} variant="borderless" readOnly style={{ width: 150 }} /><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(entry.password || '')} /></Space></Descriptions.Item>
        {entry.url && <Descriptions.Item label="网址"><a href={entry.url} target="_blank">{entry.url}</a></Descriptions.Item>}
        {entry.category && <Descriptions.Item label="分类"><Tag color="blue">{entry.category}</Tag></Descriptions.Item>}
        {entry.tags?.length > 0 && <Descriptions.Item label="标签"><Space wrap>{entry.tags.map(t => <Tag key={t}>{t}</Tag>)}</Space></Descriptions.Item>}
        {entry.lastUsedAt && <Descriptions.Item label="最后使用">{dayjs(entry.lastUsedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>}
        <Descriptions.Item label="创建时间">{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{dayjs(entry.updatedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
      </Descriptions>
      {entry.notes && <Card title="备注" style={{ marginTop: 16 }}><div style={{ whiteSpace: 'pre-wrap' }}>{entry.notes}</div></Card>}
    </>
  );
};

export default PasswordBook;
