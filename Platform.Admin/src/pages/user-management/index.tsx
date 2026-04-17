import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { App, Button, Tag, Space, Modal, Badge, Spin, Input, Typography, Form, Select, Popconfirm } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormSwitch, ProFormDatePicker, ProFormDateRangePicker } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, CrownOutlined, SearchOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
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
interface JoinReq { id: string; username: string; userEmail?: string; reason?: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled'; rejectReason?: string; reviewedByName?: string; reviewedAt?: string; createdAt: string; }

// ==================== API ====================
const api = {
  list: (p: PageParams) => request<ApiResponse<PagedResult<AppUser>>>('/apiservice/api/users/list', { params: p }),
  stats: () => request<ApiResponse<UserStats>>('/apiservice/api/users/statistics', { method: 'GET' }),
  del: (id: string, reason?: string) => request<ApiResponse<unknown>>(`/apiservice/api/users/${id}`, { method: 'DELETE', params: reason ? { reason } : undefined }),
  activate: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/users/${id}/activate`, { method: 'PUT' }),
  deactivate: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/users/${id}/deactivate`, { method: 'PUT' }),
  create: (d: unknown) => request<ApiResponse<AppUser>>('/apiservice/api/users', { method: 'POST', data: d }),
  update: (id: string, d: unknown) => request<ApiResponse<AppUser>>(`/apiservice/api/users/${id}`, { method: 'PUT', data: d }),
  searchUsers: (s: string) => request<ApiResponse<{ users: AppUser[]; total: number }>>('/apiservice/api/users/all', { method: 'GET', params: { search: s } }),
  roles: () => request<ApiResponse<PagedResult<Role>>>('/apiservice/api/role', { method: 'GET' }),
  joinReqs: (cid: string, status?: string) => request<ApiResponse<JoinReq[]>>(`/apiservice/api/company/${cid}/join-requests`, { params: { status } }),
  approveJoin: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/company/join-requests/${id}/approve`, { method: 'POST', data: {} }),
  rejectJoin: (id: string, d: { rejectReason: string }) => request<ApiResponse<unknown>>(`/apiservice/api/company/join-requests/${id}/reject`, { method: 'POST', data: d }),
};

// ==================== Main ====================
const UserManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [state, setState] = useState({
    editingUser: null as AppUser | null, formVisible: false,
    detailVisible: false, viewingUser: null as AppUser | null, statistics: null as UserStats | null,
    roleMap: {} as Record<string, string>, currentCompany: null as { id?: string; createdBy?: string } | null,
    search: '',
  });
  const [form, setForm] = useState({ roles: [] as Role[], searchingUsers: false, userOptions: [] as AppUser[], selectedUser: null as AppUser | null });
  const [join, setJoin] = useState({ data: [] as JoinReq[], loading: false, rejectModal: false, rejectId: '', rejectReason: '' });
  const set = useCallback((p: Partial<typeof state>) => setState(prev => ({ ...prev, ...p })), []);
  const setF = useCallback((p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p })), []);
  const setJ = useCallback((p: Partial<typeof join>) => setJoin(prev => ({ ...prev, ...p })), []);

  const loadStatistics = useCallback(async () => {
    const res = await api.stats();
    if (res.success && res.data) set({ statistics: res.data });
  }, []);

  useEffect(() => {
    api.roles().then(r => {
      if (r.success && r.data) {
        const map: Record<string, string> = {};
        r.data.queryable?.forEach(role => { if (role.id) map[role.id] = role.name; });
        set({ roleMap: map });
        setF({ roles: r.data.queryable || [] });
      }
    });
  }, []);

  const handleToggle = useCallback(async (user: AppUser) => {
    const res = user.isActive ? await api.deactivate(user.id) : await api.activate(user.id);
    if (res.success) {
      message.success(user.isActive ? intl.formatMessage({ id: 'pages.userManagement.userDeactivated' }) : intl.formatMessage({ id: 'pages.userManagement.userActivated' }));
      loadStatistics(); actionRef.current?.reload();
    }
  }, [intl, message]);

  const promptDelete = useCallback((userId: string) => {
    let reason = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.confirmDeleteUser' }),
      content: <Input.TextArea rows={3} placeholder={intl.formatMessage({ id: 'pages.modal.pleaseEnterReasonOptional' })} onChange={(e) => { reason = e.target.value; }} maxLength={200} />,
      okText: intl.formatMessage({ id: 'pages.modal.okDelete' }), cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }), okType: 'danger',
      onOk: async () => {
        const res = await api.del(userId, reason);
        if (res.success) { message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' })); loadStatistics(); actionRef.current?.reload(); }
      },
    });
  }, [intl, modal, message, loadStatistics]);

  const roleOptions = useMemo(() => form.roles.filter((r): r is Role & { id: string } => Boolean(r.id)).map(r => ({ label: r.name, value: r.id })), [form.roles]);

  const columns: ProColumns<AppUser>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.table.username' }), dataIndex: 'username', key: 'username', sorter: true, render: (dom, r) => (<Space><UserOutlined /><a onClick={() => set({ viewingUser: r, detailVisible: true })}>{dom}</a>{state.currentCompany?.createdBy === r.id && <Tag icon={<CrownOutlined />} color="gold">{intl.formatMessage({ id: 'pages.userManagement.role.creator' })}</Tag>}</Space>) },
    { title: '姓名', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true, render: (dom: React.ReactNode) => dom || '-' },
    { title: intl.formatMessage({ id: 'pages.table.email' }), dataIndex: 'email', key: 'email', ellipsis: true, responsive: ['md'], sorter: true },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true, responsive: ['lg'] },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true, responsive: ['xl'] },
    { title: intl.formatMessage({ id: 'pages.table.role' }), dataIndex: 'roleIds', responsive: ['md'], render: (_, r) => (!r.roleIds?.length ? <Tag color="default">{intl.formatMessage({ id: 'pages.table.unassigned' })}</Tag> : <Space wrap>{r.roleIds.map(id => <Tag key={id} color="blue">{state.roleMap[id] || id}</Tag>)}</Space>) },
    { title: intl.formatMessage({ id: 'pages.table.organization' }), dataIndex: 'organizations', responsive: ['lg'], render: (_, r) => {
      const orgs = r.organizations || [];
      if (!orgs.length) return <Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.userManagement.organization.empty' })}</Typography.Text>;
      return <Space orientation="vertical" size={4} wrap>{orgs.map(o => <Space key={o.id || o.fullPath || o.name} size={4}><span>{o.fullPath || o.name || '-'}</span>{o.isPrimary && <Tag color="gold" variant="filled">{intl.formatMessage({ id: 'pages.userManagement.organization.primary' })}</Tag>}</Space>)}</Space>;
    }},
    { title: intl.formatMessage({ id: 'pages.table.status' }), dataIndex: 'isActive', key: 'isActive', render: (_, r) => <Badge status={r.isActive ? 'success' : 'error'} text={r.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })} /> },
    { title: intl.formatMessage({ id: 'pages.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.lastLogin' }), dataIndex: 'lastLoginAt', key: 'lastLoginAt', valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.actions' }), key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingUser: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
        <Popconfirm title={`确定从企业移除用户「${r.name}」？`} onConfirm={() => promptDelete(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      </Space>
    ) },
  ], [intl, state.roleMap, state.currentCompany, promptDelete]);

  const stats = [
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' }), value: state.statistics?.totalUsers ?? 0, color: '#1890ff' },
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' }), value: state.statistics?.activeUsers ?? 0, color: '#52c41a' },
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' }), value: state.statistics?.adminUsers ?? 0, color: '#faad14' },
    { label: intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' }), value: state.statistics?.newUsersThisMonth ?? 0, color: '#722ed1' },
  ];

  return (
    <PageContainer>
      <ProTable actionRef={actionRef} headerTitle={
        <Space size={24}>
          <Space><UserOutlined />成员管理</Space>
          <Space size={12}>
            <Tag color="blue">总成员 {state.statistics?.totalUsers || 0}</Tag>
            <Tag color="green">已激活 {state.statistics?.activeUsers || 0}</Tag>
            <Tag color="orange">管理员 {state.statistics?.adminUsers || 0}</Tag>
            <Tag color="purple">本月新增 {state.statistics?.newUsersThisMonth || 0}</Tag>
          </Space>
        </Space>
      } request={async (params: any, sort: any, filter: any) => {
        const res = await api.list({ ...params, search: state.search, sort, filter });
        api.stats().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id"
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
            prefix={<SearchOutlined />}
          />,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingUser: null, formVisible: true })}>{intl.formatMessage({ id: 'pages.userManagement.addUser' })}</Button>,
        ]}
      />
        <ModalForm key={state.editingUser?.id || 'create'} title={state.editingUser ? intl.formatMessage({ id: 'pages.userManagement.editUser' }) : '添加成员'}
          open={state.formVisible} onOpenChange={(open) => { if (!open) set({ formVisible: false, editingUser: null }); setF({ selectedUser: null }); }}
          initialValues={state.editingUser ? { roleIds: state.editingUser.roleIds || [], isActive: state.editingUser.isActive, remark: state.editingUser.remark } : { isActive: true }}
          onFinish={async (values) => {
            if (!state.editingUser && !form.selectedUser) { message.error('请选择用户'); return false; }
            if (state.editingUser) {
              const res = await api.update(state.editingUser.id, { roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
              if (res.success) { message.success(intl.formatMessage({ id: 'pages.message.updateSuccess' })); set({ formVisible: false, editingUser: null }); loadStatistics(); actionRef.current?.reload(); }
              return res.success;
            }
            const res = await api.create({ userId: form.selectedUser?.id, password: values.password, roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
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
          <ProFormSelect name="roleIds" label="角色" mode="multiple" placeholder="请选择角色" showSearch allowClear options={roleOptions} rules={[{ required: true, message: '请选择至少一个角色' }]} />
          <ProFormSwitch name="isActive" label="企业内启用" checkedChildren="启用" unCheckedChildren="禁用" />
          <ProFormText name="remark" label="备注" placeholder="请输入备注" />
        </ModalForm>
        <Drawer title={intl.formatMessage({ id: 'pages.userDetail.title' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingUser: null })} size="large" destroyOnClose>
          <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}>{state.viewingUser && <UserDetail user={state.viewingUser} onClose={() => set({ detailVisible: false, viewingUser: null })} />}</React.Suspense>
        </Drawer>
    </PageContainer>
  );
};

export default UserManagement;
