import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { Table } from 'antd';
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
    DatePicker,
    Switch,
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
    DownloadOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
import { Grid } from 'antd';
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
import type { PageParams } from '@/types/page-params';


const CloudStorageSharedPage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const { confirm } = useModal();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const { styles } = useCommonStyles();

    // 状态管理
    const [activeTab, setActiveTab] = useState<'my-shares' | 'shared-with-me'>('my-shares');
    const [data, setData] = useState<FileShare[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<FileShare[]>([]);

    // 搜索相关状态
    const searchParamsRef = useRef<PageParams>({
        search: '',
    });

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

    const mapShareType = (type: any): 'internal' | 'external' => {
        if (typeof type === 'string') {
            const lower = type.toLowerCase();
            return lower === 'internal' ? 'internal' : 'external';
        }
        return type === 1 ? 'internal' : 'external';
    };

    const mapAccessType = (permission: any): 'view' | 'download' | 'edit' => {
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

    const fetchData = useCallback(async () => {
        const currentParams = searchParamsRef.current;

        setLoading(true);
        try {
            const { page = 1, pageSize = 20, sortBy, sortOrder } = currentParams;

            let response;

            if (activeTab === 'my-shares') {
                response = await getMyShares({
                    page: page,
                    pageSize,
                    search: currentParams.search,
                    sortBy,
                    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
                });
            } else {
                response = await getSharedWithMe({
                    page: page,
                    pageSize,
                    search: currentParams.search,
                    sortBy,
                    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
                });
            }

            if (response.success && response.data) {
                const transformed = (response.data.queryable || []).map(transformShare);

                const missingIds = transformed
                    .map((item: any) => item.fileId)
                    .filter((id: string) => id && !fileNameMap[id]);

                if (missingIds.length > 0) {
                    const uniqueIds = Array.from(new Set(missingIds));
                    const details = await Promise.all(uniqueIds.map(async (id: string) => {
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

                    const newMap: Record<string, string> = { ...fileNameMap };
                    details.forEach(d => {
                        if (d?.id) newMap[d.id] = d.name;
                    });
                    setFileNameMap(newMap);

                    transformed.forEach((item: any) => {
                        if (newMap[item.fileId]) {
                            item.fileName = newMap[item.fileId];
                        }
                    });
                } else {
                    transformed.forEach((item: any) => {
                        if (fileNameMap[item.fileId]) {
                            item.fileName = fileNameMap[item.fileId];
                        }
                    });
                }

                setData(transformed);
                setPagination(prev => ({
                    ...prev,
                    page: currentParams.page ?? prev.page,
                    pageSize: currentParams.pageSize ?? prev.pageSize,
                    total: response.data!.rowCount ?? 0,
                }));
            } else {
                setData([]);
                setPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch (err) {
            console.error('Failed to load shares:', err);
            setData([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [activeTab, fileNameMap]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 搜索处理
    const handleSearch = useCallback((params: PageParams) => {
        searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
        fetchData();
    }, [fetchData]);

    // 表格分页和排序处理
    const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
        const newPage = pag.current;
        const newPageSize = pag.pageSize;
        const sortBy = sorter?.field;
        const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
        
        searchParamsRef.current = {
            ...searchParamsRef.current,
            page: newPage,
            pageSize: newPageSize,
            sortBy,
            sortOrder,
        };
        fetchData();
    }, [fetchData]);

    // 刷新处理
    const handleRefresh = useCallback(() => {
        fetchData();
    }, [fetchData]);

    // Tab 切换
    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key as 'my-shares' | 'shared-with-me');
        setSelectedRowKeys([]);
        setSelectedRows([]);
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
            fetchData();
        } catch (err) {
            error('删除分享失败');
        }
    }, [success, error, fetchData]);

    const handleToggle = useCallback(async (share: FileShare) => {
        try {
            await toggleShare(share.id, !share.isEnabled);
            success(`${share.isEnabled ? '禁用' : '启用'}分享成功`);
            fetchData();
        } catch (err) {
            error(`${share.isEnabled ? '禁用' : '启用'}分享失败`);
        }
    }, [success, error, fetchData]);

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
            fetchData();
        } catch (err) {
            error('更新分享失败');
        }
    }, [editingShare, success, error, editShareForm, fetchData]);

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
            sorter: true,
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
            sorter: true,
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
            sorter: true,
            render: (type: string) => getAccessTypeTag(type),
        },
        {
            title: '状态',
            key: 'status',
            render: (_: any, record: FileShare) => getShareStatusTag(record),
        },
        {
            title: '访问次数',
            dataIndex: 'accessCount',
            key: 'accessCount',
            sorter: true,
        },
        {
            title: '下载次数',
            dataIndex: 'downloadCount',
            key: 'downloadCount',
            sorter: true,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            render: (_: any, record: FileShare) => (
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
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    confirm({
                                        title: '确认删除',
                                        content: `确定要删除分享 "${record.fileName}" 吗？`,
                                        onOk: () => handleDelete(record),
                                        okButtonProps: { danger: true },
                                    });
                                }}
                            >
                                删除
                            </Button>
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
            <SearchBar
                initialParams={searchParamsRef.current}
                onSearch={handleSearch}
                showResetButton={false}
                style={{ marginBottom: 16 }}
            />

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
                                <Table<FileShare>
                                    dataSource={data}
                                    columns={columns}
                                    rowKey="id"
                                    loading={loading}
                                    scroll={{ x: 'max-content' }}
                                    onChange={handleTableChange}
                                    pagination={{
                                        current: pagination.page,
                                        pageSize: pagination.pageSize,
                                        total: pagination.total,
                                    }}
                                />
                            )
                        },
                        {
                            key: 'shared-with-me',
                            label: '分享给我的',
                            children: (
                                <Table<FileShare>
                                    dataSource={data}
                                    columns={columns.filter(col => col.key !== 'action' || activeTab !== 'my-shares')}
                                    rowKey="id"
                                    loading={loading}
                                    scroll={{ x: 'max-content' }}
                                    onChange={handleTableChange}
                                    pagination={{
                                        current: pagination.page,
                                        pageSize: pagination.pageSize,
                                        total: pagination.total,
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
