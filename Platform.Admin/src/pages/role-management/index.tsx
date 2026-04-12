import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Tag, Space, Button, Input, Popconfirm, Switch, Tree, Spin, Divider } from 'antd';
import { Drawer } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormTextArea, ProFormSwitch, ProForm } from '@ant-design/pro-form';
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
  list: (params: PageParams) => request<ApiResponse<PagedResult<RoleWithStats>>>('/apiservice/api/role/with-stats', { params }),
  statistics: () => request<ApiResponse<RoleStatistics>>('/apiservice/api/role/statistics'),
  get: (id: string) => request<ApiResponse<Role>>(`/apiservice/api/role/${id}`),
  create: (data: CreateRoleRequest) => request<ApiResponse<Role>>('/apiservice/api/role', { method: 'POST', data }),
  update: (id: string, data: UpdateRoleRequest) => request<ApiResponse<boolean>>(`/apiservice/api/role/${id}`, { method: 'PUT', data }),
  delete: (id: string, reason?: string) => request<ApiResponse<boolean>>(`/apiservice/api/role/${id}`, { method: 'DELETE', params: { reason } }),
  menuTree: () => request<ApiResponse<MenuTreeNode[]>>('/apiservice/api/menu/tree'),
  roleMenus: (id: string) => request<ApiResponse<string[]>>(`/apiservice/api/role/${id}/menus`),
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
    search: '',
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
    { title: intl.formatMessage({ id: 'pages.table.roleName' }), dataIndex: 'name', key: 'name', sorter: true, render: (dom, r) => <a onClick={() => set({ viewingRole: r, detailVisible: true })}>{dom}</a>, search: true },
    { title: intl.formatMessage({ id: 'pages.table.description' }), dataIndex: 'description', key: 'description', sorter: true, ellipsis: true, render: (dom) => dom || '-', search: true },
    { title: intl.formatMessage({ id: 'pages.table.status' }), dataIndex: 'isActive', key: 'isActive', sorter: true, valueType: 'select', fieldProps: { options: [{ label: intl.formatMessage({ id: 'pages.table.activated' }), value: 'true' }, { label: intl.formatMessage({ id: 'pages.table.deactivated' }), value: 'false' }] }, render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.table.stats' }), valueType: 'option', render: (_, r) => <Space separator="|"><span>{intl.formatMessage({ id: 'pages.table.user' })}: {r.userCount || 0}</span><span>{intl.formatMessage({ id: 'pages.table.menu' })}: {r.menuCount || 0}</span></Space> },
    { title: intl.formatMessage({ id: 'pages.table.createdAt' }), dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
    { title: intl.formatMessage({ id: 'pages.table.actions' }), key: 'action', valueType: 'option', fixed: 'right', width: 180, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { set({ editingRole: r, formVisible: true }); setFormState(p => ({ ...p, checkedKeys: r.menuIds || [] })); }}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
        <Popconfirm title={intl.formatMessage({ id: 'pages.modal.confirmDeleteRole' }, { roleName: r.name })} onConfirm={async () => { await api.delete(r.id!); actionRef.current?.reload(); loadStatistics(); }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.table.delete' })}</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

  const convertToTreeData = (menus: MenuTreeNode[]): any[] => menus.filter((m): m is MenuTreeNode & { id: string } => Boolean(m.id)).map(m => ({ key: m.id, title: m.title || m.name, children: m.children ? convertToTreeData(m.children) : [] }));
  const getAllKeys = (menus: any[]): string[] => { let keys: string[] = []; menus.forEach(m => { if (m.key) keys.push(m.key); if (m.children?.length) keys = keys.concat(getAllKeys(m.children)); }); return keys; };

  return (
    <PageContainer>
      <ProTable actionRef={actionRef} request={async (params) => {
        const { current, pageSize, name, description, isActive } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const filterParams = { name: name || undefined, description: description || undefined, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined };
        const res = await api.list({ page: current, pageSize, ...filterParams, ...sortParams });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }} columns={columns} rowKey="id" search={false}
        headerTitle={
          <Space size={24}>
            <Space><SafetyOutlined />角色管理</Space>
            <Space size={12}>
              <Tag color="blue">角色总数 {state.statistics?.totalRoles || 0}</Tag>
              <Tag color="green">启用 {state.statistics?.activeRoles || 0}</Tag>
              <Tag color="orange">用户数 {state.statistics?.totalUsers || 0}</Tag>
              <Tag color="purple">菜单数 {state.statistics?.totalMenus || 0}</Tag>
            </Space>
          </Space>
        }
        onChange={(_, __, s: any) => set({ sorter: s?.order ? { sortBy: s.field as string, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
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
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => { set({ editingRole: null, formVisible: true }); setFormState(p => ({ ...p, checkedKeys: [], expandedKeys: [] })); }}>{intl.formatMessage({ id: 'pages.button.addRole' })}</Button>,
        ]}
      />

      <ModalForm key={state.editingRole?.id || 'create'}
        title={state.editingRole ? intl.formatMessage({ id: 'pages.roleForm.editTitle' }) : intl.formatMessage({ id: 'pages.roleForm.createTitle' })}
        open={state.formVisible}
        onOpenChange={(open) => { 
          if (open) {
            setFormState(p => ({ ...p, menuLoading: true }));
            Promise.all([
              api.menuTree(),
              state.editingRole ? api.roleMenus(state.editingRole.id!) : Promise.resolve({ success: true, data: [] })
            ]).then(([menuRes, roleMenuRes]) => {
              if (menuRes.success && menuRes.data) {
                const treeData = convertToTreeData(menuRes.data);
                const roleMenus = roleMenuRes.success ? roleMenuRes.data || [] : [];
                setFormState(p => ({ ...p, menuTree: treeData, checkedKeys: roleMenus, menuLoading: false }));
              } else {
                setFormState(p => ({ ...p, menuLoading: false }));
              }
            });
          } else {
            set({ formVisible: false, editingRole: null });
          }
        }}
        initialValues={state.editingRole ? { name: state.editingRole.name, description: state.editingRole.description, isActive: state.editingRole.isActive } : { isActive: true }}
        onFinish={async (values) => {
          const data = { name: values.name, description: values.description, menuIds: formState.checkedKeys, isActive: values.isActive };
          const res = state.editingRole ? await api.update(state.editingRole.id!, data) : await api.create(data);
          if (res.success) { set({ formVisible: false, editingRole: null }); actionRef.current?.reload(); loadStatistics(); }
          return res.success;
        }} autoFocusFirstInput width={700}
      >
        <ProFormText name="name" label={intl.formatMessage({ id: 'pages.roleForm.nameLabel' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.roleForm.nameRequired' }) }]} placeholder={intl.formatMessage({ id: 'pages.roleForm.namePlaceholder' })} />
        <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.roleForm.descriptionLabel' })} placeholder={intl.formatMessage({ id: 'pages.roleForm.descriptionPlaceholder' })} rows={3} />
        <ProFormSwitch name="isActive" label={intl.formatMessage({ id: 'pages.roleForm.isActiveLabel' })} />
        <Divider>{intl.formatMessage({ id: 'pages.roleForm.menuPermission' })}</Divider>
        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={() => { const all = getAllKeys(formState.menuTree); setFormState(p => ({ ...p, checkedKeys: p.checkedKeys.length === all.length ? [] : all })); }} style={{ padding: 0 }}>
            {formState.checkedKeys.length === getAllKeys(formState.menuTree).length ? intl.formatMessage({ id: 'pages.roleForm.deselectAll' }) : intl.formatMessage({ id: 'pages.roleForm.selectAll' })}
          </Button>
        </div>
        {formState.menuLoading ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div> : <Tree checkable checkStrictly defaultExpandAll treeData={formState.menuTree} checkedKeys={formState.checkedKeys} expandedKeys={formState.expandedKeys} onExpand={(keys: any) => setFormState(p => ({ ...p, expandedKeys: keys.map(String) }))} onCheck={(checked: any) => setFormState(p => ({ ...p, checkedKeys: Array.isArray(checked) ? checked : checked.checked }))} />}
        <div style={{ marginTop: 16 }}><Switch checked={formState.checkedKeys.length > 0} disabled /> <span style={{ marginLeft: 8 }}>{intl.formatMessage({ id: 'pages.roleForm.menuCount' }, { count: formState.checkedKeys.length })}</span></div>
      </ModalForm>

      <Drawer title={state.viewingRole ? `${intl.formatMessage({ id: 'pages.roleManagement.title' })} - ${state.viewingRole.name}` : intl.formatMessage({ id: 'pages.roleManagement.title' })} open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingRole: null })} size="large">
        {state.viewingRole && <ProDescriptions column={1} bordered size="small">
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.table.roleName' })}>{state.viewingRole.name}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.table.description' })}>{state.viewingRole.description || '-'}</ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.table.status' })}><Tag color={state.viewingRole.isActive ? 'success' : 'default'}>{state.viewingRole.isActive ? intl.formatMessage({ id: 'pages.table.activated' }) : intl.formatMessage({ id: 'pages.table.deactivated' })}</Tag></ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.table.stats' })}><Space><span>{intl.formatMessage({ id: 'pages.table.user' })}: {state.viewingRole.userCount || 0}</span><span>{intl.formatMessage({ id: 'pages.table.menu' })}: {state.viewingRole.menuCount || 0}</span></Space></ProDescriptions.Item>
          <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.table.createdAt' })}>{state.viewingRole.createdAt ? dayjs(state.viewingRole.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
          {state.viewingRole.updatedAt && <ProDescriptions.Item label="更新时间">{dayjs(state.viewingRole.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</ProDescriptions.Item>}
        </ProDescriptions>}
      </Drawer>
    </PageContainer>
  );
};

export default RoleManagement;