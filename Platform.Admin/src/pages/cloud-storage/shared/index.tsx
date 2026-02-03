import React, { useRef, useState, useCallback } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchFormCard from '@/components/SearchFormCard';
import useCommonStyles from '@/hooks/useCommonStyles';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Grid } from 'antd';
import {
    Button,
    Tag,
    Space,
    Modal,
    Drawer,
    Row,
    Col,
    Card,
    Form,
    Input,
    Select,
    Descriptions,
    Spin,
    Tabs,
    Popconfirm,
    DatePicker,
    Switch,
    message,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
    ShareAltOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    EyeOutlined,
    CopyOutlined,
    LinkOutlined,
    LockOutlined,
    UnlockOutlined,
    CalendarOutlined,
    UserOutlined,
    FileOutlined,
    FolderOutlined,
    DownloadOutlined,
    SendOutlined,
    ClockCircleOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

import {
    getShareList,
    getShareDetail,
    updateShare,
    deleteShare,
    toggleShare,
    sendShareNotification,
    getMyShares,
    getSharedWithMe,
    type FileShare,
    type UpdateShareRequest,
    type ShareListRequest,
    type ShareNotificationRequest,
} from '@/services/cloud-storage/shareApi';
import { getFileDetail } from '@/services/cloud-storage';


interface SearchParams {
    shareType?: 'internal' | 'external';
    isEnabled?: boolean;
    keyword?: string;
}

const CloudStorageSharedPage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const { confirm } = useModal();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // 表格引用
    const actionRef = useRef<ActionType>();

    // 状态管理
    const [activeTab, setActiveTab] = useState<'my-shares' | 'shared-with-me'>('my-shares');
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<FileShare[]>([]);

    // 搜索相关状态
    const [searchParams, setSearchParams] = useState<SearchParams>({});
    const searchParamsRef = useRef<SearchParams>({});
    const [searchForm] = Form.useForm();
    const { styles } = useCommonStyles();

    // 弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingShare, setViewingShare] = useState<FileShare | null>(null);
    const [editShareVisible, setEditShareVisible] = useState(false);
    const [editingShare, setEditingShare] = useState<FileShare | null>(null);
    const [notifyVisible, setNotifyVisible] = useState(false);
    const [notifyingShare, setNotifyingShare] = useState<FileShare | null>(null);
    const [fileNameMap, setFileNameMap] = useState<Record<string, string>>({});

    // 表单
    const [editShareForm] = Form.useForm();
    const [notifyForm] = Form.useForm();

    // 刷新处理
    const handleRefresh = useCallback(() => {
        actionRef.current?.reload();
    }, []);

    const mapShareType = (type: any): 'internal' | 'external' => {
        if (typeof type === 'string') {
            const lower = type.toLowerCase();
            return lower === 'internal' ? 'internal' : 'external';
        }
        // 枚举：1 = Internal，其余视为外部/链接
        return type === 1 ? 'internal' : 'external';
    };

    const mapAccessType = (permission: any): 'view' | 'download' | 'edit' => {
        // 0=view,1=download,2=edit,3=full
        if (typeof permission === 'number') {
            if (permission === 1) return 'download';
            if (permission >= 2) return 'edit';
            return 'view';
        }
        const lower = typeof permission === 'string' ? permission.toLowerCase() : '';
        if (lower === 'download') return 'download';
        if (lower === 'edit' || lower === 'full') return 'edit';
        return 'view';
    };

    const transformShare = (item: any): FileShare => {
        const maxDownloads = item.settings?.maxDownloads ?? item.maxDownloads;
        return {
            id: item.id,
            fileId: item.fileItemId,
            fileName: item.fileName || item.fileItemName || item.fileItemId || '未知文件',
            shareToken: item.shareToken,
            shareType: mapShareType(item.type),
            accessType: mapAccessType(item.permission),
            password: item.password || '',
            expiresAt: item.expiresAt,
            maxDownloads: typeof maxDownloads === 'number' ? maxDownloads : undefined,
            downloadCount: item.downloadCount || item.accessCount || 0,
            accessCount: item.accessCount || 0,
            isEnabled: item.isActive !== undefined ? item.isActive : item.isEnabled,
            createdAt: item.createdAt,
            createdBy: item.createdBy,
            createdByName: item.createdByName || item.createdByUsername || '',
        } as FileShare;
    };

    const resolveFileName = useCallback(async (fileId?: string) => {
        if (!fileId) return undefined;
        if (fileNameMap[fileId]) return fileNameMap[fileId];
        try {
            const resp = await getFileDetail(fileId);
            if (resp.success && resp.data) {
                const name = resp.data.name || fileId;
                setFileNameMap(prev => ({ ...prev, [fileId]: name }));
                return name;
            }
        } catch (e) {
            // ignore
        }
        return fileId;
    }, [fileNameMap]);

    // 数据获取函数
    const fetchData = useCallback(async (params: any) => {
        const { current = 1, pageSize = 20 } = params;

        // 合并搜索参数，使用 ref 确保获取最新的搜索参数
        const mergedParams = { ...searchParamsRef.current, ...params };

        try {
            let response;

            if (activeTab === 'my-shares') {
                response = await getMyShares({
                    page: current,
                    pageSize,
                });
            } else {
                response = await getSharedWithMe({
                    page: current,
                    pageSize,
                });
            }

            if (response.success && response.data) {
                const list = response.data.list || response.data.data || [];
                const transformed = list.map(transformShare);

                // 补齐文件名（接口只返回 fileItemId）
                const missingIds = transformed
                    .map(item => item.fileId)
                    .filter(id => id && !fileNameMap[id]);

                if (missingIds.length > 0) {
                    const uniqueIds = Array.from(new Set(missingIds));
                    const details = await Promise.all(uniqueIds.map(async (id) => {
                        try {
                            const resp = await getFileDetail(id);
                            if (resp.success && resp.data) {
                                return { id, name: resp.data.name };
                            }
                        } catch (e) {
                            // ignore
                        }
                        return { id, name: id };
                    }));

                    const newMap = { ...fileNameMap };
                    details.forEach(d => {
                        if (d?.id) newMap[d.id] = d.name;
                    });
                    setFileNameMap(newMap);

                    transformed.forEach(item => {
                        if (newMap[item.fileId]) {
                            item.fileName = newMap[item.fileId];
                        }
                    });
                } else {
                    transformed.forEach(item => {
                        if (fileNameMap[item.fileId]) {
                            item.fileName = fileNameMap[item.fileId];
                        }
                    });
                }

                return {
                    data: transformed,
                    total: response.data.total || response.data.totalCount || list.length,
                    success: true,
                };
            }

            return {
                data: [],
                total: 0,
                success: false,
            };
        } catch (err) {
            console.error('Failed to load shares:', err);
            return {
                data: [],
                total: 0,
                success: false,
            };
        }
    }, [activeTab]);

    // 搜索处理
    const handleSearch = useCallback((values: any) => {
        // 同时更新 state 和 ref
        searchParamsRef.current = values;
        setSearchParams(values);

        // 重新加载数据
        if (actionRef.current?.reloadAndReset) {
            actionRef.current.reloadAndReset();
        } else if (actionRef.current?.reload) {
            actionRef.current.reload();
        }
    }, []);

    const handleReset = useCallback(() => {
        searchForm.resetFields();
        // 同时更新 state 和 ref
        searchParamsRef.current = {};
        setSearchParams({});

        if (actionRef.current?.reloadAndReset) {
            actionRef.current.reloadAndReset();
        } else if (actionRef.current?.reload) {
            actionRef.current.reload();
        }
    }, [searchForm]);

    // Tab 切换
    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key as 'my-shares' | 'shared-with-me');
        setSelectedRowKeys([]);
        setSelectedRows([]);
        actionRef.current?.reload();
    }, []);

    // 分享操作
    const handleView = useCallback(async (share: FileShare) => {
        try {
            const response = await getShareDetail(share.id);
            if (response.success && response.data) {
                const transformed = transformShare(response.data);
                const resolvedName = await resolveFileName(transformed.fileId);
                const finalShare = {
                    ...transformed,
                    fileName: resolvedName || transformed.fileName,
                } as FileShare;
                setViewingShare(finalShare);
                setDetailVisible(true);
            }
        } catch (err) {
            error('获取分享详情失败');
        }
    }, [error, resolveFileName]);

    const handleEdit = useCallback((share: FileShare) => {
        setEditingShare(share);
        editShareForm.setFieldsValue({
            accessType: share.accessType,
            password: share.password,
            expiresAt: share.expiresAt ? dayjs(share.expiresAt) : undefined,
            maxDownloads: share.maxDownloads,
            isEnabled: share.isEnabled,
        });
        setEditShareVisible(true);
    }, [editShareForm]);

    const handleDelete = useCallback(async (share: FileShare) => {
        try {
            await deleteShare(share.id);
            success('删除分享成功');
            actionRef.current?.reload();
        } catch (err) {
            error('删除分享失败');
        }
    }, [success, error]);

    const handleToggle = useCallback(async (share: FileShare) => {
        try {
            await toggleShare(share.id, !share.isEnabled);
            success(`${share.isEnabled ? '禁用' : '启用'}分享成功`);
            actionRef.current?.reload();
        } catch (err) {
            error(`${share.isEnabled ? '禁用' : '启用'}分享失败`);
        }
    }, [success, error]);

    const handleNotify = useCallback((share: FileShare) => {
        setNotifyingShare(share);
        setNotifyVisible(true);
    }, []);

    // 复制分享链接
    const handleCopyLink = useCallback(async (share: FileShare) => {
        const shareUrl = `${window.location.origin}/share/${share.shareToken}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            success('分享链接已复制到剪贴板');
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            success('分享链接已复制到剪贴板');
        }
    }, [success]);

    // 更新分享
    const handleEditSubmit = useCallback(async (values: UpdateShareRequest) => {
        if (!editingShare) return;

        try {
            const submitData = {
                ...values,
                expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined,
            };
            await updateShare(editingShare.id, submitData);
            success('更新分享成功');
            setEditShareVisible(false);
            setEditingShare(null);
            editShareForm.resetFields();
            actionRef.current?.reload();
        } catch (err) {
            error('更新分享失败');
        }
    }, [editingShare, success, error, editShareForm]);

    // 发送通知
    const handleNotifySubmit = useCallback(async (values: any) => {
        if (!notifyingShare) return;

        try {
            await sendShareNotification({
                shareId: notifyingShare.id,
                userIds: values.userIds,
                message: values.message,
            });
            success('发送通知成功');
            setNotifyVisible(false);
            setNotifyingShare(null);
            notifyForm.resetFields();
        } catch (err) {
            error('发送通知失败');
        }
    }, [notifyingShare, success, error, notifyForm]);

    // 格式化日期时间
    const formatDateTime = useCallback((dateTime: string | null | undefined): string => {
        if (!dateTime) return '-';
        try {
            const date = dayjs(dateTime);
            if (!date.isValid()) return dateTime;
            return date.format('YYYY-MM-DD HH:mm:ss');
        } catch (error) {
            console.error('日期格式化错误:', error, dateTime);
            return dateTime || '-';
        }
    }, []);

    // 获取分享状态标签
    const getShareStatusTag = useCallback((share: FileShare) => {
        if (!share.isEnabled) {
            return <Tag color="default">已禁用</Tag>;
        }

        if (share.expiresAt && dayjs(share.expiresAt).isBefore(dayjs())) {
            return <Tag color="red">已过期</Tag>;
        }

        if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
            return <Tag color="orange">下载已满</Tag>;
        }

        return <Tag color="green">有效</Tag>;
    }, []);

    // 获取访问类型标签
    const getAccessTypeTag = useCallback((accessType: string) => {
        const typeMap = {
            view: { color: 'blue', text: '查看' },
            download: { color: 'green', text: '下载' },
            edit: { color: 'orange', text: '编辑' },
        };
        const config = typeMap[accessType as keyof typeof typeMap] || { color: 'default', text: accessType };
        return <Tag color={config.color}>{config.text}</Tag>;
    }, []);

    // 表格列定义
    const columns = [
        {
            title: '文件名',
            dataIndex: 'fileName',
            key: 'fileName',
            render: (text: string, record: FileShare) => (
                <Space>
                    <FileOutlined />
                    <a
                        onClick={() => handleView(record)}
                        style={{ cursor: 'pointer' }}
                    >
                        {text}
                    </a>
                </Space>
            ),
        },
        {
            title: '分享类型',
            dataIndex: 'shareType',
            key: 'shareType',
            render: (type: string) => (
                <Tag color={type === 'internal' ? 'blue' : 'green'}>
                    {type === 'internal' ? '内部' : '外部'}
                </Tag>
            ),
        },
        {
            title: '访问权限',
            dataIndex: 'accessType',
            key: 'accessType',
            render: (type: string) => getAccessTypeTag(type),
        },
        {
            title: '状态',
            key: 'status',
            render: (_, record: FileShare) => getShareStatusTag(record),
        },
        {
            title: '访问次数',
            dataIndex: 'accessCount',
            key: 'accessCount',
        },
        {
            title: '下载次数',
            dataIndex: 'downloadCount',
            key: 'downloadCount',
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            render: (_, record: FileShare) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyLink(record)}
                    >
                        复制链接
                    </Button>
                    {activeTab === 'my-shares' && (
                        <>
                            <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(record)}
                            >
                                编辑
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                icon={record.isEnabled ? <LockOutlined /> : <UnlockOutlined />}
                                onClick={() => handleToggle(record)}
                            >
                                {record.isEnabled ? '禁用' : '启用'}
                            </Button>
                            <Popconfirm
                                title="确认删除"
                                description={`确定要删除分享 "${record.fileName}" 吗？`}
                                onConfirm={() => handleDelete(record)}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                                    删除
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <PageContainer
            title={
                <Space>
                    <ShareAltOutlined />
                    {intl.formatMessage({ id: 'pages.cloud-storage.shared.title' })}
                </Space>
            }
            style={{ paddingBlock: 12 }}
            extra={
                <Space wrap>
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                    >
                        {intl.formatMessage({ id: 'pages.button.refresh' })}
                    </Button>
                </Space>
            }
        >
            {/* 搜索表单 */}
            <SearchFormCard>
                <Form
                    form={searchForm}
                    layout={isMobile ? 'vertical' : 'inline'}
                    onFinish={handleSearch}
                >
                    <Form.Item name="shareType" label="分享类型">
                        <Select
                            placeholder="选择分享类型"
                            style={isMobile ? { width: '100%' } : { width: 120 }}
                            allowClear
                        >
                            <Select.Option value="internal">内部分享</Select.Option>
                            <Select.Option value="external">外部分享</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="isEnabled" label="状态">
                        <Select
                            placeholder="选择状态"
                            style={isMobile ? { width: '100%' } : { width: 100 }}
                            allowClear
                        >
                            <Select.Option value={true}>启用</Select.Option>
                            <Select.Option value={false}>禁用</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                style={isMobile ? { width: '100%' } : {}}
                            >
                                搜索
                            </Button>
                            <Button
                                onClick={handleReset}
                                style={isMobile ? { width: '100%' } : {}}
                            >
                                重置
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </SearchFormCard>

            {/* 标签页 */}
            <Card className={styles.card}>
                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    items={[
                        {
                            key: 'my-shares',
                            label: '我的分享',
                            children: (
                                <DataTable
                                    actionRef={actionRef}
                                    columns={columns}
                                    request={fetchData}
                                    rowKey="id"
                                    search={false}
                                    scroll={{ x: 'max-content' }}
                                    pagination={{
                                        pageSize: 20,
                                        pageSizeOptions: [10, 20, 50, 100],
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                    }}
                                />
                            )
                        },
                        {
                            key: 'shared-with-me',
                            label: '分享给我的',
                            children: (
                                <DataTable
                                    actionRef={actionRef}
                                    columns={columns.filter(col => col.key !== 'action' || activeTab !== 'my-shares')}
                                    request={fetchData}
                                    rowKey="id"
                                    search={false}
                                    scroll={{ x: 'max-content' }}
                                    pagination={{
                                        pageSize: 20,
                                        pageSizeOptions: [10, 20, 50, 100],
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                    }}
                                />
                            )
                        }
                    ]}
                />
            </Card>

            {/* 分享详情抽屉 */}
            <Drawer
                title="分享详情"
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                size={isMobile ? 'default' : 'large'}
            >
                <Spin spinning={!viewingShare}>
                    {viewingShare ? (
                        <>
                            <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
                                <Descriptions column={isMobile ? 1 : 2} size="small">
                                    <Descriptions.Item
                                        label={<Space><FileOutlined />文件名</Space>}
                                        span={2}
                                    >
                                        {viewingShare.fileName}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><ShareAltOutlined />分享类型</Space>}
                                    >
                                        <Tag color={viewingShare.shareType === 'internal' ? 'blue' : 'green'}>
                                            {viewingShare.shareType === 'internal' ? '内部分享' : '外部分享'}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />访问权限</Space>}
                                    >
                                        {getAccessTypeTag(viewingShare.accessType)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><LinkOutlined />分享链接</Space>}
                                        span={2}
                                    >
                                        <Space>
                                            <code>{`${window.location.origin}/share/${viewingShare.shareToken}`}</code>
                                            <Button
                                                type="link"
                                                size="small"
                                                icon={<CopyOutlined />}
                                                onClick={() => handleCopyLink(viewingShare)}
                                            >
                                                复制
                                            </Button>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />创建时间</Space>}
                                    >
                                        {formatDateTime(viewingShare.createdAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />创建者</Space>}
                                    >
                                        {viewingShare.createdByName}
                                    </Descriptions.Item>
                                    {viewingShare.expiresAt && (
                                        <Descriptions.Item
                                            label={<Space><ClockCircleOutlined />过期时间</Space>}
                                        >
                                            {formatDateTime(viewingShare.expiresAt)}
                                        </Descriptions.Item>
                                    )}
                                    {viewingShare.maxDownloads && (
                                        <Descriptions.Item
                                            label={<Space><DownloadOutlined />下载限制</Space>}
                                        >
                                            {viewingShare.downloadCount} / {viewingShare.maxDownloads}
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Card>

                            <Card title="访问统计" className={styles.card} style={{ marginBottom: 16 }}>
                                <Row gutter={[12, 12]}>
                                    <Col span={12}>
                                        <StatCard
                                            title="访问次数"
                                            value={viewingShare.accessCount}
                                            icon={<EyeOutlined />}
                                            color="#1890ff"
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <StatCard
                                            title="下载次数"
                                            value={viewingShare.downloadCount}
                                            icon={<DownloadOutlined />}
                                            color="#52c41a"
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            未加载数据
                        </div>
                    )}
                </Spin>
            </Drawer>

            {/* 编辑分享弹窗 */}
            <Modal
                title="编辑分享"
                open={editShareVisible}
                onCancel={() => {
                    setEditShareVisible(false);
                    setEditingShare(null);
                    editShareForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={editShareForm}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                >
                    <Form.Item
                        name="accessType"
                        label="访问权限"
                        rules={[{ required: true, message: '请选择访问权限' }]}
                    >
                        <Select placeholder="请选择访问权限">
                            <Select.Option value="view">仅查看</Select.Option>
                            <Select.Option value="download">查看和下载</Select.Option>
                            <Select.Option value="edit">查看、下载和编辑</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="password" label="访问密码">
                        <Input.Password placeholder="设置访问密码（可选）" />
                    </Form.Item>
                    <Form.Item name="expiresAt" label="过期时间">
                        <DatePicker
                            showTime
                            placeholder="设置过期时间（可选）"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item name="maxDownloads" label="下载次数限制">
                        <Input
                            type="number"
                            placeholder="设置最大下载次数（可选）"
                            min={1}
                        />
                    </Form.Item>
                    <Form.Item name="isEnabled" label="启用状态" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                保存
                            </Button>
                            <Button
                                onClick={() => {
                                    setEditShareVisible(false);
                                    setEditingShare(null);
                                    editShareForm.resetFields();
                                }}
                            >
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default CloudStorageSharedPage;
