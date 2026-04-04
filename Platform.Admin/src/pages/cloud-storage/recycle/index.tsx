import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { Grid, Table } from 'antd';
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
    Popconfirm,
    DatePicker,
    Progress,
    Alert,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
    DeleteOutlined,
    ReloadOutlined,
    UndoOutlined,
    ClearOutlined,
    DownloadOutlined,
    FileOutlined,
    FolderOutlined,
    CalendarOutlined,
    UserOutlined,
    ClockCircleOutlined,
    CloudOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;

import {
    getRecycleList,
    getRecycleItemDetail,
    restoreItem,
    batchRestoreItems,
    permanentDeleteItem,
    batchPermanentDeleteItems,
    emptyRecycleBin,
    getRecycleStatistics,
    autoCleanupExpiredItems,
    previewRecycleItem,
    downloadRecycleItem,
    type RecycleItem,
    type RecycleListRequest,
    type RestoreItemRequest,
    type BatchRestoreRequest,
    type BatchPermanentDeleteRequest,
    type RecycleStatistics,
} from '@/services/cloud-storage/recycleApi';
import type { PageParams } from '@/types/page-params';

const CloudStorageRecyclePage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const { confirm } = useModal();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // 状态管理
    const [data, setData] = useState<RecycleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<RecycleItem[]>([]);
    const [statistics, setStatistics] = useState<RecycleStatistics | null>(null);

    // 搜索相关状态
    const searchParamsRef = useRef<PageParams>({
        search: '',
    });
    const [searchForm] = Form.useForm();
    const { styles } = useCommonStyles();

    // 弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingItem, setViewingItem] = useState<RecycleItem | null>(null);
    const [restoreVisible, setRestoreVisible] = useState(false);
    const [restoringItem, setRestoringItem] = useState<RecycleItem | null>(null);
    const [cleanupProgress, setCleanupProgress] = useState<number | null>(null);

    // 表单
    const [restoreForm] = Form.useForm();

    // 数据获取函数
    const fetchData = useCallback(async () => {
        const currentParams = searchParamsRef.current;

        setLoading(true);
        try {
            const listRequest: RecycleListRequest = {
                search: currentParams.search,
                page: currentParams.page,
                pageSize: currentParams.pageSize,
                sortBy: currentParams.sortBy,
                sortOrder: currentParams.sortOrder as 'asc' | 'desc' | undefined,
            };

            const response = await getRecycleList(listRequest);

            if (response.success && response.data) {
                const normalizedList = (response.data.queryable || []).map((item: RecycleItem) => ({
                    ...item,
                    isFolder: item.isFolder ?? (item.type === 'folder' || item.type === 'Folder' || item.type === 1),
                }));

                setData(normalizedList);
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
            console.error('Failed to load recycle items:', err);
            setData([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, []);

    // 加载统计数据
    const loadStatistics = useCallback(async () => {
        try {
            const response = await getRecycleStatistics();
            if (response.success && response.data) {
                setStatistics(response.data);
            }
        } catch (err) {
            console.error('Failed to load statistics:', err);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
        fetchData();
    }, [loadStatistics, fetchData]);

    // 刷新处理
    const handleRefresh = useCallback(() => {
        fetchData();
        loadStatistics();
    }, [fetchData, loadStatistics]);

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


    // 文件操作
    const handleView = useCallback(async (item: RecycleItem) => {
        try {
            const response = await getRecycleItemDetail(item.id);
            if (response.success && response.data) {
                setViewingItem(response.data);
                setDetailVisible(true);
            }
        } catch (err) {
            error('获取文件详情失败');
        }
    }, [error]);

    const handleDownload = useCallback(async (item: RecycleItem) => {
        try {
            await downloadRecycleItem(item.id, item.name);
            success('下载开始');
        } catch (err) {
            error('下载失败');
        }
    }, [success, error]);

    const handleRestore = useCallback((item: RecycleItem) => {
        setRestoringItem(item);
        restoreForm.setFieldsValue({
            newName: item.name,
        });
        setRestoreVisible(true);
    }, [restoreForm]);

    const handlePermanentDelete = useCallback(async (item: RecycleItem) => {
        try {
            await permanentDeleteItem(item.id);
            success('永久删除成功');
            fetchData();
            loadStatistics();
        } catch (err) {
            error('永久删除失败');
        }
    }, [success, error, fetchData, loadStatistics]);

    // 批量操作
    const handleBatchRestore = useCallback(async () => {
        if (selectedRowKeys.length === 0) {
            error('请选择要恢复的文件');
            return;
        }

        confirm({
            title: '确认恢复',
            content: `确定要恢复选中的 ${selectedRowKeys.length} 个文件吗？`,
            onOk: async () => {
                try {
                    await batchRestoreItems({ ids: selectedRowKeys });
                    success('批量恢复成功');
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    fetchData();
                    loadStatistics();
                } catch (err) {
                    error('批量恢复失败');
                }
            },
        });
    }, [selectedRowKeys, confirm, success, error, fetchData, loadStatistics]);

    const handleBatchPermanentDelete = useCallback(async () => {
        if (selectedRowKeys.length === 0) {
            error('请选择要永久删除的文件');
            return;
        }

        confirm({
            title: '确认永久删除',
            content: (
                <div>
                    <p>确定要永久删除选中的 {selectedRowKeys.length} 个文件吗？</p>
                    <Alert
                        message="警告：永久删除后无法恢复！"
                        type="warning"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                </div>
            ),
            onOk: async () => {
                try {
                    await batchPermanentDeleteItems({ ids: selectedRowKeys });
                    success('批量永久删除成功');
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    fetchData();
                    loadStatistics();
                } catch (err) {
                    error('批量永久删除失败');
                }
            },
        });
    }, [selectedRowKeys, confirm, success, error, fetchData, loadStatistics]);

    // 清空回收站
    const handleEmptyRecycleBin = useCallback(async () => {
        confirm({
            title: '确认清空回收站',
            content: (
                <div>
                    <p>确定要清空整个回收站吗？</p>
                    <Alert
                        message="警告：此操作将永久删除回收站中的所有文件，无法恢复！"
                        type="error"
                        showIcon
                        style={{ marginTop: 8 }}
                    />
                </div>
            ),
            onOk: async () => {
                try {
                    setCleanupProgress(0);
                    const response = await emptyRecycleBin();
                    if (response.success && response.data) {
                        success(`清空回收站成功，删除了 ${response.data.deletedCount} 个文件，释放了 ${formatFileSize(response.data.freedSpace)} 空间`);
                    }
                    setCleanupProgress(null);
                    fetchData();
                    loadStatistics();
                } catch (err) {
                    error('清空回收站失败');
                    setCleanupProgress(null);
                }
            },
        });
    }, [confirm, success, error, fetchData, loadStatistics]);

    // 自动清理过期文件
    const handleAutoCleanup = useCallback(async () => {
        confirm({
            title: '确认自动清理',
            content: '确定要清理所有过期的文件吗？过期文件将被永久删除。',
            onOk: async () => {
                try {
                    const response = await autoCleanupExpiredItems();
                    if (response.success && response.data) {
                        success(`自动清理完成，删除了 ${response.data.deletedCount} 个过期文件，释放了 ${formatFileSize(response.data.freedSpace)} 空间`);
                    }
                    fetchData();
                    loadStatistics();
                } catch (err) {
                    error('自动清理失败');
                }
            },
        });
    }, [confirm, success, error, fetchData, loadStatistics]);

    // 恢复文件
    const handleRestoreSubmit = useCallback(async (values: any) => {
        if (!restoringItem) return;

        try {
            const restoreRequest: RestoreItemRequest = {
                itemId: restoringItem.id,
                targetParentId: values.targetParentId,
                newName: values.newName !== restoringItem.name ? values.newName : undefined,
            };

            await restoreItem(restoreRequest);
            success('恢复成功');
            setRestoreVisible(false);
            setRestoringItem(null);
            restoreForm.resetFields();
            fetchData();
            loadStatistics();
        } catch (err) {
            error('恢复失败');
        }
    }, [restoringItem, success, error, restoreForm, fetchData, loadStatistics]);

    // 格式化文件大小
    const formatFileSize = useCallback((bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

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

    // 获取文件图标
    const getFileIcon = useCallback((item: RecycleItem) => {
        if (item.isFolder) {
            return <FolderOutlined style={{ color: '#1890ff' }} />;
        }

        const ext = item.extension?.toLowerCase();
        switch (ext) {
            case 'pdf':
                return <FileOutlined style={{ color: '#ff4d4f' }} />;
            case 'doc':
            case 'docx':
                return <FileOutlined style={{ color: '#1890ff' }} />;
            case 'xls':
            case 'xlsx':
                return <FileOutlined style={{ color: '#52c41a' }} />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <FileOutlined style={{ color: '#722ed1' }} />;
            default:
                return <FileOutlined />;
        }
    }, []);

    // 获取过期状态标签
    const getExpiryTag = useCallback((item: RecycleItem) => {
        if (item.daysUntilPermanentDelete <= 0) {
            return <Tag color="red">已过期</Tag>;
        } else if (item.daysUntilPermanentDelete <= 7) {
            return <Tag color="orange">即将过期 ({item.daysUntilPermanentDelete}天)</Tag>;
        } else {
            return <Tag color="green">{item.daysUntilPermanentDelete}天后过期</Tag>;
        }
    }, []);

    // 表格列定义
    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (text: string, record: RecycleItem) => (
                <Space>
                    {getFileIcon(record)}
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
            title: '原路径',
            dataIndex: 'originalPath',
            key: 'originalPath',
            sorter: true,
        },
        {
            title: '大小',
            dataIndex: 'size',
            key: 'size',
            sorter: true,
            render: (size: number, record: RecycleItem) =>
                record.isFolder ? '-' : formatFileSize(size),
        },
        {
            title: '删除时间',
            dataIndex: 'deletedAt',
            key: 'deletedAt',
            sorter: true,
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '删除者',
            dataIndex: 'deletedByName',
            key: 'deletedByName',
            sorter: true,
        },
        {
            title: '过期状态',
            key: 'expiry',
            render: (_: any, record: RecycleItem) => getExpiryTag(record),
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            render: (_: any, record: RecycleItem) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<UndoOutlined />}
                        onClick={() => handleRestore(record)}
                    >
                        恢复
                    </Button>
                    {!record.isFolder && (
                        <Button
                            type="link"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(record)}
                        >
                            下载
                        </Button>
                    )}
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            confirm({
                                title: '确认永久删除',
                                content: (
                                    <div>
                                        <p>确定要永久删除 "{record.name}" 吗？</p>
                                        <div className="ant-alert ant-alert-warning ant-alert-with-description">
                                            <div className="ant-alert-content">
                                                <div className="ant-alert-message">警告：永久删除后无法恢复！</div>
                                            </div>
                                        </div>
                                    </div>
                                ),
                                onOk: () => handlePermanentDelete(record),
                                okButtonProps: { danger: true },
                            });
                        }}
                    >
                        永久删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <PageContainer
            title={
                <Space>
                    <DeleteOutlined />
                    {intl.formatMessage({ id: 'pages.cloud-storage.recycle.title' })}
                </Space>
            }
            style={{ paddingBlock: 12 }}
            extra={
                <Space wrap>
                    {selectedRowKeys.length > 0 && (
                        <>
                            <Button
                                key="batch-restore"
                                icon={<UndoOutlined />}
                                onClick={handleBatchRestore}
                            >
                                {intl.formatMessage({ id: 'pages.cloud-storage.recycle.action.batchRestore' })} ({selectedRowKeys.length})
                            </Button>
                            <Button
                                key="batch-delete"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleBatchPermanentDelete}
                            >
                                {intl.formatMessage({ id: 'pages.cloud-storage.recycle.action.batchDelete' })} ({selectedRowKeys.length})
                            </Button>
                        </>
                    )}
                    <Button
                        key="auto-cleanup"
                        icon={<ClearOutlined />}
                        onClick={handleAutoCleanup}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.recycle.action.autoCleanup' })}
                    </Button>
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                    >
                        {intl.formatMessage({ id: 'pages.button.refresh' })}
                    </Button>
                    <Button
                        key="empty"
                        danger
                        type="primary"
                        icon={<ClearOutlined />}
                        onClick={() => {
                            confirm({
                                title: '确认清空回收站',
                                content: (
                                    <div>
                                        <p>确定要清空整个回收站吗？</p>
                                        <div style={{ color: '#ff4d4f' }}>警告：此操作将永久删除所有文件，无法恢复！</div>
                                    </div>
                                ),
                                onOk: handleEmptyRecycleBin,
                                okButtonProps: { danger: true },
                            });
                        }}
                    >
                        清空回收站
                    </Button>
                </Space>
            }
        >
            {/* 统计卡片区域 */}
            {statistics && (
                <Card className={styles.card} style={{ marginBottom: 16 }}>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <FileOutlined style={{ fontSize: 20, color: '#ff4d4f', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{statistics.totalItems}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>回收站项目</div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <CloudOutlined style={{ fontSize: 20, color: '#722ed1', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatFileSize(statistics.totalSize)}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>占用空间</div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <CalendarOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{statistics.oldestItem ? dayjs(statistics.oldestItem).fromNow() : '-'}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>最早删除</div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <WarningOutlined style={{ fontSize: 20, color: '#fa8c16', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{statistics.newestItem ? dayjs(statistics.newestItem).fromNow() : '-'}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>最近删除</div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* 搜索表单 */}
            <SearchBar
                initialParams={searchParamsRef.current}
                onSearch={handleSearch}
                showResetButton={false}
                style={{ marginBottom: 16 }}
            />

            {/* 清理进度 */}
            {cleanupProgress !== null && (
                <Card className={styles.card} style={{ marginBottom: 16 }}>
                    <Alert
                        message="正在清空回收站..."
                        description={
                            <Progress
                                percent={cleanupProgress}
                                status="active"
                                strokeColor="#1890ff"
                            />
                        }
                        type="info"
                        showIcon
                    />
                </Card>
            )}

            {/* 数据表格 */}
            <Table<RecycleItem>
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
                rowSelection={{
                    selectedRowKeys,
                    onChange: (keys, rows) => {
                        setSelectedRowKeys(keys as string[]);
                        setSelectedRows(rows);
                    },
                }}
            />

            {/* 文件详情抽屉 */}
            <Drawer
                title="文件详情"
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                size={isMobile ? 'large' : 600}
            >
                <Spin spinning={!viewingItem}>
                    {viewingItem ? (
                        <>
                            <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
                                <Descriptions column={isMobile ? 1 : 2} size="small">
                                    <Descriptions.Item
                                        label={<Space><FileOutlined />名称</Space>}
                                        span={2}
                                    >
                                        {viewingItem.name}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><FolderOutlined />原路径</Space>}
                                        span={2}
                                    >
                                        {viewingItem.originalPath}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CloudOutlined />大小</Space>}
                                    >
                                        {viewingItem.isFolder ? '-' : formatFileSize(viewingItem.size)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />删除时间</Space>}
                                    >
                                        {formatDateTime(viewingItem.deletedAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />删除者</Space>}
                                    >
                                        {viewingItem.deletedByName}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><ClockCircleOutlined />过期状态</Space>}
                                    >
                                        {getExpiryTag(viewingItem)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />创建时间</Space>}
                                    >
                                        {formatDateTime(viewingItem.createdAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />创建者</Space>}
                                    >
                                        {viewingItem.createdByName}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {viewingItem.description && (
                                <Card title="描述" style={{ marginBottom: 16 }}>
                                    <p>{viewingItem.description}</p>
                                </Card>
                            )}

                            {viewingItem.tags && viewingItem.tags.length > 0 && (
                                <Card title="标签" style={{ marginBottom: 16 }}>
                                    <Space wrap>
                                        {viewingItem.tags.map((tag, index) => (
                                            <Tag key={index}>{tag}</Tag>
                                        ))}
                                    </Space>
                                </Card>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            未加载数据
                        </div>
                    )}
                </Spin>
            </Drawer>

            {/* 恢复文件弹窗 */}
            <Modal
                title="恢复文件"
                open={restoreVisible}
                onCancel={() => {
                    setRestoreVisible(false);
                    setRestoringItem(null);
                    restoreForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={restoreForm}
                    layout="vertical"
                    onFinish={handleRestoreSubmit}
                >
                    <Form.Item
                        name="newName"
                        label="文件名"
                        rules={[
                            { required: true, message: '请输入文件名' },
                            { max: 100, message: '文件名不能超过100个字符' },
                        ]}
                    >
                        <Input placeholder="请输入文件名" />
                    </Form.Item>
                    <Form.Item name="targetParentId" label="恢复到">
                        <Select placeholder="选择恢复位置（默认为原位置）" allowClear>
                            {/* 这里可以加载文件夹列表 */}
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                恢复
                            </Button>
                            <Button
                                onClick={() => {
                                    setRestoreVisible(false);
                                    setRestoringItem(null);
                                    restoreForm.resetFields();
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

export default CloudStorageRecyclePage;