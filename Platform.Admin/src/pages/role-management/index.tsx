import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Space, Button, Input, Drawer, Descriptions, Popconfirm, Switch, Tree, Spin, Divider } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-form';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import { ApiResponse, PagedResult, PageParams } from '@/types';
import dayjs from 'dayjs';

// ==================== Types ====================
interface Role { id?: string; name: string; description?: string; menuIds: string[]; isActive: boolean; createdAt?: string; updatedAt?: string; }
interface RoleWithStats extends Role { userCount?: number; menuCount?: number; }
interface RoleStatistics { totalRoles: number; activeRoles: number; totalUsers: number; totalMenus: number; }
interface CreateRoleRequest { name: string; description?: string; menuIds: string[]; isActive: boolean; }
interface UpdateRoleRequest { name?: string; description?: string; menuIds?: string[]; isActive?: boolean; }
interface MenuTreeNode { id?: string; name?: string; title?: string; children?: MenuTreeNode[]; }

// ==================== API ====================
const api = {
  list: (params: PageParams) => request<ApiResponse<PagedResult<RoleWithStats>>>('/api/role/with-stats', { params }),
  statistics: () => request<ApiResponse<RoleStatistics>>('/api/role/statistics'),
  get: (id: string) => request<ApiResponse<Role>>(`/api/role/${id}`),
  create: (data: CreateRoleRequest) => request<ApiResponse<Role>>('/api/role', { method: 'POST', data }),
  update: (id: string, data: UpdateRoleRequest) => request<ApiResponse<boolean>>(`/api/role/${id}`, { method: 'PUT', data }),
  delete: (id: string, reason?: string) => request<ApiResponse<boolean>>(`/api/role/${id}`, { method: 'DELETE', params: { reason } }),
  menuTree: () => request<ApiResponse<MenuTreeNode[]>>('/api/menu/tree'),
  roleMenus: (id: string) => request<ApiResponse<string[]>>(`/api/role/${id}/menus`),
};

// ==================== Main ====================
const RoleManagement: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as RoleStatistics | null,
    editingRole: null as RoleWithStats | null,
    formVisible: false,
    detailVisible: false,
    viewingRole: null as RoleWithStats | null,
    sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
    searchText: '',
  });
  const [formState, setFormState] = useState({
    menuTree: [] as any[],
    checkedKeys: [] as string[],
    expandedKeys: [] as string[],
    menuLoading: false,
    deleteReason: '',
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
  }, []);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);

  const columns: ProColumns<RoleWithStats>[] = [
    { title: intl.formatMessage({ id: 'pages.table.roleName' }), dataIndex: 'name', sorter: true, render: (dom, r) => <a onClick={() => set({ viewingRole: r, detailVisible: true })}>{dom}</a> },
    { title: intl.formatMessage({ id: 'pages.table.description' }), dataIndex: 'description', sorter: true, ellipsis: true, render: (dom) => dom || '-' },
    { title: intl.formatMessage({ id: 'pages.table.status' }), dataIndex: 'isActive', sorter: true, render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.table.stats' }), valueType: 'option', render: (_, r) => <Space separator="|"><span>{intl.formatMessage({ id: 'pages.table.user' })}: {r.userCount || 0}</span><span>{intl.formatMessage({ id: 'pages.table.menu' })}: {r.menuCount || 0}</span></Space> },
    { title: intl.formatMessage({ id: 'pages.table.createdAt' }), dataIndex: 'createdAt', sorter: true, render: (dom) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { title: intl.formatMessage({ id: 'pages.table.actions' }), valueType: 'option', fixed: 'right', width: 150, render: (_, r) => [
      <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingRole: r, formVisible: true }); setFormState(p => ({ ...p, checkedKeys: r.menuIds || [] })); }}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>,
      <Popconfirm key="delete" title={intl.formatMessage({ id: 'pages.modal.confirmDeleteRole' }, { roleName: r.name })} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); loadStatistics(); }}><Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.table.delete' })}</Button></Popconfirm>,
    ]},
  ];

  const statItems = [
    { value: state.statistics?.totalRoles, label: intl.formatMessage({ id: 'pages.roleManagement.statistics.totalRoles' }) },
    { value: state.statistics?.activeRoles, label: intl.formatMessage({ id: 'pages.roleManagement.statistics.activeRoles' }) },
    { value: state.statistics?.totalUsers, label: intl.formatMessage({ id: 'pages.roleManagement.statistics.totalUsers' }) },
    { value: state.statistics?.totalMenus, label: intl.formatMessage({ id: 'pages.roleManagement.statistics.totalMenus' }) },
  ];

  const convertToTreeData = (menus: MenuTreeNode[]): any[] => menus.filter((m): m is MenuTreeNode & { id: string } => Boolean(m.id)).map(m => ({ key: m.id, title: m.title || m.name, children: m.children ? convertToTreeData(m.children) : [] }));
  const getAllKeys = (menus: any[]): string[] => { let keys: string[] = []; menus.forEach(m => { if (m.key) keys.push(m.key); if (m.children?.length) keys = keys.concat(getAllKeys(m.children)); }); return keys; };

  return (
    <PageContainer title={<Space><SafetyOutlined />{intl.formatMessage({ id: 'pages.roleManagement.title' })}</Space>} extra={<Space wrap><Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button><Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingRole: null, formVisible: true }); setFormState(p => ({ ...p, checkedKeys: [], expandedKeys: [] })); }}>{intl.formatMessage({ id: 'pages.button.addRole' })}</Button></Space>}>
      <ProCard gutter={16} style={{ marginBottom: 16 }}>
        {statItems.map(item => (
          <ProCard key={item.label} colSpan={{ xs: 24, sm: 12, md: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{item.value || 0}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{item.label}</div>
          </ProCard>
        ))}
      </ProCard>

      <ProTable actionRef={actionRef} request={async (params) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = await api.list({ page: current, pageSize, search: state.searchText, ...sortParams });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        onChange={(_, __, s) => set({ sorter: s?.order ? { sortBy: s.field as string, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
        toolBarRender={() => [<Input.Search key="search" placeholder={intl.formatMessage({ id: 'pages.table.search' })} allowClear value={state.searchText} onChange={(e) => set({ searchText: e.target.value })} onSearch={(v) => { set({ searchText: v }); actionRef.current?.reload(); }} />]}
      />

      <ModalForm key={state.editingRole?.id || 'create'}
        title={state.editingRole ? intl.formatMessage({ id: 'pages.roleForm.editTitle' }) : intl.formatMessage({ id: 'pages.roleForm.createTitle' })}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingRole: null }); }}
        initialValues={state.editingRole ? { name: state.editingRole.name, description: state.editingRole.description, isActive: state.editingRole.isActive } : { isActive: true }}
        onFinish={async (values) => {
          const data = { name: values.name, description: values.description, menuIds: formState.checkedKeys, isActive: values.isActive };
          const res = state.editingRole ? await api.update(state.editingRole.id!, data) : await api.create(data);
          if (res.success) { set({ formVisible: false, editingRole: null }); actionRef.current?.reload(); loadStatistics(); }
          return res.success;
        }} autoFocusFirstInput width={700}
      >
        <ProFormText name="name" label={intl.formatMessage({ id: 'pages.roleForm.nameLabel' })} placeholder={intl.formatMessage({ id: 'pages.roleForm.namePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.roleForm.nameRequired' }) }]} />
        <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.roleForm.descriptionLabel' })} placeholder={intl.formatMessage({ id: 'pages.roleForm.descriptionPlaceholder' })} />
        <Divider>{intl.formatMessage({ id: 'pages.roleForm.menuPermission' })}</Divider>
        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={() => { const all = getAllKeys(formState.menuTree); setFormState(p => ({ ...p, checkedKeys: p.checkedKeys.length === all.length ? [] : all })); }} style={{ padding: 0 }}>
            {formState.checkedKeys.length === getAllKeys(formState.menuTree).length ? intl.formatMessage({ id: 'pages.roleForm.deselectAll' }) : intl.formatMessage({ id: 'pages.roleForm.selectAll' })}
          </Button>
        </div>
        {formState.menuLoading ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div> : <Tree checkable checkStrictly defaultExpandAll treeData={formState.menuTree} checkedKeys={formState.checkedKeys} expandedKeys={formState.expandedKeys} onExpand={(keys: any) => setFormState(p => ({ ...p, expandedKeys: keys.map(String) }))} onCheck={(checked: any) => setFormState(p => ({ ...p, checkedKeys: Array.isArray(checked) ? checked : checked.checked }))} />}
        <div style={{ marginTop: 16 }}><Switch checked={formState.checkedKeys.length > 0} disabled /> <span style={{ marginLeft: 8 }}>{intl.formatMessage({ id: 'pages.roleForm.menuCount' }, { count: formState.checkedKeys.length })}</span></div>
        <div style={{ marginTop: 16 }}><ProFormText name="isActive" label={intl.formatMessage({ id: 'pages.roleForm.isActiveLabel' })} /></div>
      </ModalForm>

      <Drawer title={state.viewingRole ? `${intl.formatMessage({ id: 'pages.roleManagement.title' })} - ${state.viewingRole.name}` : intl.formatMessage({ id: 'pages.roleManagement.title' })} open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingRole: null })} styles={{ wrapper: { width: 600 } }}>
        {state.viewingRole && <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.table.roleName' })}>{state.viewingRole.name}</Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.table.description' })}>{state.viewingRole.description || '-'}</Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.table.status' })}><Tag color={state.viewingRole.isActive ? 'success' : 'default'}>{state.viewingRole.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}</Tag></Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.table.stats' })}><Space><span>{intl.formatMessage({ id: 'pages.table.user' })}: {state.viewingRole.userCount || 0}</span><span>{intl.formatMessage({ id: 'pages.table.menu' })}: {state.viewingRole.menuCount || 0}</span></Space></Descriptions.Item>
          <Descriptions.Item label={intl.formatMessage({ id: 'pages.table.createdAt' })}>{state.viewingRole.createdAt ? dayjs(state.viewingRole.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
          {state.viewingRole.updatedAt && <Descriptions.Item label="更新时间">{dayjs(state.viewingRole.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>}
        </Descriptions>}
      </Drawer>
    </PageContainer>
  );
};

export default RoleManagement;