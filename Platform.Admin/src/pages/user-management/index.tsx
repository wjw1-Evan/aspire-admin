import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer, ProCard, ProDescriptions } from '@ant-design/pro-components';
import { useIntl, request } from '@umijs/max';
import { App, Button, Tag, Space, Modal, Badge, Spin, Input, Typography, Popconfirm, Tabs, Grid } from 'antd';
import { Drawer } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormSelect, ProFormSwitch, ProFormTextArea } from '@ant-design/pro-form';
import { EditOutlined, DeleteOutlined, UserOutlined, CrownOutlined, SearchOutlined, CheckOutlined, CloseOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';
import type { Role } from '@/services/role/api';

const { useBreakpoint } = Grid;

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
  update: (id: string, data: unknown) => request<ApiResponse<AppUser>>(`/apiservice/api/users/${id}`, { method: 'PUT', data }),
  roles: () => request<ApiResponse<PagedResult<Role>>>('/apiservice/api/role', { method: 'GET' }),
  currentCompany: () => request<ApiResponse<CompanyInfo>>('/apiservice/api/company/current', { method: 'GET' }),
  joinReqs: (cid: string, params?: any) => request<ApiResponse<PagedResult<JoinReq>>>(`/apiservice/api/company/${cid}/join-requests`, { method: 'GET', params }),
  approveJoin: (id: string) => request<ApiResponse<unknown>>(`/apiservice/api/company/join-requests/${id}/approve`, { method: 'POST', data: {} }),
  rejectJoin: (id: string, data: { rejectReason: string }) => request<ApiResponse<unknown>>(`/apiservice/api/company/join-requests/${id}/reject`, { method: 'POST', data }),
};

const UserManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const pendingActionRef = useRef<ActionType>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
    joinData: [] as JoinReq[],
    joinLoading: false,
    rejectModal: false,
    rejectId: '',
    rejectReason: '',
    joinPagination: { current: 1, pageSize: 20, total: 0 },
    roles: [] as Role[],
  });

  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const handleTabChange = useCallback((key: string) => {
    if (key === 'pending') {
      set({ joinData: [], joinPagination: { current: 1, pageSize: 20, total: 0 } });
    }
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
        set({ roleMap: map, roles: r.data.queryable || [] });
      }
    });
  }, [set]);

  const loadJoinRequests = useCallback((current?: number, pageSize?: number) => {
    if (!state.currentCompany?.id) return;
    set({ joinLoading: true });
    api.joinReqs(state.currentCompany.id, { page: current || 1, pageSize: pageSize || 20 })
      .then(r => {
        if (r.success && r.data) {
          set({
            joinData: r.data.queryable || [],
            joinPagination: { current: current || 1, pageSize: pageSize || 20, total: r.data.rowCount },
            joinLoading: false,
          });
        }
      })
      .finally(() => set({ joinLoading: false }));
  }, [state.currentCompany?.id, set]);

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

  const handleToggle = useCallback(async (user: AppUser) => {
    const res = user.isActive ? await api.deactivate(user.id) : await api.activate(user.id);
    if (res.success) {
      message.success(user.isActive ? intl.formatMessage({ id: 'pages.userManagement.message.deactivated' }) : intl.formatMessage({ id: 'pages.userManagement.message.activated' }));
      loadStatistics();
      actionRef.current?.reload();
    }
  }, [message, loadStatistics, intl]);

  const promptDelete = useCallback((userId: string) => {
    let reason = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.userManagement.message.confirmRemove' }),
      content: <Input.TextArea rows={3} placeholder={intl.formatMessage({ id: 'pages.userManagement.form.reasonPlaceholder' })} onChange={(e) => { reason = e.target.value; }} maxLength={200} />,
      okText: intl.formatMessage({ id: 'pages.userManagement.action.confirmRemove' }), cancelText: intl.formatMessage({ id: 'pages.action.cancel' }), okType: 'danger',
      onOk: async () => {
        const res = await api.del(userId, reason);
        if (res.success) { message.success(intl.formatMessage({ id: 'pages.userManagement.message.removeSuccess' })); loadStatistics(); actionRef.current?.reload(); }
      },
    });
  }, [modal, message, loadStatistics, intl]);

  const handleApprove = useCallback(async (id: string) => {
    const res = await api.approveJoin(id);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.userManagement.message.approved' }));
      loadJoinRequests();
      pendingActionRef.current?.reload();
    }
  }, [message, loadJoinRequests, intl]);

  const handleReject = useCallback((id: string) => {
    set({ rejectModal: true, rejectId: id });
  }, [set]);

  const confirmReject = useCallback(async () => {
    if (!state.rejectReason.trim()) { message.error(intl.formatMessage({ id: 'pages.userManagement.message.rejectReasonRequired' })); return; }
    const res = await api.rejectJoin(state.rejectId, { rejectReason: state.rejectReason });
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.userManagement.message.rejected' }));
      set({ rejectModal: false, rejectId: '', rejectReason: '' });
      loadJoinRequests();
      pendingActionRef.current?.reload();
    }
  }, [state.rejectId, state.rejectReason, message, loadJoinRequests, set, intl]);

  const columns: ProColumns<AppUser>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.userManagement.table.username' }), dataIndex: 'username', key: 'username', sorter: true, render: (dom, r) => (
      <Space>
        <UserOutlined />
        <a onClick={() => set({ detailVisible: true, viewingUser: r })}>{dom}</a>
        {state.currentCompany?.createdBy === r.id && <Tag icon={<CrownOutlined />} color="gold">{intl.formatMessage({ id: 'pages.userManagement.tag.creator' })}</Tag>}
      </Space>
    )},
    { title: intl.formatMessage({ id: 'pages.userManagement.table.name' }), dataIndex: 'name', key: 'name', ellipsis: true, sorter: true, render: (dom) => dom || '-' },
    { title: intl.formatMessage({ id: 'pages.userManagement.table.email' }), dataIndex: 'email', key: 'email', ellipsis: true, responsive: ['md'], sorter: true },
    { title: intl.formatMessage({ id: 'pages.userManagement.table.phoneNumber' }), dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true, responsive: ['lg'] },
    { title: intl.formatMessage({ id: 'pages.userManagement.table.roles' }), dataIndex: 'roleIds', responsive: ['md'], render: (_, r) => (
      !r.roleIds?.length ? <Tag>{intl.formatMessage({ id: 'pages.userManagement.tag.unassigned' })}</Tag> : <Space wrap>{r.roleIds.map(id => <Tag key={id} color="blue">{state.roleMap[id] || id}</Tag>)}</Space>
    )},
    { title: intl.formatMessage({ id: 'pages.userManagement.table.status' }), dataIndex: 'isActive', key: 'isActive', render: (_, r) => (
      <Badge status={r.isActive ? 'success' : 'error'} text={r.isActive ? intl.formatMessage({ id: 'pages.userManagement.status.active' }) : intl.formatMessage({ id: 'pages.userManagement.status.inactive' })} />
    )},
    { title: intl.formatMessage({ id: 'pages.userManagement.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.action' }), key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ formVisible: true, editingUser: r })}>{intl.formatMessage({ id: 'pages.action.edit' })}</Button>
        <Popconfirm title={intl.formatMessage({ id: 'pages.userManagement.message.confirmRemoveUser', defaultMessage: '确定移除用户「{name}」？' }, { name: r.name })} onConfirm={() => promptDelete(r.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.userManagement.action.remove' })}</Button>
        </Popconfirm>
      </Space>
    )},
  ], [state.roleMap, state.currentCompany, set, promptDelete, intl]);

  const pendingReqs = useMemo(() => state.joinData.filter(r => r.status === 'pending'), [state.joinData]);

  const pendingColumns: ProColumns<JoinReq>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.userManagement.table.username' }), dataIndex: 'username', key: 'username', render: (dom, r) => (
      <Space><UserAddOutlined /><span>{dom}</span>{r.name && <Typography.Text type="secondary">({r.name})</Typography.Text>}</Space>
    )},
    { title: intl.formatMessage({ id: 'pages.userManagement.table.email' }), dataIndex: 'userEmail', key: 'userEmail', ellipsis: true },
    { title: intl.formatMessage({ id: 'pages.userManagement.table.phoneNumber' }), dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true },
    { title: intl.formatMessage({ id: 'pages.userManagement.table.reason' }), dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: intl.formatMessage({ id: 'pages.userManagement.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.action' }), key: 'action', fixed: 'right', width: 180, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}>{intl.formatMessage({ id: 'pages.userManagement.action.approve' })}</Button>
        <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>{intl.formatMessage({ id: 'pages.userManagement.action.reject' })}</Button>
      </Space>
    )},
  ], [handleApprove, handleReject, intl]);

  const roleOptions = useMemo(() =>
    state.roles.filter((r): r is Role & { id: string } => Boolean(r.id)).map(r => ({ label: r.name, value: r.id })),
    [state.roles]
  );

  return (
    <PageContainer>
      <Tabs activeKey={state.activeTab} onChange={handleTabChange} items={[
        { key: 'joined', label: <span><UserOutlined />{intl.formatMessage({ id: 'pages.userManagement.tab.joined' })}</span> },
        { key: 'pending', label: <span><UserAddOutlined />{intl.formatMessage({ id: 'pages.userManagement.tab.pending' })}{state.joinPagination.total > 0 && <Badge count={state.joinPagination.total} style={{ marginLeft: 8 }} />}</span> },
      ]} />
      {state.activeTab === 'joined' ? (
        <ProCard>
          <ProTable
            actionRef={actionRef}
            params={{ search: state.search }}
            request={async (params: any, sort: any, filter: any) => {
              const res = await api.list({ ...params, sort, filter });
              return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }}
            columns={columns}
            rowKey="id"
            search={false}
            scroll={{ x: 'max-content' }}
            headerTitle={
              <Space size={24}>
                <Space><UserOutlined />{intl.formatMessage({ id: 'pages.userManagement.title' })}</Space>
                <Space size={12}>
                  <Tag color="blue">{intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' })} {state.statistics?.totalUsers || 0}</Tag>
                  <Tag color="green">{intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' })} {state.statistics?.activeUsers || 0}</Tag>
                  <Tag color="orange">{intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' })} {state.statistics?.adminUsers || 0}</Tag>
                  <Tag color="purple">{intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' })} {state.statistics?.newUsersThisMonth || 0}</Tag>
                </Space>
              </Space>
            }
            toolBarRender={() => [
              <Input.Search
                key="search"
                placeholder={intl.formatMessage({ id: 'pages.common.search' })}
                allowClear
                value={state.search}
                onChange={(e) => set({ search: e.target.value })}
                onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
                style={{ width: 260 }}
                prefix={<SearchOutlined />}
              />,
            ]}
          />
        </ProCard>
      ) : (
        <ProCard>
          <Spin spinning={state.joinLoading}>
            <ProTable
              actionRef={pendingActionRef}
              request={async (params: any) => {
                const { current = 1, pageSize = 20 } = params;
                if (!state.currentCompany?.id) return { data: [], total: 0, success: true };
                set({ joinLoading: true });
                const r = await api.joinReqs(state.currentCompany.id, { page: current, pageSize });
                if (r.success && r.data) {
                  set({ joinData: r.data.queryable || [], joinPagination: { current, pageSize, total: r.data.rowCount }, joinLoading: false });
                  return { data: r.data.queryable || [], total: r.data.rowCount, success: true };
                }
                set({ joinLoading: false });
                return { data: [], total: 0, success: false };
              }}
              columns={pendingColumns}
              rowKey="id"
              search={false}
              scroll={{ x: 'max-content' }}
              params={{}}
            />
          </Spin>
        </ProCard>
      )}

      <ModalForm
        key={state.editingUser?.id || 'edit'}
        title={state.editingUser ? intl.formatMessage({ id: 'pages.userManagement.form.edit' }) : intl.formatMessage({ id: 'pages.userManagement.form.create' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingUser: null }); }}
        initialValues={state.editingUser ? { roleIds: state.editingUser.roleIds || [], isActive: state.editingUser.isActive, remark: state.editingUser.remark } : { isActive: true }}
        onFinish={async (values) => {
          if (!state.editingUser) return false;
          const res = await api.update(state.editingUser.id, { roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark });
          if (res.success) { message.success(intl.formatMessage({ id: 'pages.userManagement.message.updateSuccess' })); set({ formVisible: false, editingUser: null }); loadStatistics(); actionRef.current?.reload(); }
          return res.success;
        }}
        autoFocusFirstInput
        width={600}
      >
        <ProFormSelect name="roleIds" label={intl.formatMessage({ id: 'pages.userManagement.form.roles' })} mode="multiple" placeholder={intl.formatMessage({ id: 'pages.userManagement.form.rolesPlaceholder' })} options={roleOptions} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.userManagement.form.rolesRequired' }) }]} />
        <ProFormSwitch name="isActive" label={intl.formatMessage({ id: 'pages.userManagement.form.isActive' })} checkedChildren={intl.formatMessage({ id: 'pages.userManagement.form.active' })} unCheckedChildren={intl.formatMessage({ id: 'pages.userManagement.form.inactive' })} />
        <ProFormTextArea name="remark" label={intl.formatMessage({ id: 'pages.userManagement.form.remark' })} />
      </ModalForm>

      <Drawer title={intl.formatMessage({ id: 'pages.userManagement.detail.title' })} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingUser: null })} size="large" destroyOnClose>
        <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}>
          {state.viewingUser && <UserDetail user={state.viewingUser} onClose={() => set({ detailVisible: false, viewingUser: null })} isMobile={isMobile} />}
        </React.Suspense>
      </Drawer>

      <Modal
        title={intl.formatMessage({ id: 'pages.userManagement.form.rejectReason' })}
        open={state.rejectModal}
        onCancel={() => set({ rejectModal: false, rejectId: '', rejectReason: '' })}
        onOk={confirmReject}
      >
        <Input.TextArea
          rows={4}
          placeholder={intl.formatMessage({ id: 'pages.userManagement.form.rejectReasonPlaceholder' })}
          value={state.rejectReason}
          onChange={(e) => set({ rejectReason: e.target.value })}
          maxLength={200}
        />
      </Modal>
    </PageContainer>
  );
};

export default UserManagement;
