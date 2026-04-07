import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { App, Button, Tag, Space, Modal, Badge, Spin, Input, Typography, Form, Select } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormSwitch, ProFormDatePicker, ProFormDateRangePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, ReloadOutlined, CrownOutlined, SearchOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import dayjs from 'dayjs';
import type { Role } from '@/services/role/api';
import { getCurrentCompany } from '@/services/company';

const UserDetail = React.lazy(() => import('./components/UserDetail'));

// ==================== Types ====================
interface AppUser {
  id: string; username: string; name?: string; email?: string; phoneNumber?: string;
  age?: number; isActive: boolean; createdAt: string; updatedAt?: string; lastLoginAt?: string;
  roleIds?: string[]; organizations?: Array<{ id?: string; name?: string; fullPath?: string; isPrimary?: boolean }>; remark?: string;
}
interface UserStats { totalUsers: number; activeUsers: number; adminUsers: number; newUsersThisMonth: number; }
interface JoinReq {
  id: string; username: string; userEmail?: string; reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; rejectReason?: string;
  reviewedByName?: string; reviewedAt?: string; createdAt: string;
}

// ==================== API ====================
const api = {
  list: (p: PageParams) => request<ApiResponse<PagedResult<AppUser>>>('/api/users/list', { method: 'POST', data: p }),
  stats: () => request<ApiResponse<UserStats>>('/api/users/statistics', { method: 'GET' }),
  del: (id: string, reason?: string) => request<ApiResponse<unknown>>(`/api/users/${id}`, { method: 'DELETE', params: reason ? { reason } : undefined }),
  bulk: (ids: string[], action: string, reason?: string) => request<ApiResponse<unknown>>('/api/users/bulk', { method: 'POST', data: { userIds: ids, action, reason } }),
  activate: (id: string) => request<ApiResponse<unknown>>(`/api/users/${id}/activate`, { method: 'PUT' }),
  deactivate: (id: string) => request<ApiResponse<unknown>>(`/api/users/${id}/deactivate`, { method: 'PUT' }),
  create: (d: unknown) => request<ApiResponse<AppUser>>('/api/users', { method: 'POST', data: d }),
  update: (id: string, d: unknown) => request<ApiResponse<AppUser>>(`/api/users/${id}`, { method: 'PUT', data: d }),
  searchUsers: (s: string) => request<ApiResponse<{ users: AppUser[]; total: number }>>('/api/users/all', { method: 'GET', params: { search: s } }),
  joinReqs: (cid: string, status?: string) => request<ApiResponse<JoinReq[]>>(`/api/company/${cid}/join-requests`, { params: { status } }),
  approveJoin: (id: string) => request<ApiResponse<unknown>>(`/api/company/join-requests/${id}/approve`, { method: 'POST', data: {} }),
  rejectJoin: (id: string, d: { rejectReason: string }) => request<ApiResponse<unknown>>(`/api/company/join-requests/${id}/reject`, { method: 'POST', data: d }),
  roles: () => request<ApiResponse<PagedResult<Role>>>('/api/role', { method: 'GET' }),
};

// ==================== Main ====================
const UserManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const joinActionRef = useRef<ActionType>(null);
  const joinRef = useRef<PageParams>({});
  const [activeTab, setActiveTab] = useState('members');
  const [state, setState] = useState({
    selectedRows: [] as AppUser[], editingUser: null as AppUser | null, formVisible: false,
    detailVisible: false, viewingUser: null as AppUser | null, statistics: null as UserStats | null,
    roleMap: {} as Record<string, string>, currentCompany: null as { id?: string; createdBy?: string } | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    searchParams: { sortBy: 'createdAt', sortOrder: 'desc' } as PageParams,
    search: '',
  });
  const [form, setForm] = useState({ roles: [] as Role[], searchingUsers: false, userOptions: [] as AppUser[], selectedUser: null as AppUser | null });
  const [join, setJoin] = useState({ data: [] as JoinReq[], loading: false, page: 1, total: 0, rejectModal: false, rejectId: '', rejectReason: '' });
  const set = useCallback((p: Partial<typeof state>) => setState(prev => ({ ...prev, ...p })), []);
  const setF = useCallback((p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p })), []);
  const setJ = useCallback((p: Partial<typeof join>) => setJoin(prev => ({ ...prev, ...p })), []);

  const loadStatistics = useCallback(async () => {
    const res = await api.stats();
    if (res.success && res.data) set({ statistics: res.data });
  }, []);

  const handleSearch = useCallback((params: PageParams) => {
    set({ searchParams: { ...state.searchParams, ...params, page: 1 } });
    actionRef.current?.reload();
  }, [state.searchParams]);

  const handleToggle = useCallback(async (user: AppUser) => {
    const res = user.isActive ? await api.deactivate(user.id) : await api.activate(user.id);
    if (res.success) {
      message.success(user.isActive ? intl.formatMessage({ id: 'pages.userManagement.userDeactivated' }) : intl.formatMessage({ id: 'pages.userManagement.userActivated' }));
      loadStatistics(); actionRef.current?.reload();
    }
  }, [intl, message]);

  const promptDelete = useCallback((userId: string, isBulk = false, count = 1) => {
    let reason = '';
    modal.confirm({
      title: isBulk ? intl.formatMessage({ id: 'pages.modal.confirmBatchDelete' }, { count }) : intl.formatMessage({ id: 'pages.modal.confirmDeleteUser' }),
      content: <Input.TextArea rows={3} placeholder={intl.formatMessage({ id: 'pages.modal.pleaseEnterReasonOptional' })} onChange={(e) => { reason = e.target.value; }} maxLength={200} />,
      okText: intl.formatMessage({ id: 'pages.modal.okDelete' }), cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }), okType: 'danger',
      onOk: async () => {
        const res = isBulk ? await api.bulk([userId], 'delete', reason) : await api.del(userId, reason);
        if (res.success) { message.success(isBulk ? '批量删除成功' : intl.formatMessage({ id: 'pages.message.deleteSuccess' })); set({ selectedRows: [] }); loadStatistics(); actionRef.current?.reload(); }
      },
    });
  }, [intl, modal, message, loadStatistics]);

  const handleBulk = useCallback(async (action: string) => {
    if (!state.selectedRows.length) { message.warning(intl.formatMessage({ id: 'pages.message.pleaseSelect' })); return; }
    if (action === 'delete') { promptDelete(state.selectedRows.map(u => u.id).join(','), true, state.selectedRows.length); return; }
    const res = await api.bulk(state.selectedRows.map(u => u.id), action);
    if (res.success) { message.success(intl.formatMessage({ id: 'pages.message.success' })); set({ selectedRows: [] }); loadStatistics(); actionRef.current?.reload(); }
  }, [state.selectedRows, intl, message, loadStatistics, promptDelete]);

  const roleOptions = useMemo(() => form.roles.filter((r): r is Role & { id: string } => Boolean(r.id)).map(r => ({ label: r.name, value: r.id })), [form.roles]);

  const columns: ProColumns<AppUser>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.table.username' }), dataIndex: 'username', key: 'username', sorter: true, render: (dom, r) => (<Space><UserOutlined /><a onClick={() => set({ viewingUser: r, detailVisible: true })}>{dom}</a>{state.currentCompany?.createdBy === r.id && <Tag icon={<CrownOutlined />} color="gold">{intl.formatMessage({ id: 'pages.userManagement.role.creator' })}</Tag>}</Space>) },
    { title: '姓名', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true, render: (dom: React.ReactNode) => dom || '-' },
    { title: intl.formatMessage({ id: 'pages.table.email' }), dataIndex: 'email', key: 'email', ellipsis: true, responsive: ['md'], sorter: true },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true, responsive: ['lg'] },
    { title: '年龄', dataIndex: 'age', width: 80, responsive: ['lg'], render: (dom: React.ReactNode) => dom || '-' },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true, responsive: ['xl'] },
    { title: intl.formatMessage({ id: 'pages.table.role' }), dataIndex: 'roleIds', responsive: ['md'], render: (_, r) => (!r.roleIds?.length ? <Tag color="default">{intl.formatMessage({ id: 'pages.table.unassigned' })}</Tag> : <Space wrap>{r.roleIds.map(id => <Tag key={id} color="blue">{state.roleMap[id] || id}</Tag>)}</Space>) },
    { title: intl.formatMessage({ id: 'pages.table.organization' }), dataIndex: 'organizations', responsive: ['lg'], render: (_, r) => {
      const orgs = r.organizations || [];
      if (!orgs.length) return <Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.userManagement.organization.empty' })}</Typography.Text>;
      return <Space direction="vertical" size={4} wrap>{orgs.map(o => <Space key={o.id || o.fullPath || o.name} size={4}><span>{o.fullPath || o.name || '-'}</span>{o.isPrimary && <Tag color="gold" variant="filled">{intl.formatMessage({ id: 'pages.userManagement.organization.primary' })}</Tag>}</Space>)}</Space>;
    }},
    { title: intl.formatMessage({ id: 'pages.table.status' }), dataIndex: 'isActive', key: 'isActive', render: (_, r) => <Badge status={r.isActive ? 'success' : 'error'} text={r.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })} /> },
    { title: intl.formatMessage({ id: 'pages.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.lastLogin' }), dataIndex: 'lastLoginAt', key: 'lastLoginAt', valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.actions' }), key: 'action', fixed: 'right', width: 150, valueType: 'option', render: (_, r) => (<Space><Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingUser: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => promptDelete(r.id)}>{intl.formatMessage({ id: 'pages.table.delete' })}</Button></Space>) },
  ], [intl, state.roleMap, state.currentCompany, promptDelete]);

  // ==================== Join Requests ====================
  const fetchJoin = useCallback(async () => {
    if (!state.currentCompany?.id) return;
    setJ({ loading: true });
    try {
      const p = joinRef.current;
      const status = (p as Record<string, string>).status === 'all' ? undefined : (p as Record<string, string>).status;
      const res = await api.joinReqs(state.currentCompany.id, status);
      let data = res.success && res.data ? res.data : [];
      const kw = p.search?.toLowerCase();
      if (kw) data = data.filter((i: JoinReq) => i.username.toLowerCase().includes(kw) || (i.userEmail && i.userEmail.toLowerCase().includes(kw)));
      setJ({ data, page: p.page ?? 1, total: data.length });
    } finally { setJ({ loading: false }); }
  }, [state.currentCompany]);

  useEffect(() => { if (activeTab === 'requests') fetchJoin(); }, [activeTab, fetchJoin]);

  const handleJoinSearch = useCallback((params: PageParams) => { joinRef.current = { ...joinRef.current, ...params, page: 1 }; fetchJoin(); }, [fetchJoin]);

  const handleApprove = async (id: string) => { const res = await api.approveJoin(id); if (res.success) { message.success('已批准'); fetchJoin(); } };
  const handleReject = async () => {
    if (!join.rejectReason.trim()) { message.warning('请输入拒绝原因'); return; }
    const res = await api.rejectJoin(join.rejectId, { rejectReason: join.rejectReason.trim() });
    if (res.success) { message.success('已拒绝'); setJ({ rejectModal: false, rejectReason: '' }); fetchJoin(); }
  };

  const joinCols = useMemo((): ProColumns<JoinReq>[] => [
    { title: '申请人', dataIndex: 'username', key: 'username', render: (_: React.ReactNode, r: JoinReq) => <Space direction="vertical" size={0}><b>{r.username}</b><span style={{ color: '#999', fontSize: 12 }}>{r.userEmail}</span></Space> },
    { title: '申请理由', dataIndex: 'reason', key: 'reason', ellipsis: true, render: (t: React.ReactNode) => t || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', valueType: 'select', fieldProps: { options: [{ label: '待审核', value: 'pending' }, { label: '已通过', value: 'approved' }, { label: '已拒绝', value: 'rejected' }, { label: '已取消', value: 'cancelled' }] }, render: (s: React.ReactNode) => { const m: Record<string, { text: string; color: string }> = { pending: { text: '待审核', color: 'processing' }, approved: { text: '已通过', color: 'success' }, rejected: { text: '已拒绝', color: 'error' }, cancelled: { text: '已取消', color: 'default' } }; const c = m[String(s)] || { text: String(s), color: 'default' }; return <Tag color={c.color}>{c.text}</Tag>; } },
    { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', valueType: 'dateTime' },
    { title: '审核人', dataIndex: 'reviewedByName', key: 'reviewedByName', render: (t: React.ReactNode) => t || '-' },
    { title: '备注', dataIndex: 'rejectReason', key: 'rejectReason', ellipsis: true, render: (_: React.ReactNode, r: JoinReq) => r.status === 'approved' ? <span style={{ color: '#52c41a' }}>已通过</span> : _ || '-' },
    { title: '审核时间', dataIndex: 'reviewedAt', key: 'reviewedAt', valueType: 'dateTime' },
    { title: '操作', key: 'action', fixed: 'right', width: 150, valueType: 'option', render: (_: React.ReactNode, r: JoinReq) => r.status === 'cancelled' ? null : (<Space>{r.status !== 'approved' && <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}>批准</Button>}{r.status !== 'rejected' && <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => setJ({ rejectModal: true, rejectId: r.id })}>拒绝</Button>}</Space>) },
  ], []);

  const stats = [
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' }), value: state.statistics?.totalUsers ?? 0, color: '#1890ff' },
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' }), value: state.statistics?.activeUsers ?? 0, color: '#52c41a' },
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' }), value: state.statistics?.adminUsers ?? 0, color: '#faad14' },
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' }), value: state.statistics?.newUsersThisMonth ?? 0, color: '#722ed1' },
  ];

  return (
    <PageContainer
      title={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.userManagement.title' })}</Space>}
      tabList={[{ tab: intl.formatMessage({ id: 'pages.userManagement.members.title' }), key: 'members' }, { tab: intl.formatMessage({ id: 'pages.joinRequests.pending.title' }), key: 'requests' }]}
      tabActiveKey={activeTab} onTabChange={(key: string) => { setActiveTab(key); if (key === 'members') actionRef.current?.reload(); }}
    >
      {activeTab === 'members' && <>
        {state.statistics && <ProCard gutter={16} style={{ marginBottom: 16 }}>
          {stats.map((s) => <ProCard key={s.label} colSpan={{ xs: 24, sm: 12, md: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: s.color }}>{s.value}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{s.label}</div>
          </ProCard>)}
        </ProCard>}
        <ProTable actionRef={actionRef} request={async (params) => {
          const { current, pageSize, search, createdAtRange } = params;
          const sp = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
          const rangeParams = createdAtRange ? { startDate: createdAtRange[0], endDate: createdAtRange[1] } : {};
          const res = await api.list({ page: current, pageSize, ...state.searchParams, ...sp, ...rangeParams, search: state.search });
          api.stats().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }} columns={columns} rowKey="id"
          rowSelection={{ selectedRowKeys: state.selectedRows.map(r => r.id), onChange: (_: React.Key[], selectedRows: AppUser[]) => set({ selectedRows }) }}
          onChange={(_p, _f, s) => set({ sorter: (s as Record<string, unknown>)?.order ? { sortBy: (s as Record<string, string>).field, sortOrder: (s as Record<string, string>).order === 'ascend' ? 'asc' : 'desc' } : undefined })}
          search={false}
          toolBarRender={() => [
            <Input.Search
              key="search"
              placeholder="搜索..."
              allowClear
              value={state.search}
              onChange={(e) => set({ search: e.target.value })}
              onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
              style={{ width: 260, marginRight: 8 }}
              prefix={<SearchOutlined />}
            />,
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { loadStatistics(); actionRef.current?.reload(); }}>{intl.formatMessage({ id: 'pages.userManagement.refresh' })}</Button>,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingUser: null, formVisible: true })}>{intl.formatMessage({ id: 'pages.userManagement.addUser' })}</Button>,
            <Button key="activate" disabled={!state.selectedRows.length} onClick={() => handleBulk('activate')}>批量激活</Button>,
            <Button key="deactivate" disabled={!state.selectedRows.length} onClick={() => handleBulk('deactivate')}>批量禁用</Button>,
            <Button key="delete" danger disabled={!state.selectedRows.length} onClick={() => handleBulk('delete')}>批量删除</Button>,
          ]}
        />
        <ModalForm key={state.editingUser?.id || 'create'} title={state.editingUser ? intl.formatMessage({ id: 'pages.userManagement.editUser' }) : '添加成员'}
          open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingUser: null }); setF({ selectedUser: null }); }}
          initialValues={state.editingUser ? { username: state.editingUser.username, email: state.editingUser.email, phoneNumber: state.editingUser.phoneNumber, roleIds: state.editingUser.roleIds || [], isActive: state.editingUser.isActive, remark: state.editingUser.remark } : undefined}
          onFinish={async (values) => {
            if (!state.editingUser && !form.selectedUser) { message.error('请选择用户'); return false; }
            if (state.editingUser) {
              const res = await api.update(state.editingUser.id, { username: values.username, email: values.email, phoneNumber: values.phoneNumber, roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
              if (res.success) { message.success(intl.formatMessage({ id: 'pages.message.updateSuccess' })); set({ formVisible: false, editingUser: null }); loadStatistics(); actionRef.current?.reload(); }
              return res.success;
            }
            const res = await api.create({ username: form.selectedUser?.username, email: form.selectedUser?.email, phoneNumber: form.selectedUser?.phoneNumber, password: values.password, roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
            if (res.success) { message.success(intl.formatMessage({ id: 'pages.message.createSuccess' })); set({ formVisible: false, editingUser: null }); loadStatistics(); actionRef.current?.reload(); }
            return res.success;
          }} autoFocusFirstInput width={600}
        >
          {!state.editingUser && (
            <Form.Item name="username" label="选择用户" rules={[{ required: true, message: '请搜索并选择用户' }]}>
              <Select
                showSearch
                placeholder="搜索并选择用户"
                filterOption={false}
                onSearch={async (v: string) => {
                  if (!v || v.length < 2) {
                    setF({ userOptions: [] });
                    return;
                  }
                  setF({ searchingUsers: true });
                  try {
                    const res = await api.searchUsers(v);
                    if (res.success && res.data) setF({ userOptions: res.data.users || [] });
                  } finally {
                    setF({ searchingUsers: false });
                  }
                }}
                onChange={(v, option) => {
                  const opt = option as { user?: AppUser };
                  if (opt?.user) setF({ selectedUser: opt.user });
                  if (!v) setF({ selectedUser: null });
                }}
                options={form.userOptions.map(u => ({ label: `${u.username}${u.email ? `(${u.email})` : ''}`, value: u.username, user: u }))}
              />
            </Form.Item>
          )}
          {state.editingUser && <ProFormText name="username" label="用户名" disabled />}
          <ProFormText name="email" label="邮箱" placeholder="请输入邮箱" />
          <ProFormText name="phoneNumber" label="手机号" placeholder="请输入手机号" />
          {!state.editingUser && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <ProFormSelect name="roleIds" label="角色" mode="multiple" placeholder="请选择角色" showSearch allowClear options={roleOptions} rules={[{ required: true, message: '请选择至少一个角色' }]} />
          <ProFormSwitch name="isActive" label="状态" checkedChildren="启用" unCheckedChildren="禁用" />
          <ProFormText name="remark" label="备注" placeholder="请输入备注" />
        </ModalForm>
        <Drawer title={intl.formatMessage({ id: 'pages.userDetail.title' })} placement="right" open={state.detailVisible} onClose={(open) => { if (!open) set({ detailVisible: false, viewingUser: null }); }} width={600} destroyOnClose>
          <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}>{state.viewingUser && <UserDetail user={state.viewingUser} onClose={() => set({ detailVisible: false, viewingUser: null })} />}</React.Suspense>
        </Drawer>
      </>}
      {activeTab === 'requests' && <>
        <ProTable<JoinReq> actionRef={joinActionRef} request={async () => { await fetchJoin(); return { data: join.data, total: join.total, success: true }; }} columns={joinCols} rowKey="id" search={false} scroll={{ x: 'max-content' }}
          toolBarRender={() => [
            <Input.Search
              key="search"
              placeholder="搜索..."
              style={{ width: 260, marginRight: 8 }}
              allowClear
              value={(joinRef.current as Record<string, string>).search}
              onChange={(e) => { joinRef.current = { ...joinRef.current, search: e.target.value } as PageParams; }}
              onSearch={(v) => { joinRef.current = { ...joinRef.current, search: v, page: 1 } as PageParams; fetchJoin(); }}
            />,
          ]}
        />
        <Modal title="拒绝申请" open={join.rejectModal} onOk={handleReject} onCancel={() => setJ({ rejectModal: false })} okText="确定" cancelText="取消" okType="danger">
          <Input.TextArea rows={4} placeholder="请输入拒绝原因" value={join.rejectReason} onChange={(e) => setJ({ rejectReason: e.target.value })} />
        </Modal>
      </>}
    </PageContainer>
  );
};

export default UserManagement;
