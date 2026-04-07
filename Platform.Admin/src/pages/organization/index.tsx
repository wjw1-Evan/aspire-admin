import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { Card, Button, Col, Empty, Form, Input, Modal, Popconfirm, Row, Select, Space, Spin, Tag, Tree, TreeSelect, Typography, theme } from 'antd';
import { ProCard, ProDescriptions } from '@ant-design/pro-components';
import { ProFormText, ProFormDigit, ModalForm } from '@ant-design/pro-form';
import useCommonStyles from '@/hooks/useCommonStyles';
import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { TreeSelectProps } from 'antd/es/tree-select';
import { useMessage } from '@/hooks/useMessage';
import dayjs from 'dayjs';
import { ApiResponse } from '@/types';

const { Text } = Typography;
const { Search } = Input;

// ==================== Types ====================
interface OrgNode { id?: string; name: string; code?: string; parentId?: string; description?: string; sortOrder?: number; managerUserId?: string; createdAt?: string; updatedAt?: string; children?: OrgNode[]; }
interface OrgMember { userId: string; username: string; email?: string; organizationUnitId: string; organizationUnitName?: string; }
interface AvailableUser { value: string; label: string; }

// ==================== API ====================
const api = {
  tree: () => request<ApiResponse<OrgNode[]>>('/api/organization/tree'),
  create: (data: any) => request<ApiResponse<OrgNode>>('/api/organization', { method: 'POST', data }),
  update: (id: string, data: any) => request<ApiResponse<boolean>>(`/api/organization/${id}`, { method: 'PUT', data }),
  delete: (id: string) => request<ApiResponse<boolean>>(`/api/organization/${id}`, { method: 'DELETE' }),
  reorder: (items: any[]) => request<ApiResponse<boolean>>('/api/organization/reorder', { method: 'POST', data: items }),
  members: (orgId: string) => request<ApiResponse<OrgMember[]>>(`/api/organization/${orgId}/members`),
  assignUser: (data: any) => request<ApiResponse<boolean>>('/api/organization/assign-user', { method: 'POST', data }),
  removeUser: (data: { userId: string; organizationUnitId: string }) => request<ApiResponse<boolean>>('/api/organization/remove-user', { method: 'POST', data }),
  availableUsers: (orgId: string, query?: string) => request<ApiResponse<AvailableUser[]>>(`/api/organization/${orgId}/available-users`, { params: query ? { query } : undefined }),
};

// ==================== Tree Helpers ====================
const buildTreeData = (nodes: OrgNode[], search: string): DataNode[] =>
  nodes.map(node => {
    const name = node.name || '';
    const idx = search ? name.toLowerCase().indexOf(search.toLowerCase()) : -1;
    const title = idx > -1 ? (
      <span>{name.substring(0, idx)}<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{name.substring(idx, idx + search.length)}</span>{name.substring(idx + search.length)}</span>
    ) : <span>{name}</span>;
    return { key: node.id || node.name, title, icon: <ApartmentOutlined />, children: node.children ? buildTreeData(node.children, search) : undefined };
  });

const filterTree = (nodes: OrgNode[], search: string): OrgNode[] => {
  if (!search) return nodes;
  return nodes.map(node => {
    if (node.name.toLowerCase().includes(search.toLowerCase())) return node;
    if (node.children?.length) {
      const filtered = filterTree(node.children, search);
      if (filtered.length > 0) return { ...node, children: filtered };
    }
    return null;
  }).filter((n): n is OrgNode => n !== null);
};

const flattenTree = (nodes: OrgNode[]): Record<string, OrgNode> => {
  const map: Record<string, OrgNode> = {};
  const dfs = (list: OrgNode[]) => list.forEach(item => { if (item.id) map[item.id] = item; if (item.children?.length) dfs(item.children); });
  dfs(nodes);
  return map;
};

const collectDescendantIds = (node?: OrgNode): Set<string> => {
  const ids = new Set<string>();
  const traverse = (n?: OrgNode) => { if (!n?.children) return; n.children.forEach(c => { if (c.id) ids.add(c.id); traverse(c); }); };
  traverse(node);
  return ids;
};

// ==================== AssignUserModal ====================
const AssignUserModal: React.FC<{ open: boolean; orgId?: string; onCancel: () => void; onSubmit: (values: any) => Promise<void> }> = ({ open, orgId, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orgId) {
      setLoading(true);
      api.availableUsers(orgId).then(r => { if (r.success && r.data) setUsers(r.data); }).finally(() => setLoading(false));
      form.resetFields();
      form.setFieldsValue({ organizationUnitId: orgId });
    }
  }, [open, orgId, form]);

  const handleSearch = (value: string) => {
    if (!orgId) return;
    setLoading(true);
    api.availableUsers(orgId, value || undefined).then(r => { if (r.success && r.data) setUsers(r.data); }).finally(() => setLoading(false));
  };

  return (
    <Modal open={open} title="分配用户" destroyOnHidden onCancel={onCancel} onOk={async () => { const values = await form.validateFields(); await onSubmit(values); }}>
      <Form form={form} layout="vertical">
        <Form.Item name="organizationUnitId" hidden rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="userId" label="用户" rules={[{ required: true, message: '请选择用户' }]}>
          <Select showSearch placeholder="搜索用户" loading={loading} options={users} onSearch={handleSearch} filterOption={false} allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ==================== Main ====================
const OrganizationPage: React.FC = () => {
  const message = useMessage();
  const { styles } = useCommonStyles();
  const [state, setState] = useState({
    tree: [] as OrgNode[], loading: false, searchValue: '', selectedId: undefined as string | undefined,
    formOpen: false, submitLoading: false, editingNode: null as OrgNode | null, members: [] as OrgMember[],
    assignOpen: false, createParentId: undefined as string | undefined,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const selectedIdRef = useRef<string | undefined>(undefined);
  const nodeMap = useMemo(() => flattenTree(state.tree), [state.tree]);
  const selectedNode = useMemo(() => (state.selectedId ? nodeMap[state.selectedId] || null : null), [nodeMap, state.selectedId]);
  const filteredTree = useMemo(() => filterTree(state.tree, state.searchValue), [state.tree, state.searchValue]);
  const treeData = useMemo(() => buildTreeData(filteredTree, state.searchValue), [filteredTree, state.searchValue]);

  useEffect(() => { selectedIdRef.current = state.selectedId; }, [state.selectedId]);

  const openCreateModal = useCallback((parentId?: string) => {
    set({ formOpen: true, editingNode: null, createParentId: parentId });
  }, []);

  const refreshTree = useCallback(async () => {
    set({ loading: true });
    try {
      const res = await api.tree();
      if (res.success && res.data) {
        const newMap = flattenTree(res.data);
        set({ tree: res.data });
        if (res.data.length === 0) { set({ selectedId: undefined }); return; }
        const currentId = selectedIdRef.current;
        set({ selectedId: currentId && newMap[currentId] ? currentId : res.data[0].id });
      }
    } finally { set({ loading: false }); }
  }, []);

  useEffect(() => { refreshTree(); }, [refreshTree]);

  const fetchMembers = useCallback(async (orgId?: string) => {
    if (!orgId) { set({ members: [] }); return; }
    const res = await api.members(orgId);
    if (res.success && res.data) set({ members: res.data }); else set({ members: [] });
  }, []);

  useEffect(() => { fetchMembers(state.selectedId); }, [state.selectedId, fetchMembers]);

  const handleRemoveMember = async (userId: string) => {
    if (!state.selectedId) return;
    await api.removeUser({ userId, organizationUnitId: state.selectedId });
    message.success('删除成功');
    await fetchMembers(state.selectedId);
  };

  const disabledIds = useMemo(() => collectDescendantIds(state.editingNode || undefined), [state.editingNode]);
  const treeSelectData: TreeSelectProps['treeData'] = useMemo(() => {
    const build = (nodes: OrgNode[]): TreeSelectProps['treeData'] =>
      nodes.map(node => ({
        title: node.name, value: node.id, key: node.id,
        disabled: !!state.editingNode && !!node.id && (disabledIds.has(node.id) || node.id === state.editingNode.id),
        children: node.children ? build(node.children) : undefined,
      }));
    return build(state.tree);
  }, [state.tree, state.editingNode, disabledIds]);

  const buildParentChildrenMap = useCallback(() => {
    const map = new Map<string | undefined, string[]>();
    const dfs = (nodes: OrgNode[], parentId?: string) => nodes.forEach(n => {
      const id = n.id!;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(id);
      if (n.children?.length) dfs(n.children, id);
    });
    dfs(state.tree);
    return map;
  }, [state.tree]);

  const handleDrop = async (info: any) => {
    const dragId = String(info.dragNode?.key);
    const targetId = String(info.node?.key);
    const dropToGap = !!info.dropToGap;
    const dragNode = nodeMap[dragId];
    const targetNode = nodeMap[targetId];
    if (!dragNode || !targetNode) return;

    const newParentId = dropToGap ? targetNode.parentId : targetId;
    const dragDescendants = collectDescendantIds(dragNode);
    if (newParentId === dragId || (newParentId && dragDescendants.has(newParentId))) {
      message.error('无法移动到此位置'); return;
    }

    const parentChildren = buildParentChildrenMap();
    const sourceSiblings = parentChildren.get(dragNode.parentId) || [];
    const targetSiblings = parentChildren.get(newParentId) || [];
    const filteredSource = sourceSiblings.filter(id => id !== dragId);
    let insertIndex = targetSiblings.length;
    if (dropToGap) { const idx = targetSiblings.indexOf(targetId); insertIndex = idx >= 0 ? idx + 1 : targetSiblings.length; }
    const baseTarget = dragNode.parentId === newParentId ? [...targetSiblings].filter(id => id !== dragId) : [...targetSiblings];
    baseTarget.splice(insertIndex, 0, dragId);

    const items: any[] = [];
    baseTarget.forEach((id, idx) => items.push({ id, parentId: newParentId, sortOrder: idx + 1 }));
    if (dragNode.parentId !== newParentId) filteredSource.forEach((id, idx) => items.push({ id, parentId: dragNode.parentId, sortOrder: idx + 1 }));

    try {
      await api.reorder(items);
      message.success('更新成功');
      await refreshTree();
      set({ selectedId: dragId });
    } catch { message.error('更新失败'); }
  };

  return (
    <PageContainer>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={refreshTree}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal()}>创建根节点</Button>
      </Space>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8} lg={7}>
          <Card title="组织架构" className={styles.card} styles={{ body: { padding: 12 } }} style={{ height: '100%' }}>
            <div style={{ marginBottom: 12 }}><Search placeholder="搜索..." allowClear onChange={(e) => set({ searchValue: e.target.value })} style={{ width: '100%' }} /></div>
            <Spin spinning={state.loading}>
              {treeData.length > 0 ? (
                <Tree blockNode showIcon defaultExpandAll draggable onDrop={handleDrop} selectedKeys={state.selectedId ? [state.selectedId] : []} onSelect={(keys) => { if (keys[0]) set({ selectedId: keys[0] as string }); }} treeData={treeData} />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
            </Spin>
          </Card>
        </Col>
        <Col xs={24} md={16} lg={17}>
          <Card title="组织详情" className={styles.card} extra={selectedNode ? (
            <Space wrap>
              <Button icon={<PlusOutlined />} onClick={() => openCreateModal(selectedNode.id)}>创建子节点</Button>
              <Button icon={<EditOutlined />} onClick={() => set({ editingNode: selectedNode, formOpen: true })}>编辑</Button>
              <Popconfirm title="确定删除此组织？" onConfirm={async () => { await api.delete(selectedNode.id!); message.success('删除成功'); set({ selectedId: undefined }); await refreshTree(); }}>
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          ) : null} styles={{ body: { padding: 16, minHeight: 360 } }}>
            {selectedNode ? (
              <>
                <ProDescriptions column={2} bordered>
                  <ProDescriptions.Item label="名称"><Space><ApartmentOutlined /><Text strong>{selectedNode.name}</Text></Space></ProDescriptions.Item>
                  <ProDescriptions.Item label="编码">{selectedNode.code ? <Tag color="blue">{selectedNode.code}</Tag> : '-'}</ProDescriptions.Item>
                  <ProDescriptions.Item label="上级">{selectedNode.parentId ? nodeMap[selectedNode.parentId]?.name || '-' : '-'}</ProDescriptions.Item>
                  <ProDescriptions.Item label="排序"><Tag color="purple">{selectedNode.sortOrder ?? 1}</Tag></ProDescriptions.Item>
                  <ProDescriptions.Item label="负责人">{selectedNode.managerUserId ? <Space><UserOutlined /><Text>{selectedNode.managerUserId}</Text></Space> : '-'}</ProDescriptions.Item>
                  <ProDescriptions.Item label="更新时间">{selectedNode.updatedAt ? dayjs(selectedNode.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                  <ProDescriptions.Item span={2} label="描述">{selectedNode.description || '-'}</ProDescriptions.Item>
                  <ProDescriptions.Item label="创建时间">{selectedNode.createdAt ? dayjs(selectedNode.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                </ProDescriptions>
                <Card className={styles.card} style={{ marginTop: 16 }} title="成员列表" extra={<Button type="primary" onClick={() => set({ assignOpen: true })}>分配用户</Button>}>
                  {state.members.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {state.members.map((m, index) => (
                        <div key={`${m.userId}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                          <Space><UserOutlined /><Text strong>{m.username || m.userId}</Text>{m.email && <Tag color="geekblue">{m.email}</Tag>}</Space>
                          <Button type="link" danger size="small" onClick={() => { Modal.confirm({ title: '确定删除？', content: `将移除用户「${m.username || m.userId}」`, okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => handleRemoveMember(m.userId) }); }}>移除</Button>
                        </div>
                      ))}
                    </div>
                  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成员" />}
                </Card>
              </>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择组织节点" />}
          </Card>
        </Col>
      </Row>

      <ModalForm key={state.editingNode?.id || 'create'} title={state.editingNode ? '编辑组织' : '创建组织'} open={state.formOpen} onOpenChange={(open) => { if (!open) set({ formOpen: false, editingNode: null }); }}
        initialValues={state.editingNode ? { name: state.editingNode.name, code: state.editingNode.code, parentId: state.editingNode.parentId, description: state.editingNode.description, sortOrder: state.editingNode.sortOrder ?? 1, managerUserId: state.editingNode.managerUserId } : { parentId: state.createParentId, sortOrder: 1 }}
        onFinish={async (values) => {
          set({ submitLoading: true });
          try {
            if (state.editingNode?.id) { await api.update(state.editingNode.id, values); message.success('更新成功'); }
            else { const res = await api.create(values); message.success('创建成功'); if (res.success && res.data?.id) set({ selectedId: res.data.id }); }
            set({ formOpen: false, editingNode: null });
            await refreshTree();
            return true;
          } finally { set({ submitLoading: false }); }
        }} autoFocusFirstInput width={600}
      >
        <ProFormText name="name" label="名称" placeholder="请输入组织名称" rules={[{ required: true }]} />
        <ProFormText name="code" label="编码" placeholder="请输入组织编码" />
        <Form.Item name="parentId" label="上级组织"><TreeSelect allowClear treeData={treeSelectData} placeholder="选择上级组织" treeDefaultExpandAll showSearch /></Form.Item>
        <ProFormText name="managerUserId" label="负责人" placeholder="请输入负责人ID" />
        <ProFormDigit name="sortOrder" label="排序" min={1} placeholder="请输入排序" fieldProps={{ style: { width: '100%' } }} />
        <ProFormText name="description" label="描述" placeholder="请输入描述" />
      </ModalForm>

      <AssignUserModal open={state.assignOpen} orgId={state.selectedId} onCancel={() => set({ assignOpen: false })} onSubmit={async (values) => {
        await api.assignUser(values);
        set({ assignOpen: false });
        await fetchMembers(state.selectedId);
        message.success('分配成功');
      }} />
    </PageContainer>
  );
};

export default OrganizationPage;
