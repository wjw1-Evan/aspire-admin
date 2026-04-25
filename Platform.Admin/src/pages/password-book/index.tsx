import React, { useRef, useState, useEffect, useCallback } from 'react';
import { request, useIntl } from '@umijs/max';
import { Tag, Space, Button, Popconfirm, Modal, Form, Input, Grid } from 'antd';
import { Drawer } from 'antd';
import { PageContainer, ModalForm, ProDescriptions, ProTable, ProColumns, ActionType, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { PlusOutlined, ExportOutlined, LockOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CopyOutlined, DownloadOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

const { useBreakpoint } = Grid;

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
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
  statistics: () => request<ApiResponse<Stats>>('/apiservice/api/password-book/statistics'),
  export: (format: string) => request<any>('/apiservice/api/password-book/export', { method: 'POST', data: { format }, responseType: 'blob', getResponse: true }),
};

const PasswordBook: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
    { title: intl.formatMessage({ id: 'pages.passwordBook.table.platform' }), dataIndex: 'platform', key: 'platform', sorter: true },
    { title: intl.formatMessage({ id: 'pages.passwordBook.table.account' }), dataIndex: 'account', key: 'account', sorter: true },
    { title: intl.formatMessage({ id: 'pages.passwordBook.table.url' }), dataIndex: 'url', key: 'url', sorter: true, render: (dom) => dom ? <a href={dom as string} target="_blank">{dom}</a> : '-' },
    { title: intl.formatMessage({ id: 'pages.passwordBook.table.category' }), dataIndex: 'category', key: 'category', sorter: true, render: (dom) => dom ? <Tag color="blue">{dom as string}</Tag> : '-' },
    { title: intl.formatMessage({ id: 'pages.passwordBook.table.tags' }), dataIndex: 'tags', render: (dom) => dom && typeof dom === 'object' && 'length' in dom ? <Space size={[0, 4]} wrap>{(dom as string[]).map((t) => <Tag key={t}>{t}</Tag>)}</Space> : '-' },
    { title: intl.formatMessage({ id: 'pages.passwordBook.table.lastUsedAt' }), dataIndex: 'lastUsedAt', key: 'lastUsedAt', sorter: true, valueType: 'dateTime' },
    {
      title: intl.formatMessage({ id: 'pages.table.action' }), key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => handleView(r.id)}>{intl.formatMessage({ id: 'pages.action.view' })}</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={async () => {
            const res = await api.get(r.id);
            if (res.success && res.data) {
              set({ editingEntry: res.data, formVisible: true });
              setFormState(p => ({ ...p, tags: res.data?.tags || [] }));
            }
          }}>{intl.formatMessage({ id: 'pages.action.edit' })}</Button>
          <Popconfirm title={intl.formatMessage({ id: 'pages.passwordBook.message.confirmDelete', defaultMessage: '确定删除？' }, { name: r.platform })} onConfirm={async () => { await api.delete(r.id); actionRef.current?.reload(); loadStatistics(); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.action.delete' })}</Button>
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
            <Space><LockOutlined />{intl.formatMessage({ id: 'pages.passwordBook.title' })}</Space>
            <Space size={12}>
              <Tag color="blue">{intl.formatMessage({ id: 'pages.passwordBook.statistics.totalEntries' })} {state.statistics?.totalEntries || 0}</Tag>
              <Tag color="green">{intl.formatMessage({ id: 'pages.passwordBook.statistics.categoryCount' })} {state.statistics?.categoryCount || 0}</Tag>
              <Tag color="orange">{intl.formatMessage({ id: 'pages.passwordBook.statistics.tagCount' })} {state.statistics?.tagCount || 0}</Tag>
              <Tag color="purple">{intl.formatMessage({ id: 'pages.passwordBook.statistics.recentUsedCount' })} {state.statistics?.recentUsedCount || 0}</Tag>
            </Space>
          </Space>
        }

        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, search: state.search, sort, filter });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}

        columns={columns}
        rowKey="id"
        search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.common.search' })}
            allowClear
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
            prefix={<SearchOutlined />}
          />,
          <Button key="export" icon={<ExportOutlined />} onClick={() => set({ exportVisible: true })}>{intl.formatMessage({ id: 'pages.passwordBook.action.export' })}</Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingEntry: null, formVisible: true })}>{intl.formatMessage({ id: 'pages.action.create' })}</Button>,
        ]}
      />



      <ModalForm
        key={state.editingEntry?.id || 'create'}
        title={state.editingEntry ? intl.formatMessage({ id: 'pages.passwordBook.form.edit' }) : intl.formatMessage({ id: 'pages.passwordBook.form.create' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
        initialValues={state.editingEntry ? { platform: state.editingEntry.platform, account: state.editingEntry.account, password: state.editingEntry.password, url: state.editingEntry.url, category: state.editingEntry.category ? [state.editingEntry.category] : [], notes: state.editingEntry.notes } : undefined}
        onFinish={handleFinish}
        autoFocusFirstInput
        width={600}
      >
        <ProFormText name="platform" label={intl.formatMessage({ id: 'pages.passwordBook.form.platform' })} placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.platformPlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.passwordBook.form.platformRequired' }) }]} />
        <ProFormText name="account" label={intl.formatMessage({ id: 'pages.passwordBook.form.account' })} placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.accountPlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.passwordBook.form.accountRequired' }) }]} />
        <Form.Item name="password" label={intl.formatMessage({ id: 'pages.passwordBook.form.password' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.passwordBook.form.passwordRequired' }) }]}>
          <Input.Password placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.passwordPlaceholder' })} />
        </Form.Item>
        <ProFormText name="url" label={intl.formatMessage({ id: 'pages.passwordBook.form.url' })} placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.urlPlaceholder' })} />
        <ProFormSelect name="category" label={intl.formatMessage({ id: 'pages.passwordBook.form.category' })} placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.categoryPlaceholder' })} showSearch allowClear mode="tags" />
        <ProFormSelect name="tags" label={intl.formatMessage({ id: 'pages.passwordBook.form.tags' })} placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.tagsPlaceholder' })} mode="tags" />
        <ProFormTextArea name="notes" label={intl.formatMessage({ id: 'pages.passwordBook.form.notes' })} placeholder={intl.formatMessage({ id: 'pages.passwordBook.form.notesPlaceholder' })} />
      </ModalForm>

      <Drawer title={intl.formatMessage({ id: 'pages.passwordBook.detail.title' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DetailContent id={state.viewingId} isMobile={isMobile} />
      </Drawer>

      <Modal title={intl.formatMessage({ id: 'pages.passwordBook.export.title' })} open={state.exportVisible} onCancel={() => set({ exportVisible: false })} footer={null} width={400}>
        <Button type="primary" icon={<DownloadOutlined />} block onClick={handleExport}>{intl.formatMessage({ id: 'pages.passwordBook.export.json' })}</Button>
      </Modal>
    </PageContainer>
  );
};

const DetailContent: React.FC<{ id: string; isMobile: boolean }> = ({ id, isMobile }) => {
  const intl = useIntl();
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => {
    if (id) api.get(id).then(r => { if (r.success && r.data) setEntry(r.data); });
  }, [id]);

  if (!entry) return null;

  return (
    <ProDescriptions column={isMobile ? 1 : 2} bordered size="small">
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.platform' })} span={2}><strong>{entry.platform}</strong></ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.account' })}>
        <Space>{entry.account}<CopyButton text={entry.account} /></Space>
      </ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.password' })}>
        <Space>
          <Input.Password value={entry.password} variant="borderless" readOnly />
          <CopyButton text={entry.password || ''} />
        </Space>
      </ProDescriptions.Item>
      {entry.url && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.url' })} span={2}><a href={entry.url} target="_blank">{entry.url}</a></ProDescriptions.Item>}
      {entry.category && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.category' })}><Tag color="blue">{entry.category}</Tag></ProDescriptions.Item>}
      {entry.tags?.length > 0 && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.tags' })}><Space wrap>{entry.tags.map(t => <Tag key={t}>{t}</Tag>)}</Space></ProDescriptions.Item>}
      {entry.lastUsedAt && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.lastUsedAt' })}>{dayjs(entry.lastUsedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>}
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.createdAt' })}>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.updatedAt' })}>{dayjs(entry.updatedAt).format('YYYY-MM-DD HH:mm')}</ProDescriptions.Item>
      {entry.notes && <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.passwordBook.detail.notes' })} span={2}><div style={{ whiteSpace: 'pre-wrap' }}>{entry.notes}</div></ProDescriptions.Item>}
    </ProDescriptions>
  );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return <Button type="text" size="small" icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />} onClick={handleCopy}>{copied ? intl.formatMessage({ id: 'pages.passwordBook.copied' }) : ''}</Button>;
};

export default PasswordBook;
