import React, { useRef, useState, useCallback, useEffect } from 'react';
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
    EyeOutlined,
    DownloadOutlined,
    FileOutlined,
    FolderOutlined,
    CalendarOutlined,
    UserOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    CloudOutlined,
    WarningOutlined,
    HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

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

interface SearchParams {
    keyword?: string;
    fileType?: string;
    deletedBy?: string;
    startDate?: string;
    endDate?: string;
}

const CloudStorageRecyclePage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const { confirm } = useModal();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // 表格引用
    const actionRef = useRef<ActionType>();

    // 状态管理
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<RecycleItem[]>([]);
    const [statistics, setStatistics] = useState<RecycleStatistics | null>(null);

    // 搜索相关状态
    const [searchParams, setSearchParams] = useState<SearchParams>({});
    const searchParamsRef = useRef<SearchParams>({});
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
    }, [loadStatistics]);

    // 刷新处理
    const handleRefresh = useCallback(() => {
        actionRef.current?.reload();
        loadStatistics();
    }, [loadStatistics]);

    // 数据获取函数
    const fetchData = useCallback(async (params: any) => {
        const { current = 1, pageSize = 20 } = params;

        // 合并搜索参数，使用 ref 确保获取最新的搜索参数
        const mergedParams = { ...searchParamsRef.current, ...params };

        try {
            const listRequest: RecycleListRequest = {
                keyword: mergedParams.keyword,
                fileType: mergedParams.fileType,
                deletedBy: mergedParams.deletedBy,
                startDate: mergedParams.startDate,
                endDate: mergedParams.endDate,
                page: current,
                pageSize,
                sortBy: 'deletedAt',
                sortOrder: 'desc',
            };

            const response = await getRecycleList(listRequest);

            if (response.success && response.data) {
                const list = response.data.list || response.data.data || [];
                const normalizedList = (list || []).map((item: RecycleItem) => ({
                    ...item,
                    // 兼容后端未直接返回 isFolder 的情况
                    isFolder: item.isFolder ?? (item.type === 'folder' || item.type === 'Folder' || item.type === 1),
                }));

                return {
                    data: normalizedList,
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
            console.error('Failed to load recycle items:', err);
            return {
                data: [],
                total: 0,
                success: false,
            };
        }
    }, []);

    // 搜索处理
    const handleSearch = useCallback((values: any) => {
        // 处理日期范围
        if (values.dateRange && Array.isArray(values.dateRange) && values.dateRange.length === 2) {
            const [start, end] = values.dateRange;
            values.startDate = start ? dayjs(start).toISOString() : undefined;
            values.endDate = end ? dayjs(end).toISOString() : undefined;
            delete values.dateRange;
        }

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
            actionRef.current?.reload();
            loadStatistics();
        } catch (err) {
            error('永久删除失败');
        }
    }, [success, error, loadStatistics]);

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
                    actionRef.current?.reload();
                    loadStatistics();
                } catch (err) {
                    error('批量恢复失败');
                }
            },
        });
    }, [selectedRowKeys, confirm, success, error, loadStatistics]);

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
                    actionRef.current?.reload();
                    loadStatistics();
                } catch (err) {
                    error('批量永久删除失败');
                }
            },
        });
    }, [selectedRowKeys, confirm, success, error, loadStatistics]);

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
                    actionRef.current?.reload();
                    loadStatistics();
                } catch (err) {
                    error('清空回收站失败');
                    setCleanupProgress(null);
                }
            },
        });
    }, [confirm, success, error, loadStatistics]);

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
                    actionRef.current?.reload();
                    loadStatistics();
                } catch (err) {
                    error('自动清理失败');
                }
            },
        });
    }, [confirm, success, error, loadStatistics]);

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
            actionRef.current?.reload();
            loadStatistics();
        } catch (err) {
            error('恢复失败');
        }
    }, [restoringItem, success, error, restoreForm, loadStatistics]);

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
        },
        {
            title: '大小',
            dataIndex: 'size',
            key: 'size',
            render: (size: number, record: RecycleItem) =>
                record.isFolder ? '-' : formatFileSize(size),
        },
        {
            title: '删除时间',
            dataIndex: 'deletedAt',
            key: 'deletedAt',
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '删除者',
            dataIndex: 'deletedByName',
            key: 'deletedByName',
        },
        {
            title: '过期状态',
            key: 'expiry',
            render: (_, record: RecycleItem) => getExpiryTag(record),
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            render: (_, record: RecycleItem) => (
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
                                批量恢复 ({selectedRowKeys.length})
                            </Button>
                            <Button
                                key="batch-delete"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleBatchPermanentDelete}
                            >
                                批量永久删除 ({selectedRowKeys.length})
                            </Button>
                        </>
                    )}
                    <Button
                        key="auto-cleanup"
                        icon={<ClearOutlined />}
                        onClick={handleAutoCleanup}
                    >
                        自动清理
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
            <SearchFormCard>
                <Form
                    form={searchForm}
                    layout={isMobile ? 'vertical' : 'inline'}
                    onFinish={handleSearch}
                >
                    <Form.Item name="keyword" label="关键词">
                        <Input
                            placeholder="搜索文件名"
                            style={isMobile ? { width: '100%' } : { width: 200 }}
                        />
                    </Form.Item>
                    <Form.Item name="fileType" label="文件类型">
                        <Select
                            placeholder="选择文件类型"
                            style={isMobile ? { width: '100%' } : { width: 120 }}
                            allowClear
                        >
                            <Select.Option value="image">图片</Select.Option>
                            <Select.Option value="document">文档</Select.Option>
                            <Select.Option value="video">视频</Select.Option>
                            <Select.Option value="audio">音频</Select.Option>
                            <Select.Option value="archive">压缩包</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="dateRange" label="删除时间">
                        <RangePicker
                            style={isMobile ? { width: '100%' } : { width: 240 }}
                        />
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
                width={isMobile ? '100%' : 600}
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
            {statistics && (
                <Card style={{ marginBottom: 16, borderRadius: 12 }}>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title="回收站项目"
                                value={statistics.totalItems}
                                icon={<DeleteOutlined />}
                                color="#ff4d4f"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title="占用空间"
                                value={formatFileSize(statistics.totalSize)}
                                icon={<CloudOutlined />}
                                color="#1890ff"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title="最早删除"
                                value={statistics.oldestItem ? dayjs(statistics.oldestItem).fromNow() : '-'}
                                icon={<ClockCircleOutlined />}
                                color="#fa8c16"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title="最近删除"
                                value={statistics.newestItem ? dayjs(statistics.newestItem).fromNow() : '-'}
                                icon={<HistoryOutlined />}
                                color="#faad14"
                            />
                        </Col>
                    </Row>
                </Card>
            )}
        </PageContainer>
    );
};

export default CloudStorageRecyclePage;
