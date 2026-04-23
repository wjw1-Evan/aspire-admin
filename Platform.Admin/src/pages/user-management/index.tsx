import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { App, Button, Tag, Space, Modal, Badge, Spin, Input, Typography, Form, Select, Popconfirm, Tabs } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormSwitch, ProFormTextArea } from '@ant-design/pro-form';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, CrownOutlined, SearchOutlined, CheckOutlined, CloseOutlined, UserAddOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult } from '@/types';
import type { Role } from '@/services/role/api';

const UserDetail = React.lazy(() => import('./components/UserDetail'));

interface AppUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  roleIds?: string[];
  organizations?: Array<{ id?: string; name?: string; fullPath?: string; isPrimary?: boolean }>;
  remark?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newUsersThisMonth: number;
}

interface JoinReq {
  id: string;
  username: string;
  name?: string;
  userEmail?: string;
  phoneNumber?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejectReason?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface CompanyInfo {
  id?: string;
  createdBy?: string;
}

const api = {
  list: (params: any) => request<ApiResponse<PagedResult<AppUser>>>('/apiservice/api/users/list', { params }),
  get: (id: string) => request<ApiResponse<AppUser>>(`/apiservice/api/users/${id}`),
  stats: () => request<ApiResponse<UserStats>>('/apiservice/api/users/statistics', { method: 'GET' }),
  del: (id: string, reason?: string) => request<ApiResponse<unknown>>(`/apiservice/api/users/${id}`, { method: 'DELETE', params: reason ? { reason } : undefined }),
  activate: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/users/${id}/activate`, { method: 'PUT' }),
  deactivate: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/users/${id}/deactivate`, { method: 'PUT' }),
  create: (data: unknown) => request<ApiResponse<AppUser>>('/apiservice/api/users', { method: 'POST', data }),
  update: (id: string, data: unknown) => request<ApiResponse<AppUser>>(`/apiservice/api/users/${id}`, { method: 'PUT', data }),
  searchUsers: (s: string) => request<ApiResponse<{ users: AppUser[]; total: number }>>('/apiservice/api/users/all', { params: { search: s } }),
  roles: () => request<ApiResponse<PagedResult<Role>>>('/apiservice/api/role', { method: 'GET' }),
  currentCompany: () => request<ApiResponse<CompanyInfo>>('/apiservice/api/company/current', { method: 'GET' }),
  joinReqs: (cid: string) => request<ApiResponse<JoinReq[]>>(`/apiservice/api/company/${cid}/join-requests`),
  approveJoin: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/company/join-requests/${id}/approve`, { method: 'POST', data: {} }),
  rejectJoin: (id: string, data: { rejectReason: string }) => request<ApiResponse<unknown>>(`/apiservice/api/company/join-requests/${id}/reject`, { method: 'POST', data }),
};

const UserManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const pendingActionRef = useRef<ActionType>(null);

  const [state, setState] = useState({
    statistics: null as UserStats | null,
    roleMap: {} as Record<string, string>,
    currentCompany: null as CompanyInfo | null,
    search: '',
    formVisible: false,
    editingUser: null as AppUser | null,
    detailVisible: false,
    viewingUser: null as AppUser | null,
    activeTab: 'joined' as 'joined' | 'pending',
  });

  const [joinState, setJoinState] = useState({
    data: [] as JoinReq[],
    loading: false,
    rejectModal: false,
    rejectId: '',
    rejectReason: '',
  });

  const [formState, setFormState] = useState({
    roles: [] as Role[],
    userOptions: [] as AppUser[],
    selectedUser: null as AppUser | null,
  });

  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);
  const setJ = useCallback((partial: Partial<typeof joinState>) => setJoinState(prev => ({ ...prev, ...partial })), []);
  const setF = useCallback((partial: Partial<typeof formState>) => setFormState(prev => ({ ...prev, ...partial })), []);

  const handleTabChange = useCallback((key: string) => {
    set({ activeTab: key as 'joined' | 'pending' });
  }, [set]);

  const loadStatistics = useCallback(() => {
    api.stats().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
  }, [set]);

  const loadRoles = useCallback(() => {
    api.roles().then(r => {
      if (r.success && r.data) {
        const map: Record<string, string> = {};
        r.data.queryable?.forEach(role => { if (role.id) map[role.id] = role.name; });
        set({ roleMap: map });
        setF({ roles: r.data.queryable || [] });
      }
    });
  }, [set, setF]);

  const loadJoinRequests = useCallback(() => {
    if (!state.currentCompany?.id) return;
    setJ({ loading: true });
    api.joinReqs(state.currentCompany.id)
      .then(r => { if (r.success && r.data) setJ({ data: r.data }); })
      .finally(() => setJ({ loading: false }));
  }, [state.currentCompany?.id, setJ]);

  const loadCurrentCompany = useCallback(() => {
    api.currentCompany().then(r => {
      if (r.success && r.data) {
        set({ currentCompany: r.data });
      }
    });
  }, [set]);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);
  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { 
    loadCurrentCompany();
  }, [loadCurrentCompany]);

  useEffect(() => {
    if (state.currentCompany?.id && state.activeTab === 'pending') {
      loadJoinRequests();
    }
  }, [state.currentCompany?.id, state.activeTab, loadJoinRequests]);

  const handleToggle = useCallback(async (user: AppUser) => {
    const res = user.isActive ? await api.deactivate(user.id) : await api.activate(user.id);
    if (res.success) {
      message.success(user.isActive ? '已禁用' : '已启用');
      loadStatistics();
      actionRef.current?.reload();
    }
  }, [message, loadStatistics]);

  const promptDelete = useCallback((userId: string) => {
    let reason = '';
    modal.confirm({
      title: '确认移除',
      content: <Input.TextArea rows={3} placeholder="请输入原因（可选）" onChange={(e) => { reason = e.target.value; }} maxLength={200} />,
      okText: '确认移除', cancelText: '取消', okType: 'danger',
      onOk: async () => {
        const res = await api.del(userId, reason);
        if (res.success) { message.success('已移除'); loadStatistics(); actionRef.current?.reload(); }
      },
    });
  }, [modal, message, loadStatistics]);

  const handleApprove = useCallback(async (id: string) => {
    const res = await api.approveJoin(id);
    if (res.success) {
      message.success('已批准');
      loadJoinRequests();
      pendingActionRef.current?.reload();
    }
  }, [message, loadJoinRequests]);

  const handleReject = useCallback((id: string) => {
    setJ({ rejectModal: true, rejectId: id });
  }, [setJ]);

  const confirmReject = useCallback(async () => {
    if (!joinState.rejectReason.trim()) { message.error('请输入拒绝理由'); return; }
    const res = await api.rejectJoin(joinState.rejectId, { rejectReason: joinState.rejectReason });
    if (res.success) {
      message.success('已拒绝');
      setJ({ rejectModal: false, rejectId: '', rejectReason: '' });
      loadJoinRequests();
      pendingActionRef.current?.reload();
    }
  }, [joinState.rejectId, joinState.rejectReason, message, loadJoinRequests, setJ]);

  const columns: ProColumns<AppUser>[] = useMemo(() => [
    { title: '用户名', dataIndex: 'username', key: 'username', sorter: true, render: (dom, r) => (
      <Space>
        <UserOutlined />
        <a onClick={() => set({ detailVisible: true, viewingUser: r })}>{dom}</a>
        {state.currentCompany?.createdBy === r.id && <Tag icon={<CrownOutlined />} color="gold">创建者</Tag>}
      </Space>
    )},
    { title: '姓名', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true, render: (dom) => dom || '-' },
    { title: '邮箱', dataIndex: 'email', key: 'email', ellipsis: true, responsive: ['md'], sorter: true },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true, responsive: ['lg'] },
    { title: '角色', dataIndex: 'roleIds', responsive: ['md'], render: (_, r) => (
      !r.roleIds?.length ? <Tag>未分配</Tag> : <Space wrap>{r.roleIds.map(id => <Tag key={id} color="blue">{state.roleMap[id] || id}</Tag>)}</Space>
    )},
    { title: '状态', dataIndex: 'isActive', key: 'isActive', render: (_, r) => (
      <Badge status={r.isActive ? 'success' : 'error'} text={r.isActive ? '已启用' : '已禁用'} />
    )},
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
    { title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ formVisible: true, editingUser: r })}>编辑</Button>
        <Popconfirm title={`确定移除用户「${r.name}」？`} onConfirm={() => promptDelete(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      </Space>
    )},
  ], [state.roleMap, state.currentCompany, set, promptDelete]);

  const pendingReqs = useMemo(() => joinState.data.filter(r => r.status === 'pending'), [joinState.data]);

  const pendingColumns: ProColumns<JoinReq>[] = useMemo(() => [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (dom, r) => (
      <Space><UserAddOutlined /><span>{dom}</span>{r.name && <Typography.Text type="secondary">({r.name})</Typography.Text>}</Space>
    )},
    { title: '邮箱', dataIndex: 'userEmail', key: 'userEmail', ellipsis: true },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true },
    { title: '申请理由', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', valueType: 'dateTime' },
    { title: '操作', key: 'action', fixed: 'right', width: 180, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}>批准</Button>
        <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>拒绝</Button>
      </Space>
    )},
  ], [handleApprove, handleReject]);

  const roleOptions = useMemo(() => 
    formState.roles.filter((r): r is Role & { id: string } => Boolean(r.id)).map(r => ({ label: r.name, value: r.id })),
    [formState.roles]
  );

  return (
    <PageContainer>
      <Tabs activeKey={state.activeTab} onChange={handleTabChange} items={[
        { key: 'joined', label: <span><UserOutlined />已加入成员</span> },
        { key: 'pending', label: <span><UserAddOutlined />申请加入{pendingReqs.length > 0 && <Badge count={pendingReqs.length} style={{ marginLeft: 8 }} />}</span> },
      ]} />
      {state.activeTab === 'joined' ? (
        <ProTable
          actionRef={actionRef}
          params={state}
          request={async (params: any, sort: any, filter: any) => {
            const res = await api.list({ ...params, search: state.search, sort, filter });
            loadStatistics();
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
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ formVisible: true, editingUser: null })}>添加成员</Button>,
          ]}
        />
      ) : (
        <ProTable
          actionRef={pendingActionRef}
          params={joinState}
          request={async () => {
            await loadJoinRequests();
            return { data: pendingReqs, total: pendingReqs.length, success: true };
          }}
          columns={pendingColumns}
          rowKey="id"
          search={false}
          scroll={{ x: 'max-content' }}
          pagination={false}
          loading={joinState.loading}
        />
      )}

      <ModalForm
        title={state.editingUser ? '编辑成员' : '添加成员'}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingUser: null }); setF({ selectedUser: null }); }}
        initialValues={state.editingUser ? { roleIds: state.editingUser.roleIds || [], isActive: state.editingUser.isActive, remark: state.editingUser.remark } : { isActive: true }}
        onFinish={async (values) => {
          if (!state.editingUser && !formState.selectedUser) { message.error('请选择用户'); return false; }
          if (state.editingUser) {
            const res = await api.update(state.editingUser.id, { roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
            if (res.success) { message.success('更新成功'); set({ formVisible: false, editingUser: null }); loadStatistics(); actionRef.current?.reload(); }
            return res.success;
          }
          const res = await api.create({ userId: formState.selectedUser?.id, roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
          if (res.success) { message.success('添加成功'); set({ formVisible: false, editingUser: null }); loadStatistics(); actionRef.current?.reload(); }
          return res.success;
        }}
        autoFocusFirstInput
        width={600}
      >
        {!state.editingUser && (
          <Form.Item name="username" label="选择用户" rules={[{ required: true, message: '请搜索并选择用户' }]}>
            <Select
              showSearch
              placeholder="搜索并选择用户"
              filterOption={false}
              onSearch={async (v: string) => {
                if (!v || v.length < 2) { setF({ userOptions: [] }); return; }
                const res = await api.searchUsers(v);
                if (res.success && res.data) setF({ userOptions: res.data.users || [] });
              }}
              onChange={(v, option) => {
                const opt = option as { user?: AppUser };
                if (opt?.user) setF({ selectedUser: opt.user });
                if (!v) setF({ selectedUser: null });
              }}
              options={formState.userOptions.map(u => ({ label: `${u.username}${u.email ? `(${u.email})` : ''}`, value: u.username, user: u }))}
            />
          </Form.Item>
        )}
        <ProFormSelect name="roleIds" label="角色" mode="multiple" placeholder="请选择角色" options={roleOptions} rules={[{ required: true, message: '请选择至少一个角色' }]} />
        <ProFormSwitch name="isActive" label="启用" checkedChildren="启用" unCheckedChildren="禁用" />
        <ProFormTextArea name="remark" label="备注" />
      </ModalForm>

      <Drawer title="成员详情" placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingUser: null })} size="large" destroyOnClose>
        <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}>
          {state.viewingUser && <UserDetail user={state.viewingUser} onClose={() => set({ detailVisible: false, viewingUser: null })} />}
        </React.Suspense>
      </Drawer>

      <Modal
        title="拒绝理由"
        open={joinState.rejectModal}
        onCancel={() => setJ({ rejectModal: false, rejectId: '', rejectReason: '' })}
        onOk={confirmReject}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入拒绝理由"
          value={joinState.rejectReason}
          onChange={(e) => setJ({ rejectReason: e.target.value })}
          maxLength={200}
        />
      </Modal>
    </PageContainer>
  );
};

export default UserManagement;