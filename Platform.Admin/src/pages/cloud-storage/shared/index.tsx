import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components';
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
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

import {
    getShareList,
    getShareDetail,
    createShare,
    updateShare,
    deleteShare,
    toggleShare,
    sendShareNotification,
    getMyShares,
    getSharedWithMe,
    type FileShare,
    type CreateShareRequest,
    type UpdateShareRequest,
    type ShareListRequest,
    type ShareNotificationRequest,
} from '@/services/cloud-storage/shareApi';

import {
    getFileList,
    type FileItem,
} from '@/services/cloud-storage/api';

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

    // 弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingShare, setViewingShare] = useState<FileShare | null>(null);
    const [createShareVisible, setCreateShareVisible] = useState(false);
    const [editShareVisible, setEditShareVisible] = useState(false);
    const [editingShare, setEditingShare] = useState<FileShare | null>(null);
    const [notifyVisible, setNotifyVisible] = useState(false);
    const [notifyingShare, setNotifyingShare] = useState<FileShare | null>(null);

    // 表单
    const [createShareForm] = Form.useForm();
    const [editShareForm] = Form.useForm();
    const [notifyForm] = Form.useForm();

    // 文件列表（用于创建分享时选择）
    const [fileList, setFileList] = useState<FileItem[]>([]);

    // 刷新处理
    const handleRefresh = useCallback(() => {
        actionRef.current?.reload();
    }, []);

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
                return {
                    data: response.data.data || [],
                    total: response.data.total || 0,
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
                setViewingShare(response.data);
                setDetailVisible(true);
            }
        } catch (err) {
            error('获取分享详情失败');
        }
    }, [error]);

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

    // 创建分享
    const handleCreateShare = useCallback(async (values: CreateShareRequest) => {
        try {
            const submitData = {
                ...values,
                expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined,
            };
            await createShare(submitData);
            success('创建分享成功');
            setCreateShareVisible(false);
            createShareForm.resetFields();
            actionRef.current?.reload();
        } catch (err) {
            error('创建分享失败');
        }
    }, [success, error, createShareForm]);

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
                    {activeTab === 'my-shares' && (
                        <Button
                            key="create-share"
                            type="primary"
                            icon={<ShareAltOutlined />}
                            onClick={() => setCreateShareVisible(true)}
                        >
                            创建分享
                        </Button>
                    )}
                </Space>
            }
        >
            {/* 搜索表单 */}
            <Card style={{ marginBottom: 16 }}>
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
            </Card>

            {/* 标签页 */}
            <Card>
                <Tabs activeKey={activeTab} onChange={handleTabChange}>
                    <TabPane tab="我的分享" key="my-shares">
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
                    </TabPane>
                    <TabPane tab="分享给我的" key="shared-with-me">
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
                    </TabPane>
                </Tabs>
            </Card>

            {/* 分享详情抽屉 */}
            <Drawer
                title="分享详情"
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                width={isMobile ? '100%' : 600}
            >
                <Spin spinning={!viewingShare}>
                    {viewingShare ? (
                        <>
                            <Card title="基本信息" style={{ marginBottom: 16 }}>
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

                            <Card title="访问统计" style={{ marginBottom: 16 }}>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                                                {viewingShare.accessCount}
                                            </div>
                                            <div style={{ color: '#666' }}>访问次数</div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                                                {viewingShare.downloadCount}
                                            </div>
                                            <div style={{ color: '#666' }}>下载次数</div>
                                        </div>
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

            {/* 创建分享弹窗 */}
            <Modal
                title="创建分享"
                open={createShareVisible}
                onCancel={() => {
                    setCreateShareVisible(false);
                    createShareForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={createShareForm}
                    layout="vertical"
                    onFinish={handleCreateShare}
                >
                    <Form.Item
                        name="fileId"
                        label="选择文件"
                        rules={[{ required: true, message: '请选择要分享的文件' }]}
                    >
                        <Select placeholder="请选择要分享的文件" showSearch>
                            {fileList.map(file => (
                                <Select.Option key={file.id} value={file.id}>
                                    <Space>
                                        {file.isFolder ? <FolderOutlined /> : <FileOutlined />}
                                        {file.name}
                                    </Space>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="shareType"
                        label="分享类型"
                        rules={[{ required: true, message: '请选择分享类型' }]}
                    >
                        <Select placeholder="请选择分享类型">
                            <Select.Option value="internal">内部分享</Select.Option>
                            <Select.Option value="external">外部分享</Select.Option>
                        </Select>
                    </Form.Item>
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
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                创建分享
                            </Button>
                            <Button
                                onClick={() => {
                                    setCreateShareVisible(false);
                                    createShareForm.resetFields();
                                }}
                            >
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

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
