import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { App, Button, Tag, Space, Modal, Drawer, Row, Col, Badge, Card, Spin, Input, Switch, Typography } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormSelect, ProFormSwitch } from '@ant-design/pro-form';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  CrownOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/utils/format';
import { ApiResponse, PagedResult, PageParams } from '@/types/api-response';
import type { Role } from '@/services/role/types';
import { getAllRoles } from '@/services/role/api';
import { getCurrentCompany } from '@/services/company';

const JoinRequestsTable = React.lazy(() => import('./components/JoinRequestsTable'));
const UserDetail = React.lazy(() => import('./components/UserDetail'));

// ==================== Types ====================
interface AppUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  roleIds?: string[];
  organizations?: Array<{ id?: string; name?: string; fullPath?: string; isPrimary?: boolean }>;
  remark?: string;
  age?: number;
}

interface UserStatisticsResponse {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newUsersThisMonth: number;
}

interface Organization {
  id?: string;
  name?: string;
  fullPath?: string;
  isPrimary?: boolean;
}

// ==================== API ====================
const api = {
  list: (params: PageParams) =>
    request<ApiResponse<PagedResult<AppUser>>>('/api/users/list', { method: 'POST', data: params }),
  statistics: () =>
    request<ApiResponse<UserStatisticsResponse>>('/api/users/statistics', { method: 'GET' }),
  delete: (userId: string, reason?: string) =>
    request<ApiResponse<{ message: string }>>(`/api/users/${userId}`, { method: 'DELETE', params: reason ? { reason } : undefined }),
  bulkAction: (userIds: string[], action: string, reason?: string) =>
    request<ApiResponse<{ message: string }>>('/api/users/bulk-action', { method: 'POST', data: { userIds, action, reason } }),
  activate: (userId: string) =>
    request<ApiResponse<AppUser>>(`/api/users/${userId}/activate`, { method: 'PUT' }),
  deactivate: (userId: string) =>
    request<ApiResponse<AppUser>>(`/api/users/${userId}/deactivate`, { method: 'PUT' }),
  create: (data: any) =>
    request<ApiResponse<AppUser>>('/api/users/management', { method: 'POST', data }),
  update: (userId: string, data: any) =>
    request<ApiResponse<AppUser>>(`/api/users/${userId}`, { method: 'PUT', data }),
  searchUsers: (search: string) =>
    request<ApiResponse<{ users: AppUser[]; total: number }>>('/api/users/all', { method: 'GET', params: { search } }),
  getCurrentCompany: () =>
    request<ApiResponse<any>>('/api/company/current', { method: 'GET' }),
  getAllRoles: () =>
    request<ApiResponse<PagedResult<Role>>>('/api/roles/all', { method: 'GET' }),
};

// ==================== Main ====================
const UserManagement: React.FC = () => {
  const intl = useIntl();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('members');
  const [state, setState] = useState({
    selectedRows: [] as AppUser[],
    editingUser: null as AppUser | null,
    formVisible: false,
    detailVisible: false,
    viewingUser: null as AppUser | null,
    statistics: null as UserStatisticsResponse | null,
    roleMap: {} as Record<string, string>,
    currentCompany: null as any,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    searchParams: { sortBy: 'createdAt', sortOrder: 'desc' } as PageParams,
  });
  const [formState, setFormState] = useState({
    roles: [] as Role[],
    loadingRoles: false,
    searchingUsers: false,
    userOptions: [] as AppUser[],
    selectedUser: null as AppUser | null,
    deleteReason: '',
  });
  const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));
  const setForm = (partial: Partial<typeof formState>) => setFormState(prev => ({ ...prev, ...partial }));

  useEffect(() => {
    api.getCurrentCompany().then(r => { if (r.success && r.data) set({ currentCompany: r.data }); });
    api.getAllRoles().then(r => {
      if (r.success && r.data) {
        const roles = r.data.queryable || [];
        setFormState(p => ({ ...p, roles }));
        const map: Record<string, string> = {};
        roles.forEach((role: Role) => { if (role.id) map[role.id] = role.name; });
        set({ roleMap: map });
      }
    });
    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
  }, []);

  const fetchStatistics = useCallback(async () => {
    const res = await api.statistics();
    if (res.success && res.data) set({ statistics: res.data });
  }, []);

  const handleSearch = useCallback((params: PageParams) => {
    set(p => ({ ...p, searchParams: { ...p.searchParams, ...params, page: 1 } }));
    actionRef.current?.reload();
  }, []);

  const handleToggleStatus = useCallback(async (user: AppUser) => {
    const res = user.isActive ? await api.deactivate(user.id) : await api.activate(user.id);
    if (res.success) {
      message.success(user.isActive
        ? intl.formatMessage({ id: 'pages.userManagement.userDeactivated' })
        : intl.formatMessage({ id: 'pages.userManagement.userActivated' })
      );
      fetchStatistics();
      actionRef.current?.reload();
    }
  }, [intl, message, fetchStatistics]);

  const handleDelete = useCallback(async (userId: string) => {
    let deleteReason = '';
    modal.confirm({
      title: intl.formatMessage({ id: 'pages.modal.confirmDeleteUser' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.modal.irreversibleOperation' })}</p>
          <Input.TextArea
            rows={3}
            placeholder={intl.formatMessage({ id: 'pages.modal.pleaseEnterReasonOptional' })}
            onChange={(e) => { deleteReason = e.target.value; }}
            maxLength={200}
          />
        </div>
      ),
      okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
      cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
      okType: 'danger',
      onOk: async () => {
        const res = await api.delete(userId, deleteReason);
        if (res.success) {
          message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
          fetchStatistics();
          actionRef.current?.reload();
        }
      },
    });
  }, [intl, modal, message, fetchStatistics]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (state.selectedRows.length === 0) {
      message.warning(intl.formatMessage({ id: 'pages.message.pleaseSelect' }));
      return;
    }
    const userIds = state.selectedRows.map((user) => user.id);
    if (action === 'delete') {
      let deleteReason = '';
      modal.confirm({
        title: intl.formatMessage({ id: 'pages.modal.confirmBatchDelete' }, { count: state.selectedRows.length }),
        content: (
          <div>
            <p>{intl.formatMessage({ id: 'pages.modal.irreversibleOperation' })}</p>
            <Input.TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'pages.modal.pleaseEnterReasonOptional' })}
              onChange={(e) => { deleteReason = e.target.value; }}
              maxLength={200}
            />
          </div>
        ),
        okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
        cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
        okType: 'danger',
        onOk: async () => {
          const res = await api.bulkAction(userIds, action, deleteReason);
          if (res.success) {
            message.success(`批量删除成功`);
            set({ selectedRows: [] });
            fetchStatistics();
            actionRef.current?.reload();
          }
        },
      });
      return;
    }
    const res = await api.bulkAction(userIds, action);
    if (res.success) {
      message.success(intl.formatMessage({ id: 'pages.message.success' }));
      set({ selectedRows: [] });
      fetchStatistics();
      actionRef.current?.reload();
    }
  }, [state.selectedRows, intl, modal, message, fetchStatistics]);

  const roleOptions = useMemo(() =>
    formState.roles.filter((r): r is Role & { id: string } => Boolean(r.id)).map(r => ({ label: r.name, value: r.id })),
    [formState.roles]
  );

  const columns: ProColumns<AppUser>[] = useMemo(() => [
    { title: intl.formatMessage({ id: 'pages.table.username' }), dataIndex: 'username', key: 'username', render: (dom: any, r: AppUser) => (
      <Space><UserOutlined /><a onClick={() => set({ viewingUser: r, detailVisible: true })}>{dom}</a>
        {state.currentCompany?.createdBy === r.id && (
          <Tag icon={<CrownOutlined />} color="gold">{intl.formatMessage({ id: 'pages.userManagement.role.creator' })}</Tag>
        )}
      </Space>
    )},
    { title: '姓名', dataIndex: 'name', key: 'name', ellipsis: true, render: (dom: string) => dom || '-' },
    { title: intl.formatMessage({ id: 'pages.table.email' }), dataIndex: 'email', key: 'email', ellipsis: true, responsive: ['md'] },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', ellipsis: true, responsive: ['lg'], render: (dom: string) => dom || '-' },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 80, responsive: ['lg'], render: (dom: number) => dom || '-' },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true, responsive: ['xl'], render: (dom: string) => dom || '-' },
    { title: intl.formatMessage({ id: 'pages.table.role' }), dataIndex: 'roleIds', key: 'roleIds', responsive: ['md'], render: (_: string[], r: AppUser) => (
      !r.roleIds?.length ? <Tag color="default">{intl.formatMessage({ id: 'pages.table.unassigned' })}</Tag> :
        <Space wrap>{r.roleIds.map(id => <Tag key={id} color="blue">{state.roleMap[id] || id}</Tag>)}</Space>
    )},
    { title: intl.formatMessage({ id: 'pages.table.organization' }), dataIndex: 'organizations', key: 'organizations', responsive: ['lg'], render: (_: unknown, r: AppUser) => {
      const orgs = r.organizations || [];
      if (!orgs.length) return <Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.userManagement.organization.empty' })}</Typography.Text>;
      return (
        <Space direction="vertical" size={4} wrap>
          {orgs.map((org) => (
            <Space key={org.id || org.fullPath || org.name} size={4} wrap>
              <span>{org.fullPath || org.name || '-'}</span>
              {org.isPrimary ? <Tag color="gold" variant="filled" style={{ marginInlineStart: 4 }}>{intl.formatMessage({ id: 'pages.userManagement.organization.primary' })}</Tag> : null}
            </Space>
          ))}
        </Space>
      );
    }},
    { title: intl.formatMessage({ id: 'pages.table.status' }), dataIndex: 'isActive', key: 'isActive', render: (_: boolean, r: AppUser) => (
      <Badge status={r.isActive ? 'success' : 'error'} text={r.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })} />
    )},
    { title: intl.formatMessage({ id: 'pages.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, render: (_: string, r: AppUser) => formatDateTime(r.createdAt) },
    { title: intl.formatMessage({ id: 'pages.table.lastLogin' }), dataIndex: 'lastLoginAt', key: 'lastLoginAt', render: (_: string, r: AppUser) => formatDateTime(r.lastLoginAt) },
    { title: intl.formatMessage({ id: 'pages.table.actions' }), key: 'action', fixed: 'right', width: 150, render: (_: any, r: AppUser) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingUser: r, formVisible: true })}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)}>{intl.formatMessage({ id: 'pages.table.delete' })}</Button>
      </Space>
    )},
  ], [intl, state.roleMap, state.currentCompany, handleDelete]);

  const statsConfig = [
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.totalUsers' }), value: state.statistics?.totalUsers ?? 0, icon: <TeamOutlined />, color: '#1890ff' },
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.activeUsers' }), value: state.statistics?.activeUsers ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.adminUsers' }), value: state.statistics?.adminUsers ?? 0, icon: <UserOutlined />, color: '#faad14' },
    { title: intl.formatMessage({ id: 'pages.userManagement.statistics.newUsersThisMonth' }), value: state.statistics?.newUsersThisMonth ?? 0, icon: <PlusOutlined />, color: '#1890ff' },
  ];

  const handleUserSearch = async (value: string) => {
    if (!value || value.length < 2) { setForm({ userOptions: [] }); return; }
    setForm({ searchingUsers: true });
    try {
      const res = await api.searchUsers(value);
      if (res.success && res.data) setForm({ userOptions: res.data.users || [] });
    } finally { setForm({ searchingUsers: false }); }
  };

  const handleUserSelect = (username: string, option: any) => {
    const u = option.user;
    setForm({ selectedUser: u });
  };

  return (
    <PageContainer
      title={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.userManagement.title' })}</Space>}
      tabList={[
        { tab: intl.formatMessage({ id: 'pages.userManagement.members.title' }), key: 'members' },
        { tab: intl.formatMessage({ id: 'pages.joinRequests.pending.title' }), key: 'requests' },
      ]}
      tabActiveKey={activeTab}
      onTabChange={(key: string) => { setActiveTab(key); if (key === 'members') actionRef.current?.reload(); }}
      extra={
        <Space wrap>
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => { fetchStatistics(); actionRef.current?.reload(); }}>{intl.formatMessage({ id: 'pages.userManagement.refresh' })}</Button>
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingUser: null, formVisible: true })}>{intl.formatMessage({ id: 'pages.userManagement.addUser' })}</Button>
        </Space>
      }
    >
      {activeTab === 'members' && (
        <>
          {state.statistics && (
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={[12, 12]}>
                {statsConfig.map((stat, idx) => (
                  <Col xs={24} sm={12} md={6} key={idx}><StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} /></Col>
                ))}
              </Row>
            </Card>
          )}

          <SearchBar initialParams={state.searchParams} onSearch={handleSearch} style={{ marginBottom: 16 }} />

          <ProTable actionRef={actionRef}
            request={async (params: any) => {
              const { pageSize, current } = params;
              const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
              const res = await api.list({ page: current, pageSize, ...state.searchParams, ...sortParams });
              api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
              return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
            }}
            columns={columns} rowKey="id" search={false}
            rowSelection={{ selectedRowKeys: state.selectedRows.map(r => r.id), onChange: (_: React.Key[], selectedRows: AppUser[]) => set({ selectedRows }) }}
            onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
            toolBarRender={() => [
              <Button key="activate" disabled={!state.selectedRows.length} onClick={() => handleBulkAction('activate')}>批量激活</Button>,
              <Button key="deactivate" disabled={!state.selectedRows.length} onClick={() => handleBulkAction('deactivate')}>批量禁用</Button>,
              <Button key="delete" danger disabled={!state.selectedRows.length} onClick={() => handleBulkAction('delete')}>批量删除</Button>,
            ]}
          />

          <ModalForm key={state.editingUser?.id || 'create'}
            title={state.editingUser ? intl.formatMessage({ id: 'pages.userManagement.editUser' }) : '添加成员'}
            open={state.formVisible}
            onOpenChange={(open) => { if (!open) set({ formVisible: false, editingUser: null }); setForm({ selectedUser: null }); }}
            initialValues={state.editingUser ? {
              username: state.editingUser.username, email: state.editingUser.email,
              phoneNumber: state.editingUser.phoneNumber, roleIds: state.editingUser.roleIds || [],
              isActive: state.editingUser.isActive, remark: state.editingUser.remark,
            } : undefined}
            onFinish={async (values) => {
              if (!state.editingUser && !formState.selectedUser) {
                message.error('请选择用户');
                return false;
              }
              if (state.editingUser) {
                const res = await api.update(state.editingUser.id, {
                  username: values.username, email: values.email, phoneNumber: values.phoneNumber,
                  roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark,
                });
                if (res.success) {
                  message.success(intl.formatMessage({ id: 'pages.message.updateSuccess' }));
                  set({ formVisible: false, editingUser: null });
                  fetchStatistics();
                  actionRef.current?.reload();
                }
                return res.success;
              } else {
                const res = await api.create({
                  username: formState.selectedUser?.username, email: formState.selectedUser?.email,
                  phoneNumber: formState.selectedUser?.phoneNumber, password: values.password,
                  roleIds: values.roleIds || [], isActive: values.isActive, remark: values.remark,
                });
                if (res.success) {
                  message.success(intl.formatMessage({ id: 'pages.message.createSuccess' }));
                  set({ formVisible: false, editingUser: null });
                  fetchStatistics();
                  actionRef.current?.reload();
                }
                return res.success;
              }
            }}
            autoFocusFirstInput width={600}
          >
            {!state.editingUser && (
              <ProFormSelect name="username" label="选择用户" placeholder="搜索系统已有用户"
                showSearch onSearch={handleUserSearch} onSelect={handleUserSelect} onChange={(v) => !v && setForm({ selectedUser: null })}
                filterOption={false} allowClear suffixIcon={<SearchOutlined />}
                notFoundContent={formState.searchingUsers ? <Spin size="small" /> : '未找到相关用户'}
                options={formState.userOptions.map(u => ({ label: `${u.username}${u.email ? `(${u.email})` : ''}`, value: u.username, user: u }))}
                rules={[{ required: true, message: '请搜索并选择用户' }]}
              />
            )}
            {state.editingUser && <ProFormText name="username" label="用户名" disabled />}
            <ProFormText name="email" label="邮箱" placeholder="请输入邮箱" />
            <ProFormText name="phoneNumber" label="手机号" placeholder="请输入手机号" />
            {!state.editingUser && (
              <ProFormText name="password" label="密码" placeholder="请输入密码" rules={[{ required: true, message: '请输入密码' }]} />
            )}
            <ProFormSelect name="roleIds" label="角色" mode="multiple" placeholder="请选择角色"
              showSearch allowClear options={roleOptions}
              rules={[{ required: true, message: '请选择至少一个角色' }]}
            />
            <ProFormSwitch name="isActive" label="状态" checkedChildren="启用" unCheckedChildren="禁用" />
            <ProFormText name="remark" label="备注" placeholder="备注信息" />
          </ModalForm>

          <Drawer title={intl.formatMessage({ id: 'pages.userDetail.title' })} placement="right" open={state.detailVisible}
            onClose={() => set({ detailVisible: false, viewingUser: null })} width={600} destroyOnClose>
            <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>}>
              {state.viewingUser && <UserDetail user={state.viewingUser} onClose={() => set({ detailVisible: false, viewingUser: null })} />}
            </React.Suspense>
          </Drawer>
        </>
      )}

      {activeTab === 'requests' && (
        <React.Suspense fallback={null}>
          <JoinRequestsTable companyId={state.currentCompany?.id || ''} />
        </React.Suspense>
      )}
    </PageContainer>
  );
};

export default UserManagement;
