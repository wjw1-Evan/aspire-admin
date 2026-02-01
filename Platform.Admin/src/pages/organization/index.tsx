import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@/components';
import { useIntl } from '@umijs/max';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Space,
    Spin,
    List,
    Tag,
    Tree,
    TreeSelect,
    Typography,
    theme,
} from 'antd';
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
import dayjs from 'dayjs';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import type {
    CreateOrganizationUnitRequest,
    OrganizationTreeNode,
    OrganizationReorderItem,
    OrganizationMemberItem,
} from '@/services/organization/api';
import {
    createOrganizationNode,
    deleteOrganizationNode,
    getOrganizationTree,
    updateOrganizationNode,
    reorderOrganization,
    getOrganizationMembers,
    assignUserToOrganization,
    removeUserFromOrganization,
} from '@/services/organization/api';
import AssignUserModal from './components/AssignUserModal';

const { Title, Text } = Typography;
const { Search } = Input;

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const date = dayjs(value);
    return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
};

/**
 * 构建树形数据，并根据搜索词高亮显示
 */
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

/**
 * 递归过滤树节点，保留匹配搜索词的节点及其父节点
 */
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
    const [tree, setTree] = useState<OrganizationTreeNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [selectedId, setSelectedId] = useState<string>();
    const selectedIdRef = useRef<string | undefined>(undefined);
    const [formOpen, setFormOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [editingNode, setEditingNode] = useState<OrganizationTreeNode | null>(null);
    const [members, setMembers] = useState<OrganizationMemberItem[]>([]);
    const [assignOpen, setAssignOpen] = useState(false);
    const [form] = Form.useForm<CreateOrganizationUnitRequest>();

    const nodeMap = useMemo(() => flattenTree(tree), [tree]);
    const selectedNode = useMemo(
        () => (selectedId ? nodeMap[selectedId] || null : null),
        [nodeMap, selectedId],
    );

    // 根据搜索词过滤后的树数据
    const filteredTree = useMemo(() => filterTree(tree, searchValue), [tree, searchValue]);
    const treeData = useMemo(() => buildTreeData(filteredTree, searchValue), [filteredTree, searchValue]);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    const refreshTree = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOrganizationTree();
            if (res.success && res.data) {
                const newMap = flattenTree(res.data);
                setTree(res.data);

                if (res.data.length === 0) {
                    setSelectedId(undefined);
                    return;
                }

                const currentSelectedId = selectedIdRef.current;
                if (currentSelectedId && newMap[currentSelectedId]) {
                    setSelectedId(currentSelectedId);
                    return;
                }

                const firstId = res.data[0].id;
                setSelectedId(firstId);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshTree();
    }, [refreshTree]);

    const fetchMembers = useCallback(async (orgId?: string) => {
        if (!orgId) {
            setMembers([]);
            return;
        }
        try {
            const res = await getOrganizationMembers(orgId);
            if (res.success && res.data) {
                setMembers(res.data);
            } else {
                setMembers([]);
            }
        } catch {
            setMembers([]);
        }
    }, []);

    useEffect(() => {
        fetchMembers(selectedId);
    }, [selectedId, fetchMembers]);

    const handleRemoveMember = async (userId: string) => {
        if (!selectedId) return;
        await removeUserFromOrganization({ userId, organizationUnitId: selectedId });
        message.success(intl.formatMessage({ id: 'pages.message.deleteSuccess' }));
        await fetchMembers(selectedId);
    };

    const handleSelect: (keys: React.Key[]) => void = (keys) => {
        const key = keys[0];
        if (typeof key === 'string') {
            setSelectedId(key);
        }
    };

    const openCreateModal = (parentId?: string) => {
        setEditingNode(null);
        form.resetFields();
        form.setFieldsValue({ parentId, sortOrder: 1 });
        setFormOpen(true);
    };

    const openEditModal = () => {
        if (!selectedNode) return;
        setEditingNode(selectedNode);
        form.resetFields();
        form.setFieldsValue({
            name: selectedNode.name,
            code: selectedNode.code,
            parentId: selectedNode.parentId,
            description: selectedNode.description,
            sortOrder: selectedNode.sortOrder ?? 1,
            managerUserId: selectedNode.managerUserId,
        });
        setFormOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitLoading(true);
            if (editingNode?.id) {
                await updateOrganizationNode(editingNode.id, values);
                message.success(
                    intl.formatMessage({ id: 'pages.organization.message.updateSuccess' }),
                );
            } else {
                const res = await createOrganizationNode(values);
                message.success(
                    intl.formatMessage({ id: 'pages.organization.message.createSuccess' }),
                );
                if (res.success && res.data?.id) {
                    setSelectedId(res.data.id);
                }
            }
            setFormOpen(false);
            setEditingNode(null);
            await refreshTree();
        } finally {
            setSubmitLoading(false);
        }
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
                await deleteOrganizationNode(selectedNode.id!);
                message.success(
                    intl.formatMessage({ id: 'pages.organization.message.deleteSuccess' }),
                );
                setSelectedId(undefined);
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
        return build(tree);
    }, [tree, editingNode, disabledIds]);

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
        dfs(tree);
        return map;
    }, [tree]);

    const handleDrop: (info: any) => Promise<void> = async (info) => {
        const dragId = String(info.dragNode?.key);
        const targetId = String(info.node?.key);
        const dropToGap: boolean = !!info.dropToGap;

        const dragNode = nodeMap[dragId];
        const targetNode = nodeMap[targetId];
        if (!dragNode || !targetNode) return;

        // Compute new parentId based on drop type
        const newParentId = dropToGap ? targetNode.parentId : targetId;

        // Prevent cycles: cannot set parent to self or descendant
        const dragDescendants = collectDescendantIds(dragNode);
        if (newParentId === dragId || (newParentId && dragDescendants.has(newParentId))) {
            message.error(intl.formatMessage({ id: 'pages.message.operationFailed' }));
            return;
        }

        const parentChildren = buildParentChildrenMap();
        const sourceParentId = dragNode.parentId;
        const sourceSiblings = parentChildren.get(sourceParentId) || [];
        const targetSiblings = parentChildren.get(newParentId) || [];

        // Remove drag from source siblings
        const filteredSource = sourceSiblings.filter((id) => id !== dragId);

        // Insert into target siblings at correct position
        let insertIndex = targetSiblings.length; // default append
        if (dropToGap) {
            const idx = targetSiblings.indexOf(targetId);
            insertIndex = idx >= 0 ? idx + 1 : targetSiblings.length;
        }
        const newTarget = [...targetSiblings];
        // If moving within same parent, ensure we consider the updated array without the dragId
        const movingWithinSameParent = sourceParentId === newParentId;
        const baseTarget = movingWithinSameParent ? newTarget.filter((id) => id !== dragId) : newTarget;
        baseTarget.splice(insertIndex, 0, dragId);

        // Build reorder payloads
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
            await reorderOrganization(items);
            message.success(intl.formatMessage({ id: 'pages.organization.message.updateSuccess' }));
            await refreshTree();
            setSelectedId(dragId);
        } catch (e) {
            message.error(intl.formatMessage({ id: 'pages.message.operationFailed' }));
        }
    };

    return (
        <PageContainer
            title={
                <Space>
                    <ApartmentOutlined />
                    {intl.formatMessage({ id: 'pages.organization.title' })}
                </Space>
            }
            style={{ paddingBlock: 12 }}
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
                                onChange={(e) => setSearchValue(e.target.value)}
                                onSearch={(value) => setSearchValue(value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <Spin spinning={loading}>
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
                                        <Button type="primary" onClick={() => setAssignOpen(true)}>
                                            {intl.formatMessage({ id: 'pages.organization.members.add' })}
                                        </Button>
                                    }
                                >
                                    {members.length ? (
                                        <List
                                            dataSource={members}
                                            renderItem={(m) => (
                                                <List.Item
                                                    actions={[
                                                        <Popconfirm
                                                            key="remove"
                                                            title={intl.formatMessage({ id: 'pages.modal.confirmDelete' })}
                                                            okText={intl.formatMessage({ id: 'pages.modal.okDelete' })}
                                                            cancelText={intl.formatMessage({ id: 'pages.modal.cancel' })}
                                                            onConfirm={() => handleRemoveMember(m.userId)}
                                                        >
                                                            <Button type="link" danger size="small">
                                                                {intl.formatMessage({ id: 'pages.common.delete' })}
                                                            </Button>
                                                        </Popconfirm>,
                                                    ]}
                                                >
                                                    <Space>
                                                        <UserOutlined />
                                                        <Text strong>{m.username || m.userId}</Text>
                                                        {m.email ? <Tag color="geekblue">{m.email}</Tag> : null}
                                                        {m.organizationUnitName ? (
                                                            <Tag color="purple">{m.organizationUnitName}</Tag>
                                                        ) : null}
                                                    </Space>
                                                </List.Item>
                                            )}
                                        />
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

            <Modal
                open={formOpen}
                title={intl.formatMessage({
                    id: editingNode
                        ? 'pages.organization.modal.updateTitle'
                        : 'pages.organization.modal.createTitle',
                })}
                destroyOnClose
                onCancel={() => {
                    setFormOpen(false);
                    setEditingNode(null);
                }}
                onOk={handleSubmit}
                confirmLoading={submitLoading}
            >
                <Form<CreateOrganizationUnitRequest> form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label={intl.formatMessage({ id: 'pages.organization.field.name' })}
                        rules={[{ required: true }]}
                    >
                        <Input placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.name' })} />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label={intl.formatMessage({ id: 'pages.organization.field.code' })}
                    >
                        <Input placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.code' })} />
                    </Form.Item>
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
                            disabled={!tree.length && !editingNode}
                        />
                    </Form.Item>
                    <Form.Item
                        name="managerUserId"
                        label={intl.formatMessage({ id: 'pages.organization.field.manager' })}
                    >
                        <Input placeholder={intl.formatMessage({ id: 'pages.organization.placeholder.manager' })} />
                    </Form.Item>
                    <Form.Item
                        name="sortOrder"
                        label={intl.formatMessage({ id: 'pages.organization.field.sortOrder' })}
                        initialValue={1}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label={intl.formatMessage({ id: 'pages.organization.field.description' })}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <AssignUserModal
                open={assignOpen}
                organizationUnitId={selectedId}
                onCancel={() => setAssignOpen(false)}
                onSubmit={async (values) => {
                    await assignUserToOrganization(values);
                    setAssignOpen(false);
                    await fetchMembers(selectedId);
                    message.success(intl.formatMessage({ id: 'pages.message.updateSuccess' }));
                }}
            />
        </PageContainer>
    );
};

export default OrganizationPage;
