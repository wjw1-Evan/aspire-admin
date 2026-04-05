import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Empty,
    Input,
    InputNumber,
    Popconfirm,
    Row,
    Space,
    Spin,
    Tag,
    Tree,
    TreeSelect,
    Typography,
    theme,
} from 'antd';
import { Form, ProFormText, ModalForm } from '@ant-design/pro-form';
import useCommonStyles from '@/hooks/useCommonStyles';
import {
    ApartmentOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { TreeSelectProps } from 'antd/es/tree-select';
import { useMessage } from '@/hooks/useMessage';
import { formatDateTime } from '@/utils/format';
import { useModal } from '@/hooks/useModal';
import { ApiResponse } from '@/types/api-response';
import AssignUserModal from './components/AssignUserModal';

const { Text } = Typography;
const { Search } = Input;

interface OrganizationTreeNode {
    id?: string;
    name: string;
    code?: string;
    parentId?: string;
    description?: string;
    sortOrder?: number;
    managerUserId?: string;
    createdAt?: string;
    updatedAt?: string;
    children?: OrganizationTreeNode[];
}

interface CreateOrganizationUnitRequest {
    name: string;
    code?: string;
    parentId?: string;
    description?: string;
    sortOrder?: number;
    managerUserId?: string;
}

interface OrganizationReorderItem {
    id: string;
    parentId?: string;
    sortOrder: number;
}

interface OrganizationMemberItem {
    userId: string;
    username: string;
    email?: string;
    organizationUnitId: string;
    organizationUnitName?: string;
}

interface AssignUserOrganizationRequest {
    userId: string;
    organizationUnitId: string;
    isPrimary?: boolean;
}

const api = {
    tree: () => request<ApiResponse<OrganizationTreeNode[]>>('/api/organization/tree'),
    create: (data: CreateOrganizationUnitRequest) =>
        request<ApiResponse<OrganizationTreeNode>>('/api/organization', { method: 'POST', data }),
    update: (id: string, data: CreateOrganizationUnitRequest) =>
        request<ApiResponse<boolean>>(`/api/organization/${id}`, { method: 'PUT', data }),
    delete: (id: string) =>
        request<ApiResponse<boolean>>(`/api/organization/${id}`, { method: 'DELETE' }),
    reorder: (items: OrganizationReorderItem[]) =>
        request<ApiResponse<boolean>>('/api/organization/reorder', { method: 'POST', data: items }),
    members: (orgId: string) =>
        request<ApiResponse<OrganizationMemberItem[]>>(`/api/organization/${orgId}/members`),
    assignUser: (data: AssignUserOrganizationRequest) =>
        request<ApiResponse<boolean>>('/api/organization/assign-user', { method: 'POST', data }),
    removeUser: (data: { userId: string; organizationUnitId: string }) =>
        request<ApiResponse<boolean>>('/api/organization/remove-user', { method: 'POST', data }),
};

const buildTreeData = (nodes: OrganizationTreeNode[], searchValue: string): DataNode[] =>
    nodes.map((node) => {
        const name = node.name || '';
        const index = searchValue ? name.toLowerCase().indexOf(searchValue.toLowerCase()) : -1;
        const title = index > -1 ? (
            <span>
                {name.substring(0, index)}
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                    {name.substring(index, index + searchValue.length)}
                </span>
                {name.substring(index + searchValue.length)}
            </span>
        ) : (
            <span>{name}</span>
        );

        return {
            key: node.id || node.name,
            title,
            icon: <ApartmentOutlined />,
            children: node.children ? buildTreeData(node.children, searchValue) : undefined,
        };
    });

const filterTree = (nodes: OrganizationTreeNode[], searchValue: string): OrganizationTreeNode[] => {
    if (!searchValue) return nodes;
    return nodes
        .map((node) => {
            const match = node.name.toLowerCase().includes(searchValue.toLowerCase());
            if (match) {
                return node;
            }
            if (node.children?.length) {
                const filteredChildren = filterTree(node.children, searchValue);
                if (filteredChildren.length > 0) {
                    return { ...node, children: filteredChildren };
                }
            }
            return null;
        })
        .filter((node): node is OrganizationTreeNode => node !== null);
};

const flattenTree = (nodes: OrganizationTreeNode[]): Record<string, OrganizationTreeNode> => {
    const map: Record<string, OrganizationTreeNode> = {};
    const dfs = (list: OrganizationTreeNode[]) => {
        list.forEach((item) => {
            if (item.id) {
                map[item.id] = item;
            }
            if (item.children?.length) {
                dfs(item.children);
            }
        });
    };
    dfs(nodes);
    return map;
};

const collectDescendantIds = (node?: OrganizationTreeNode): Set<string> => {
    const ids = new Set<string>();
    const traverse = (current?: OrganizationTreeNode) => {
        if (!current?.children) return;
        current.children.forEach((child) => {
            if (child.id) {
                ids.add(child.id);
            }
            traverse(child);
        });
    };
    traverse(node);
    return ids;
};

const OrganizationPage: React.FC = () => {
    const intl = useIntl();
    const message = useMessage();
    const modal = useModal();
    const { styles } = useCommonStyles();
    const { token } = theme.useToken();

    const [state, setState] = useState({
        tree: [] as OrganizationTreeNode[],
        loading: false,
        searchValue: '',
        selectedId: undefined as string | undefined,
        formOpen: false,
        submitLoading: false,
        editingNode: null as OrganizationTreeNode | null,
        members: [] as OrganizationMemberItem[],
        assignOpen: false,
        createParentId: undefined as string | undefined,
    });
    const set = (partial: Partial<typeof state>) => setState((prev) => ({ ...prev, ...partial }));

    const selectedIdRef = useRef<string | undefined>(undefined);
    const selectedId = state.selectedId;
    const formOpen = state.formOpen;
    const editingNode = state.editingNode;
    const createParentId = state.createParentId;

    const nodeMap = useMemo(() => flattenTree(state.tree), [state.tree]);
    const selectedNode = useMemo(
        () => (selectedId ? nodeMap[selectedId] || null : null),
        [nodeMap, selectedId],
    );

    const filteredTree = useMemo(() => filterTree(state.tree, state.searchValue), [state.tree, state.searchValue]);
    const treeData = useMemo(() => buildTreeData(filteredTree, state.searchValue), [filteredTree, state.searchValue]);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    const refreshTree = useCallback(async () => {
        set({ loading: true });
        try {
            const res = await api.tree();
            if (res.success && res.data) {
                const newMap = flattenTree(res.data);
                set({ tree: res.data });

                if (res.data.length === 0) {
                    set({ selectedId: undefined });
                    return;
                }

                const currentSelectedId = selectedIdRef.current;
                if (currentSelectedId && newMap[currentSelectedId]) {
                    set({ selectedId: currentSelectedId });
                    return;
                }

                const firstId = res.data[0].id;
                set({ selectedId: firstId });
            }
        } finally {
            set({ loading: false });
        }
    }, []);

    useEffect(() => {
        refreshTree();
    }, [refreshTree]);

    const fetchMembers = useCallback(async (orgId?: string) => {
        if (!orgId) {
            set({ members: [] });
            return;
        }
        try {
            const res = await api.members(orgId);
            if (res.success && res.data) {
                set({ members: res.data });
            } else {
                set({ members: [] });
            }
        } catch {
            set({ members: [] });
        }
    }, []);

    useEffect(() => {
        fetchMembers(selectedId);
    }, [selectedId, fetchMembers]);

    const handleRemoveMember = async (userId: string) => {
        if (!selectedId) return;
        await api.removeUser({ userId, organizationUnitId: selectedId });
        message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
        await fetchMembers(selectedId);
    };

    const handleSelect: (keys: React.Key[]) => void = (keys) => {
        const key = keys[0];
        if (typeof key === 'string') {
            set({ selectedId: key });
        }
    };

    const openCreateModal = (parentId?: string) => {
        set({ editingNode: null, createParentId: parentId, formOpen: true });
    };

    const openEditModal = () => {
        if (!selectedNode) return;
        set({ editingNode: selectedNode, formOpen: true });
    };

    const handleDelete = () => {
        if (!selectedNode?.id) return;
        modal.confirm({
            title: intl.formatMessage({ id: 'pages.organization.modal.deleteTitle' }),
            content: intl.formatMessage({ id: 'pages.organization.modal.deleteContent' }),
            okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
            okType: 'danger',
            cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
            onOk: async () => {
                await api.delete(selectedNode.id!);
                message.success(
                    intl.formatMessage({ id: 'pages.organization.message.deleteSuccess' }),
                );
                set({ selectedId: undefined });
                await refreshTree();
            },
        });
    };

    const disabledIds = useMemo(() => collectDescendantIds(editingNode || undefined), [editingNode]);
    const treeSelectData: TreeSelectProps['treeData'] = useMemo(() => {
        const build = (nodes: OrganizationTreeNode[]): TreeSelectProps['treeData'] =>
            nodes.map((node) => ({
                title: node.name,
                value: node.id,
                key: node.id,
                disabled:
                    !!editingNode &&
                    !!node.id &&
                    (disabledIds.has(node.id) || node.id === editingNode.id),
                children: node.children ? build(node.children) : undefined,
            }));
        return build(state.tree);
    }, [state.tree, editingNode, disabledIds]);

    const buildParentChildrenMap = useCallback(() => {
        const map = new Map<string | undefined, string[]>();
        const dfs = (nodes: OrganizationTreeNode[], parentId?: string) => {
            nodes.forEach((n) => {
                const pid = parentId;
                const id = n.id!;
                if (!map.has(pid)) map.set(pid, []);
                map.get(pid)!.push(id);
                if (n.children?.length) dfs(n.children, id);
            });
        };
        dfs(state.tree);
        return map;
    }, [state.tree]);

    const handleDrop: (info: any) => Promise<void> = async (info) => {
        const dragId = String(info.dragNode?.key);
        const targetId = String(info.node?.key);
        const dropToGap: boolean = !!info.dropToGap;

        const dragNode = nodeMap[dragId];
        const targetNode = nodeMap[targetId];
        if (!dragNode || !targetNode) return;

        const newParentId = dropToGap ? targetNode.parentId : targetId;

        const dragDescendants = collectDescendantIds(dragNode);
        if (newParentId === dragId || (newParentId && dragDescendants.has(newParentId))) {
            message.error(intl.formatMessage({ id: 'pages.message.operationFailed' }));
            return;
        }

        const parentChildren = buildParentChildrenMap();
        const sourceParentId = dragNode.parentId;
        const sourceSiblings = parentChildren.get(sourceParentId) || [];
        const targetSiblings = parentChildren.get(newParentId) || [];

        const filteredSource = sourceSiblings.filter((id) => id !== dragId);

        let insertIndex = targetSiblings.length;
        if (dropToGap) {
            const idx = targetSiblings.indexOf(targetId);
            insertIndex = idx >= 0 ? idx + 1 : targetSiblings.length;
        }
        const newTarget = [...targetSiblings];
        const movingWithinSameParent = sourceParentId === newParentId;
        const baseTarget = movingWithinSameParent ? newTarget.filter((id) => id !== dragId) : newTarget;
        baseTarget.splice(insertIndex, 0, dragId);

        const items: OrganizationReorderItem[] = [];
        baseTarget.forEach((id, idx) => {
            items.push({ id, parentId: newParentId, sortOrder: idx + 1 });
        });
        if (!movingWithinSameParent) {
            filteredSource.forEach((id, idx) => {
                items.push({ id, parentId: sourceParentId, sortOrder: idx + 1 });
            });
        }

        try {
            await api.reorder(items);
            message.success(intl.formatMessage({ id: 'pages.organization.message.updateSuccess' }));
            await refreshTree();
            set({ selectedId: dragId });
        } catch (e) {
            message.error(intl.formatMessage({ id: 'pages.message.operationFailed' }));
        }
    };

    const initialValues = editingNode
        ? {
              name: editingNode.name,
              code: editingNode.code,
              parentId: editingNode.parentId,
              description: editingNode.description,
              sortOrder: editingNode.sortOrder ?? 1,
              managerUserId: editingNode.managerUserId,
          }
        : {
              parentId: createParentId,
              sortOrder: 1,
          };

    return (
        <PageContainer
            title={
                <Space>
                    <ApartmentOutlined />
                    {intl.formatMessage({ id: 'pages.organization.title' })}
                </Space>
            }
            extra={
                <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={refreshTree}>
                        {intl.formatMessage({ id: 'pages.common.refresh' })}
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openCreateModal()}
                    >
                        {intl.formatMessage({ id: 'pages.organization.action.createRoot' })}
                    </Button>
                </Space>
            }
        >
            <Row gutter={[12, 12]}>
                <Col xs={24} md={8} lg={7}>
                    <Card
                        title={intl.formatMessage({ id: 'pages.organization.tree.title' })}
                        className={styles.card}
                        styles={{ body: { padding: 12 } }}
                        style={{ height: '100%' }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <Search
                                placeholder={intl.formatMessage({ id: 'pages.organization.search.placeholder' })}
                                allowClear
                                onChange={(e) => set({ searchValue: e.target.value })}
                                onSearch={(value) => set({ searchValue: value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <Spin spinning={state.loading}>
                            {treeData.length > 0 ? (
                                <Tree
                                    blockNode
                                    showIcon
                                    defaultExpandAll
                                    draggable
                                    onDrop={handleDrop}
                                    selectedKeys={selectedId ? [selectedId] : []}
                                    onSelect={handleSelect}
                                    treeData={treeData}
                                />
                            ) : (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={intl.formatMessage({ id: 'pages.organization.tree.empty' })}
                                />
                            )}
                        </Spin>
                    </Card>
                </Col>
                <Col xs={24} md={16} lg={17}>
                    <Card
                        title={intl.formatMessage({ id: 'pages.organization.detail.title' })}
                        className={styles.card}
                        extra={
                            selectedNode ? (
                                <Space wrap>
                                    <Button
                                        type="default"
                                        icon={<PlusOutlined />}
                                        onClick={() => openCreateModal(selectedNode.id)}
                                    >
                                        {intl.formatMessage({ id: 'pages.organization.action.createChild' })}
                                    </Button>
                                    <Button icon={<EditOutlined />} onClick={openEditModal}>
                                        {intl.formatMessage({ id: 'pages.common.edit' })}
                                    </Button>
                                    <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                                        {intl.formatMessage({ id: 'pages.common.delete' })}
                                    </Button>
                                </Space>
                            ) : null
                        }
                        styles={{ body: { padding: 16, minHeight: 360 } }}
                    >
                        {selectedNode ? (
                            <>
                                <Descriptions column={2} bordered>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.name' })}
                                    >
                                        <Space>
                                            <ApartmentOutlined />
                                            <Text strong>{selectedNode.name}</Text>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.code' })}
                                    >
                                        {selectedNode.code ? <Tag color="blue">{selectedNode.code}</Tag> : '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.parent' })}
                                    >
                                        {selectedNode.parentId ? nodeMap[selectedNode.parentId]?.name || '-' : '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.sortOrder' })}
                                    >
                                        <Tag color="purple">{selectedNode.sortOrder ?? 1}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.manager' })}
                                    >
                                        {selectedNode.managerUserId ? (
                                            <Space>
                                                <UserOutlined />
                                                <Text>{selectedNode.managerUserId}</Text>
                                            </Space>
                                        ) : (
                                            '-'
                                        )}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.updatedAt' })}
                                    >
                                        {formatDateTime(selectedNode.updatedAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        span={2}
                                        label={intl.formatMessage({ id: 'pages.organization.field.description' })}
                                    >
                                        {selectedNode.description || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={intl.formatMessage({ id: 'pages.organization.field.createdAt' })}
                                    >
                                        {formatDateTime(selectedNode.createdAt)}
                                    </Descriptions.Item>
                                </Descriptions>
                                <Card
                                    className={styles.card}
                                    style={{ marginTop: 16 }}
                                    title={intl.formatMessage({ id: 'pages.organization.members.title' })}
                                    extra={
                                        <Button type="primary" onClick={() => set({ assignOpen: true })}>
                                            {intl.formatMessage({ id: 'pages.organization.members.add' })}
                                        </Button>
                                    }
                                >
                                    {state.members.length ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {state.members.map((m, index) => (
                                                <div
                                                    key={`${m.userId}-${index}`}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid #f0f0f0',
                                                    }}
                                                >
                                                    <Space>
                                                        <UserOutlined />
                                                        <Text strong>{m.username || m.userId}</Text>
                                                        {m.email ? <Tag color="geekblue">{m.email}</Tag> : null}
                                                        {m.organizationUnitName ? (
                                                            <Tag color="purple">{m.organizationUnitName}</Tag>
                                                        ) : null}
                                                    </Space>
                                                    <Button
                                                        type="link"
                                                        danger
                                                        size="small"
                                                        onClick={() => {
                                                            modal.confirm({
                                                                title: intl.formatMessage({ id: 'pages.modal.confirmDelete' }),
                                                                content: intl.formatMessage({ id: 'pages.modal.deleteContent' }, { name: m.username || m.userId }),
                                                                okText: intl.formatMessage({ id: 'pages.modal.okDelete' }),
                                                                okButtonProps: { danger: true },
                                                                cancelText: intl.formatMessage({ id: 'pages.modal.cancel' }),
                                                                onOk: () => handleRemoveMember(m.userId),
                                                            });
                                                        }}
                                                    >
                                                        {intl.formatMessage({ id: 'pages.common.delete' })}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={intl.formatMessage({ id: 'pages.table.unassigned' })}
                                        />
                                    )}
                                </Card>
                            </>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={intl.formatMessage({ id: 'pages.organization.detail.empty' })}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <ModalForm
                key={editingNode?.id || 'create'}
                title={intl.formatMessage({
                    id: editingNode
                        ? 'pages.organization.modal.updateTitle'
                        : 'pages.organization.modal.createTitle',
                })}
                open={formOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        set({ formOpen: false, editingNode: null });
                    }
                }}
                initialValues={initialValues}
                onFinish={async (values) => {
                    set({ submitLoading: true });
                    try {
                        if (editingNode?.id) {
                            await api.update(editingNode.id, values);
                            message.success(
                                intl.formatMessage({ id: 'pages.organization.message.updateSuccess' }),
                            );
                        } else {
                            const res = await api.create(values);
                            message.success(
                                intl.formatMessage({ id: 'pages.organization.message.createSuccess' }),
                            );
                            if (res.success && res.data?.id) {
                                set({ selectedId: res.data.id });
                            }
                        }
                        set({ formOpen: false, editingNode: null });
                        await refreshTree();
                        return true;
                    } finally {
                        set({ submitLoading: false });
                    }
                }}
                autoFocusFirstInput
                submitLoading={state.submitLoading}
            >
                <ProFormText
                    name="name"
                    label={intl.formatMessage({ id: 'pages.organization.field.name' })}
                    placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.name' })}
                    rules={[{ required: true }]}
                />
                <ProFormText
                    name="code"
                    label={intl.formatMessage({ id: 'pages.organization.field.code' })}
                    placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.code' })}
                />
                <Form.Item
                    name="parentId"
                    label={intl.formatMessage({ id: 'pages.organization.field.parent' })}
                >
                    <TreeSelect
                        allowClear
                        treeData={treeSelectData}
                        placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.parent' })}
                        treeDefaultExpandAll
                        showSearch
                        disabled={!state.tree.length && !editingNode}
                    />
                </Form.Item>
                <ProFormText
                    name="managerUserId"
                    label={intl.formatMessage({ id: 'pages.organization.field.manager' })}
                    placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.manager' })}
                />
                <Form.Item
                    name="sortOrder"
                    label={intl.formatMessage({ id: 'pages.organization.field.sortOrder' })}
                >
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <ProFormText
                    name="description"
                    label={intl.formatMessage({ id: 'pages.organization.field.description' })}
                    placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.description' })}
                />
            </ModalForm>

            <AssignUserModal
                open={state.assignOpen}
                organizationUnitId={selectedId}
                onCancel={() => set({ assignOpen: false })}
                onSubmit={async (values) => {
                    await api.assignUser(values);
                    set({ assignOpen: false });
                    await fetchMembers(selectedId);
                    message.success(intl.formatMessage({ id: 'pages.message.updateSuccess' }));
                }}
            />
        </PageContainer>
    );
};

export default OrganizationPage;
