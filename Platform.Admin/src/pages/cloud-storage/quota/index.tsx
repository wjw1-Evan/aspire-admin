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
    Progress,
    InputNumber,
    Switch,
    Alert,
    Statistic,
    Popconfirm,
    Tabs,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
import { useModal } from '@/hooks/useModal';
import {
    PieChartOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    UserOutlined,
    CloudOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    BarChartOutlined,
    TeamOutlined,
    FileOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
const { TabPane } = Tabs;

import {
    getQuotaList,
    getUserQuota,
    updateUserQuota,
    deleteUserQuota,
    getQuotaUsageStats,
    getQuotaWarnings,
    refreshUserQuotaUsage,
    getQuotaRecommendations,
    type StorageQuota,
    type UpdateQuotaRequest,
    type QuotaListRequest,
    type QuotaUsageStats,
    type QuotaWarning,
} from '@/services/cloud-storage/quotaApi';

interface SearchParams {
    username?: string;
    isEnabled?: boolean;
}

const CloudStorageQuotaPage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const { confirm } = useModal();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // 表格引用
    const actionRef = useRef<ActionType>();

    // 状态管理
    const [activeTab, setActiveTab] = useState<'quota-list' | 'usage-stats' | 'warnings'>('quota-list');
    const [usageStats, setUsageStats] = useState<QuotaUsageStats | null>(null);
    const [warnings, setWarnings] = useState<QuotaWarning[]>([]);

    // 搜索相关状态
    const [searchParams, setSearchParams] = useState<SearchParams>({});
    const searchParamsRef = useRef<SearchParams>({});
    const [searchForm] = Form.useForm();

    // 弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingQuota, setViewingQuota] = useState<StorageQuota | null>(null);
    const [editQuotaVisible, setEditQuotaVisible] = useState(false);
    const [editingQuota, setEditingQuota] = useState<StorageQuota | null>(null);
    const [refreshing, setRefreshing] = useState<{ [key: string]: boolean }>({});

    // 表单
    const [editQuotaForm] = Form.useForm();

    // 加载数据
    const loadUsageStats = useCallback(async () => {
        try {
            const response = await getQuotaUsageStats();
            if (response.success && response.data) {
                setUsageStats(response.data);
            }
        } catch (err) {
            console.error('Failed to load usage stats:', err);
        }
    }, []);

    const loadWarnings = useCallback(async () => {
        try {
            const response = await getQuotaWarnings();
            if (response.success && response.data) {
                setWarnings(response.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load warnings:', err);
        }
    }, []);

    useEffect(() => {
        loadUsageStats();
        loadWarnings();
    }, [loadUsageStats, loadWarnings]);

    // 刷新处理
    const handleRefresh = useCallback(() => {
        actionRef.current?.reload();
        if (activeTab === 'usage-stats') {
            loadUsageStats();
        } else if (activeTab === 'warnings') {
            loadWarnings();
        }
    }, [activeTab, loadUsageStats, loadWarnings]);

    // 数据获取函数
    const fetchData = useCallback(async (params: any) => {
        const { current = 1, pageSize = 20 } = params;

        // 合并搜索参数，使用 ref 确保获取最新的搜索参数
        const mergedParams = { ...searchParamsRef.current, ...params };

        try {
            const listRequest: QuotaListRequest = {
                username: mergedParams.username,
                isEnabled: mergedParams.isEnabled,
                page: current,
                pageSize,
                sortBy: 'usedQuota',
                sortOrder: 'desc',
            };

            const response = await getQuotaList(listRequest);

            if (response.success && response.data) {
                // 转换后端数据格式到前端期望的格式
                const rawData = response.data.data || [];
                const totalCount = response.data.total || 0; // 使用后端返回的真实总数
                
                const transformedData = rawData.map((item: any) => {
                    // 处理用户显示名称：优先使用 displayName，如果 displayName 是用户ID格式，尝试使用 userDisplayName
                    let userDisplayName = item.userDisplayName || item.displayName;
                    // 如果 displayName 看起来像用户ID（24位十六进制），且与 username 相同，可能需要特殊处理
                    if (userDisplayName && userDisplayName === item.username && /^[0-9a-f]{24}$/i.test(userDisplayName)) {
                        // 如果都是用户ID格式，显示名称可以显示用户ID或者尝试获取真实用户名
                        // 这里先保持原样，后续可以通过用户服务获取真实用户名
                        userDisplayName = item.displayName || item.userDisplayName || item.username || '未知用户';
                    } else {
                        userDisplayName = item.userDisplayName || item.displayName || item.username || '未知用户';
                    }
                    
                    return {
                        ...item,
                        // 字段映射
                        id: item.id || item.userId, // 使用 userId 作为唯一 id
                        userDisplayName: userDisplayName,
                        username: item.username || item.userId || '-', // username 保持原值，如果为空则使用 userId
                        usedQuota: item.usedQuota !== undefined ? item.usedQuota : (item.usedSpace || 0),
                        // 确保有默认值
                        warningThreshold: item.warningThreshold !== undefined ? item.warningThreshold : 80,
                        isEnabled: item.isEnabled !== undefined ? item.isEnabled : (item.status === 'Active'),
                    };
                });
                
                return {
                    data: transformedData,
                    total: totalCount, // 使用后端返回的真实总数
                    success: true,
                };
            }

            return {
                data: [],
                total: 0,
                success: false,
            };
        } catch (err) {
            console.error('Failed to load quota list:', err);
            return {
                data: [],
                total: 0,
                success: false,
            };
        }
    }, []);

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
        setActiveTab(key as 'quota-list' | 'usage-stats' | 'warnings');
    }, []);

    // 配额操作
    const handleView = useCallback(async (quota: StorageQuota) => {
        try {
            const response = await getUserQuota(quota.userId);
            if (response.success && response.data) {
                // 转换后端数据格式到前端期望的格式
                // 后端返回的数据结构：{ userId, totalQuota, usedSpace, fileCount, lastCalculatedAt, ... }
                const quotaData = response.data as any;
                const transformedQuota: StorageQuota = {
                    ...quotaData,
                    id: quotaData.id || quotaData.userId,
                    // 使用列表中的用户信息，如果没有则使用 createdByUsername 或 userId
                    userDisplayName: quota.userDisplayName || quota.username || quotaData.createdByUsername || quotaData.userId || '未知用户',
                    username: quota.username || quotaData.createdByUsername || quotaData.userId || '-',
                    // 后端返回的是 usedSpace，映射为 usedQuota
                    usedQuota: quotaData.usedSpace !== undefined ? quotaData.usedSpace : (quotaData.usedQuota || 0),
                    // 后端返回的是 fileCount，确保正确映射
                    fileCount: quotaData.fileCount !== undefined ? quotaData.fileCount : (quota.fileCount || 0),
                    // 后端没有返回 warningThreshold，使用默认值 80
                    warningThreshold: quotaData.warningThreshold !== undefined ? quotaData.warningThreshold : 80,
                    // 后端没有返回 isEnabled，根据 isDeleted 判断，未删除则为启用
                    isEnabled: quotaData.isEnabled !== undefined ? quotaData.isEnabled : (!quotaData.isDeleted),
                };
                setViewingQuota(transformedQuota);
                setDetailVisible(true);
            }
        } catch (err) {
            error('获取配额详情失败');
        }
    }, [error]);

    const bytesToGB = useCallback((bytes?: number) => {
        if (bytes === undefined || bytes === null) return 0;
        return Number((bytes / (1024 ** 3)).toFixed(2));
    }, []);

    const gbToBytes = useCallback((gb?: number) => {
        if (gb === undefined || gb === null) return undefined;
        return Math.round(gb * 1024 * 1024 * 1024);
    }, []);

    const handleEdit = useCallback((quota: StorageQuota) => {
        setEditingQuota(quota);
        editQuotaForm.setFieldsValue({
            totalQuota: bytesToGB(quota.totalQuota),
            warningThreshold: quota.warningThreshold,
            isEnabled: quota.isEnabled,
        });
        setEditQuotaVisible(true);
    }, [editQuotaForm, bytesToGB]);

    const handleDelete = useCallback(async (quota: StorageQuota) => {
        try {
            await deleteUserQuota(quota.userId);
            success('删除配额成功');
            actionRef.current?.reload();
            loadUsageStats();
        } catch (err) {
            error('删除配额失败');
        }
    }, [success, error, loadUsageStats]);

    const handleRefreshUsage = useCallback(async (quota: StorageQuota) => {
        try {
            setRefreshing(prev => ({ ...prev, [quota.userId]: true }));
            await refreshUserQuotaUsage(quota.userId);
            success('刷新使用量成功');
            actionRef.current?.reload();
            setRefreshing(prev => ({ ...prev, [quota.userId]: false }));
        } catch (err) {
            error('刷新使用量失败');
            setRefreshing(prev => ({ ...prev, [quota.userId]: false }));
        }
    }, [success, error]);


    // 更新配额
    const handleEditSubmit = useCallback(async (values: UpdateQuotaRequest) => {
        if (!editingQuota) return;

        try {
            const payload: UpdateQuotaRequest = {
                ...values,
                totalQuota: values.totalQuota !== undefined ? gbToBytes(values.totalQuota) : undefined,
            };

            await updateUserQuota(editingQuota.userId, payload);
            success('更新配额成功');
            setEditQuotaVisible(false);
            setEditingQuota(null);
            editQuotaForm.resetFields();
            actionRef.current?.reload();
            loadUsageStats();
        } catch (err) {
            error('更新配额失败');
        }
    }, [editingQuota, success, error, editQuotaForm, loadUsageStats, gbToBytes]);

    // 批量设置配额

    // 格式化文件大小
    const formatFileSize = useCallback((bytes: number) => {
        if (!bytes) return '0 GB';
        return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
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

    // 获取使用率颜色
    const getUsageColor = useCallback((usagePercentage: number) => {
        if (usagePercentage >= 90) return '#ff4d4f';
        if (usagePercentage >= 80) return '#fa8c16';
        if (usagePercentage >= 60) return '#faad14';
        return '#52c41a';
    }, []);

    // 获取状态标签
    const getStatusTag = useCallback((quota: StorageQuota) => {
        if (!quota.isEnabled) {
            return <Tag color="default">已禁用</Tag>;
        }

        // 避免除以零
        if (!quota.totalQuota || quota.totalQuota === 0) {
            return <Tag color="green">正常</Tag>;
        }

        const usagePercentage = (quota.usedQuota / quota.totalQuota) * 100;
        const warningThreshold = quota.warningThreshold || 80;

        if (usagePercentage >= warningThreshold) {
            return <Tag color="red">超出警告线</Tag>;
        }

        return <Tag color="green">正常</Tag>;
    }, []);

    // 表格列定义
    const columns = [
        {
            title: '用户',
            dataIndex: 'userDisplayName',
            key: 'userDisplayName',
            width: 200,
            ellipsis: {
                showTitle: true, // 鼠标悬停时显示完整内容
            },
            render: (text: string, record: StorageQuota) => {
                // 显示完整的用户显示名称
                const displayText = text || record.username || record.userId || '未知用户';
                return (
                <Space>
                    <UserOutlined />
                    <a
                        onClick={() => handleView(record)}
                        style={{ cursor: 'pointer' }}
                        title={displayText} // 添加 title 属性以便悬停时查看完整内容
                    >
                            {displayText}
                    </a>
                </Space>
                );
            },
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            width: 180,
            ellipsis: {
                showTitle: true, // 鼠标悬停时显示完整内容
            },
            render: (text: string, record: StorageQuota) => {
                // 显示完整的用户名
                const displayText = text || record.userId || '-';
                return (
                    <span title={displayText}>
                        {displayText}
                    </span>
                );
            },
        },
        {
            title: '配额',
            dataIndex: 'totalQuota',
            key: 'totalQuota',
            width: 120,
            render: (quota: number) => formatFileSize(quota),
        },
        {
            title: '已用',
            dataIndex: 'usedQuota',
            key: 'usedQuota',
            width: 120,
            render: (used: number) => formatFileSize(used),
        },
        {
            title: '使用率',
            key: 'usagePercentage',
            width: 150,
            render: (_, record: StorageQuota) => {
                // 避免除以零
                const percentage = record.totalQuota > 0 
                    ? Math.round((record.usedQuota / record.totalQuota) * 100) 
                    : 0;
                return (
                    <Progress
                        percent={percentage}
                        size="small"
                        strokeColor={getUsageColor(percentage)}
                        format={(percent) => `${percent}%`}
                    />
                );
            },
        },
        {
            title: '文件数',
            dataIndex: 'fileCount',
            key: 'fileCount',
            width: 80,
        },
        {
            title: '状态',
            key: 'status',
            width: 100,
            render: (_, record: StorageQuota) => getStatusTag(record),
        },
        {
            title: '更新时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            width: 180,
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            width: 200,
            render: (_, record: StorageQuota) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确认删除"
                        description={`确定要删除用户 "${record.userDisplayName}" 的配额设置吗？`}
                        onConfirm={() => handleDelete(record)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <PageContainer
            title={
                <Space>
                    <PieChartOutlined />
                    {intl.formatMessage({ id: 'pages.cloud-storage.quota.title' })}
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
            {activeTab === 'quota-list' && (
                <Card style={{ marginBottom: 16 }}>
                    <Form
                        form={searchForm}
                        layout={isMobile ? 'vertical' : 'inline'}
                        onFinish={handleSearch}
                    >
                        <Form.Item name="username" label="用户名">
                            <Input
                                placeholder="搜索用户名"
                                style={isMobile ? { width: '100%' } : { width: 200 }}
                            />
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
            )}

            {/* 标签页 */}
            <Card>
                <Tabs activeKey={activeTab} onChange={handleTabChange}>
                    <TabPane tab="配额列表" key="quota-list">
                        <DataTable
                            actionRef={actionRef}
                            columns={columns}
                            request={fetchData}
                            rowKey={(record) => record.id || record.userId}
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

                    <TabPane tab="使用统计" key="usage-stats">
                        {usageStats && (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title="总用户数"
                                            value={usageStats.totalUsers}
                                            prefix={<TeamOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title="总配额"
                                            value={formatFileSize(usageStats.totalQuota)}
                                            prefix={<CloudOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title="总使用量"
                                            value={formatFileSize(usageStats.totalUsed)}
                                            prefix={<BarChartOutlined />}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Card>
                                        <Statistic
                                            title="平均使用率"
                                            value={usageStats.averageUsage}
                                            suffix="%"
                                            prefix={<PieChartOutlined />}
                                        />
                                    </Card>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Card title="使用量分布">
                                        {usageStats.usageDistribution.map((item, index) => (
                                            <div key={index} style={{ marginBottom: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{item.range}</span>
                                                    <span>{item.count} 用户 ({item.percentage}%)</span>
                                                </div>
                                                <Progress percent={item.percentage} showInfo={false} />
                                            </div>
                                        ))}
                                    </Card>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Card title="使用量排行">
                                        {usageStats.topUsers.map((user, index) => (
                                            <div key={user.userId} style={{ marginBottom: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>#{index + 1} {user.userDisplayName}</span>
                                                    <span>{formatFileSize(user.usedQuota)} ({user.usagePercentage}%)</span>
                                                </div>
                                                <Progress percent={user.usagePercentage} showInfo={false} />
                                            </div>
                                        ))}
                                    </Card>
                                </Col>
                            </Row>
                        )}
                    </TabPane>

                    <TabPane tab="配额警告" key="warnings">
                        {warnings.length > 0 ? (
                            <div>
                                {warnings.map((warning) => (
                                    <Alert
                                        key={warning.id}
                                        message={`用户 ${warning.userDisplayName} 存储使用量警告`}
                                        description={
                                            <div>
                                                <p>使用量：{formatFileSize(warning.usedQuota)} / {formatFileSize(warning.totalQuota)} ({warning.usagePercentage}%)</p>
                                                <p>警告类型：{warning.warningType === 'approaching' ? '接近配额' : '超出配额'}</p>
                                                <p>时间：{formatDateTime(warning.createdAt)}</p>
                                            </div>
                                        }
                                        type={warning.warningType === 'exceeded' ? 'error' : 'warning'}
                                        showIcon
                                        style={{ marginBottom: 16 }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                <div>暂无配额警告</div>
                            </div>
                        )}
                    </TabPane>
                </Tabs>
            </Card>

            {/* 配额详情抽屉 */}
            <Drawer
                title="配额详情"
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                width={isMobile ? '100%' : 600}
            >
                <Spin spinning={!viewingQuota}>
                    {viewingQuota ? (
                        <>
                            <Card title="基本信息" style={{ marginBottom: 16 }}>
                                <Descriptions column={isMobile ? 1 : 2} size="small">
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />用户</Space>}
                                        span={2}
                                    >
                                        {viewingQuota.userDisplayName && viewingQuota.userDisplayName !== viewingQuota.username
                                            ? `${viewingQuota.userDisplayName} (${viewingQuota.username})`
                                            : viewingQuota.userDisplayName || viewingQuota.username || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CloudOutlined />总配额</Space>}
                                    >
                                        {formatFileSize(viewingQuota.totalQuota)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><BarChartOutlined />已使用</Space>}
                                    >
                                        {formatFileSize(viewingQuota.usedQuota)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><PieChartOutlined />使用率</Space>}
                                    >
                                        <Progress
                                            percent={viewingQuota.totalQuota > 0 
                                                ? Math.round((viewingQuota.usedQuota / viewingQuota.totalQuota) * 100) 
                                                : 0}
                                            size="small"
                                            strokeColor={viewingQuota.totalQuota > 0 
                                                ? getUsageColor((viewingQuota.usedQuota / viewingQuota.totalQuota) * 100) 
                                                : '#52c41a'}
                                        />
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><FileOutlined />文件数量</Space>}
                                    >
                                        {viewingQuota.fileCount || 0}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><WarningOutlined />警告阈值</Space>}
                                    >
                                        {viewingQuota.warningThreshold || 80}%
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CheckCircleOutlined />启用状态</Space>}
                                    >
                                        {viewingQuota.isEnabled !== false ? '启用' : '禁用'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />最后计算时间</Space>}
                                    >
                                        {formatDateTime((viewingQuota as any).lastCalculatedAt || viewingQuota.updatedAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />创建时间</Space>}
                                    >
                                        {formatDateTime(viewingQuota.createdAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />更新时间</Space>}
                                    >
                                        {formatDateTime(viewingQuota.updatedAt)}
                                    </Descriptions.Item>
                                    {(viewingQuota as any).createdByUsername && (
                                        <Descriptions.Item
                                            label={<Space><UserOutlined />创建人</Space>}
                                        >
                                            {(viewingQuota as any).createdByUsername}
                                        </Descriptions.Item>
                                    )}
                                    {(viewingQuota as any).updatedByUsername && (
                                        <Descriptions.Item
                                            label={<Space><UserOutlined />更新人</Space>}
                                        >
                                            {(viewingQuota as any).updatedByUsername}
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Card>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            未加载数据
                        </div>
                    )}
                </Spin>
            </Drawer>

            {/* 编辑配额弹窗 */}
            <Modal
                title="编辑配额"
                open={editQuotaVisible}
                onCancel={() => {
                    setEditQuotaVisible(false);
                    setEditingQuota(null);
                    editQuotaForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={editQuotaForm}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                >
                    <Form.Item
                        name="totalQuota"
                        label="总配额 (GB)"
                        rules={[{ required: true, message: '请输入总配额' }]}
                    >
                        <InputNumber
                            placeholder="请输入总配额（GB）"
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value) =>
                                value !== undefined && value !== null && value !== ''
                                    ? `${value} GB`
                                    : ''
                            }
                            parser={(value) => {
                                const numeric = (value || '')
                                    .toString()
                                    // 去掉所有非数字和小数点/负号/空格/GB字样
                                    .replace(/[^0-9.-]/g, '')
                                    // 去掉开头多余的点
                                    .replace(/^\./, '');
                                return numeric ? Number(numeric) : undefined;
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="warningThreshold"
                        label="警告阈值 (%)"
                    >
                        <InputNumber
                            placeholder="请输入警告阈值"
                            style={{ width: '100%' }}
                            min={0}
                            max={100}
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
                                    setEditQuotaVisible(false);
                                    setEditingQuota(null);
                                    editQuotaForm.resetFields();
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

export default CloudStorageQuotaPage;