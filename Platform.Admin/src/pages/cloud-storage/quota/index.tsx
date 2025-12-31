import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Grid, Button, Tag, Space, Modal, Drawer, Row, Col, Card, Form, Input, Select, Descriptions, Spin, Progress, InputNumber, Switch, Alert, Statistic, Tabs, Popconfirm } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import dayjs from 'dayjs';
import { PieChartOutlined, EditOutlined, ReloadOutlined, UserOutlined, CloudOutlined, WarningOutlined, CheckCircleOutlined, BarChartOutlined, TeamOutlined, FileOutlined, CalendarOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getQuotaList, getUserQuota, updateUserQuota, getQuotaWarnings, getQuotaUsageStats, setUserQuota, deleteUserQuota, type StorageQuota, type UpdateQuotaRequest, type QuotaListRequest, type QuotaUsageStats, type QuotaWarning } from '@/services/cloud-storage/quotaApi';
import { getUserList, type AppUser } from '@/services/user/api';
import { getCurrentCompany } from '@/services/company';

const { useBreakpoint } = Grid;
const { TabPane } = Tabs;

interface SearchParams {
    username?: string;
    isEnabled?: boolean;
}

const CloudStorageQuotaPage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const actionRef = useRef<ActionType | null>(null);

    const [activeTab, setActiveTab] = useState<'quota-list' | 'usage-stats' | 'warnings'>('quota-list');
    const [usageStats, setUsageStats] = useState<QuotaUsageStats | null>(null);
    const [quotaTotalCount, setQuotaTotalCount] = useState<number>(0);

    const [warnings, setWarnings] = useState<QuotaWarning[]>([]);

    const searchParamsRef = useRef<SearchParams>({});
    const [searchForm] = Form.useForm();

    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingQuota, setViewingQuota] = useState<StorageQuota | null>(null);
    const [editQuotaVisible, setEditQuotaVisible] = useState(false);
    const [editingQuota, setEditingQuota] = useState<StorageQuota | null>(null);

    const [editQuotaForm] = Form.useForm();

    const [addQuotaVisible, setAddQuotaVisible] = useState(false);
    const [addQuotaForm] = Form.useForm();
    const [userOptions, setUserOptions] = useState<AppUser[]>([]);
    const [userLoading, setUserLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [currentCompanyId, setCurrentCompanyId] = useState<string>();

    const loadCurrentCompany = useCallback(async () => {
        try {
            const res = await getCurrentCompany();
            if (res.success && res.data) {
                const id = (res.data as any).id || (res.data as any).companyId;
                if (id) setCurrentCompanyId(id);
            }
        } catch (err) {
            console.error('Failed to load current company:', err);
        }
    }, []);

    // 加载数据（按当前企业）
    const loadUsageStats = useCallback(async () => {
        try {
            const usageRes = await getQuotaUsageStats();
            if (usageRes.success && usageRes.data) {
                setUsageStats(usageRes.data);
                setQuotaTotalCount(usageRes.data.totalUsers ?? 0);
            } else {
                setUsageStats({
                    totalUsers: 0,
                    totalQuota: 0,
                    totalUsed: 0,
                    averageUsage: 0,
                    usageDistribution: [],
                    topUsers: [],
                });
            }
        } catch (err) {
            console.error('Failed to load usage stats:', err);
        }
    }, []);

    const loadWarnings = useCallback(async () => {
        try {
            const response = await getQuotaWarnings(currentCompanyId);
            if (response.success && response.data) {
                setWarnings(response.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load warnings:', err);
        }
    }, [currentCompanyId]);

    useEffect(() => {
        loadCurrentCompany();
    }, [loadCurrentCompany]);

    useEffect(() => {
        loadUsageStats();
        loadWarnings();
    }, [loadUsageStats, loadWarnings]);

    const handleRefresh = useCallback(() => {
        actionRef.current?.reload?.();
        if (activeTab === 'usage-stats') {
            loadUsageStats();
        } else if (activeTab === 'warnings') {
            loadWarnings();
        }
    }, [activeTab, loadUsageStats, loadWarnings]);

    const fetchData = useCallback(async (params: any) => {
        const { current = 1, pageSize = 20 } = params;

        const mergedParams = { ...searchParamsRef.current, ...params };

        try {
            const listRequest: QuotaListRequest = {
                username: mergedParams.username,
                isEnabled: mergedParams.isEnabled,
                page: current,
                pageSize,
                sortBy: 'usedQuota',
                sortOrder: 'desc',
                companyId: currentCompanyId,
            };

            const response = await getQuotaList(listRequest);

            if (response.success && response.data) {
                const rawData = response.data.data || [];
                const totalCount = response.data.total || 0;

                setQuotaTotalCount(totalCount);

                const transformedData = rawData.map((item: any) => {
                    const displayName = item.displayName || item.userDisplayName;
                    const userDisplayName = displayName || item.username || item.userId || '未知用户';
                    return {
                        ...item,
                        id: item.id || item.userId,
                        userDisplayName,
                        displayName: userDisplayName,
                        username: item.username || item.userId || '-',
                        usedQuota: item.usedQuota !== undefined ? item.usedQuota : (item.usedSpace || 0),
                        usagePercentage: item.usagePercentage !== undefined
                            ? parseFloat((item.usagePercentage).toFixed(2))
                            : (item.totalQuota > 0 ? parseFloat(((item.usedSpace || 0) / item.totalQuota * 100).toFixed(2)) : 0),
                        warningThreshold: item.warningThreshold !== undefined ? item.warningThreshold : 80,
                        isEnabled: item.isEnabled !== undefined ? item.isEnabled : (item.status === 'Active'),
                    } as StorageQuota;
                });

                return {
                    data: transformedData,
                    total: totalCount,
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
    }, [currentCompanyId]);

    // 搜索处理
    const handleSearch = useCallback((values: any) => {
        // 同时更新 state 和 ref
        searchParamsRef.current = values;

        // 重新加载数据
        if (actionRef.current?.reloadAndReset) {
            actionRef.current?.reloadAndReset?.();
        } else if (actionRef.current?.reload) {
            actionRef.current?.reload?.();
        }
    }, []);

    const handleReset = useCallback(() => {
        searchForm.resetFields();
        // 同时更新 state 和 ref
        searchParamsRef.current = {};

        if (actionRef.current?.reloadAndReset) {
            actionRef.current?.reloadAndReset?.();
        } else if (actionRef.current?.reload) {
            actionRef.current?.reload?.();
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

    const loadUserOptions = useCallback(async (keyword?: string) => {
        setUserLoading(true);
        try {
            const res = await getUserList({
                page: 1,
                pageSize: 50,
                search: keyword,
            });
            if (res.success && res.data) {
                setUserOptions(res.data.users || []);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setUserLoading(false);
        }
    }, []);

    useEffect(() => {
        if (addQuotaVisible) {
            loadUserOptions();
        }
    }, [addQuotaVisible, loadUserOptions]);

    const handleAddSubmit = useCallback(async (values: any) => {
        if (!values.userId) {
            error('请选择用户');
            return;
        }

        setSubmitLoading(true);
        try {
            await setUserQuota({
                userId: values.userId,
                totalQuota: gbToBytes(values.totalQuota) ?? 0,
                warningThreshold: values.warningThreshold,
                isEnabled: values.isEnabled,
            });
            success('新增配额成功');
            setAddQuotaVisible(false);
            addQuotaForm.resetFields();
            actionRef.current?.reload?.();
            loadUsageStats();
        } catch (err) {
            error('新增配额失败');
        } finally {
            setSubmitLoading(false);
        }
    }, [addQuotaForm, error, gbToBytes, loadUsageStats, success]);

    const handleDelete = useCallback(async (quota: StorageQuota) => {
        setDeletingId(quota.userId);
        try {
            await deleteUserQuota(quota.userId);
            success('已删除配额并恢复默认值');
            actionRef.current?.reload?.();
            loadUsageStats();
        } catch (err) {
            error('删除配额失败');
        } finally {
            setDeletingId(null);
        }
    }, [error, loadUsageStats, success]);

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
            actionRef.current?.reload?.();
            loadUsageStats();
        } catch (err) {
            error('更新配额失败');
        }
    }, [editingQuota, success, error, editQuotaForm, loadUsageStats, gbToBytes]);

    // 批量设置配额

    // 格式化文件大小
    const formatFileSize = useCallback((bytes: number) => {
        if (!bytes || Number.isNaN(bytes)) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex += 1;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
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

    // 平均使用率（基于总使用量/总配额）
    const getAverageUsagePercent = useCallback((stats?: QuotaUsageStats | null) => {
        if (!stats) return 0;
        const { totalUsed = 0, totalQuota = 0 } = stats;
        if (totalQuota <= 0) return 0;
        return Number(((totalUsed / totalQuota) * 100).toFixed(2));
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
            render: (quota: number) => formatFileSize(quota),
        },
        {
            title: '已用',
            dataIndex: 'usedQuota',
            key: 'usedQuota',
            render: (used: number) => formatFileSize(used),
        },
        {
            title: '使用率',
            key: 'usagePercentage',
            render: (_: any, record: StorageQuota) => {
                // 避免除以零
                const percentage = record.totalQuota > 0
                    ? parseFloat(((record.usedQuota / record.totalQuota) * 100).toFixed(2))
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
        },
        {
            title: '状态',
            key: 'status',
            render: (_: any, record: StorageQuota) => getStatusTag(record),
        },
        {
            title: '更新时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            render: (_: any, record: StorageQuota) => (
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
                        title="删除配额"
                        description={<span>删除后该用户将恢复默认配额，确认删除？</span>}
                        okText="删除"
                        okButtonProps={{ danger: true }}
                        cancelText="取消"
                        icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                        onConfirm={() => handleDelete(record)}
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingId === record.userId}
                        >
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
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setAddQuotaVisible(true)}
                    >
                        新增配额
                    </Button>
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
                            tableLayout="auto"
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
                                            value={usageStats.totalUsers ?? quotaTotalCount}
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
                                            value={getAverageUsagePercent(usageStats)}
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
                                        {(usageStats.topUsers ?? []).map((user, index) => (
                                            <div key={user.userId || `${user.username}-${index}`} style={{ marginBottom: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>
                                                        #{index + 1}{' '}
                                                        {user.userDisplayName || user.username || user.userId || '未知用户'}
                                                        {user.username && user.username !== user.userDisplayName
                                                            ? ` (${user.username})`
                                                            : ''}
                                                    </span>
                                                    <span>{formatFileSize(user.usedQuota)} ({user.usagePercentage.toFixed(2)}%)</span>
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
                            formatter={(value) => `${value}`}
                        />
                    </Form.Item>
                    <Form.Item name="warningThreshold" label="警告阈值 (%)">
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

            {/* 新增配额弹窗 */}
            <Modal
                title="新增配额"
                open={addQuotaVisible}
                onCancel={() => {
                    setAddQuotaVisible(false);
                    addQuotaForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={addQuotaForm}
                    layout="vertical"
                    onFinish={handleAddSubmit}
                >
                    <Form.Item
                        name="userId"
                        label="选择用户"
                        rules={[{ required: true, message: '请选择用户' }]}
                    >
                        <Select
                            showSearch
                            placeholder="请选择用户"
                            loading={userLoading}
                            optionFilterProp="label"
                            onSearch={(value) => loadUserOptions(value)}
                            filterOption={false}
                            options={userOptions.map((user) => ({
                                label: user.name || user.username,
                                value: user.id,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="totalQuota"
                        label="总配额 (GB)"
                        rules={[{ required: true, message: '请输入总配额' }]}
                    >
                        <InputNumber
                            placeholder="请输入总配额（GB）"
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value) => `${value}`}
                        />
                    </Form.Item>
                    <Form.Item name="warningThreshold" label="警告阈值 (%)">
                        <InputNumber
                            placeholder="请输入警告阈值"
                            style={{ width: '100%' }}
                            min={0}
                            max={100}
                        />
                    </Form.Item>
                    <Form.Item name="isEnabled" label="启用状态" valuePropName="checked" initialValue={true}>
                        <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitLoading}>
                                保存
                            </Button>
                            <Button
                                onClick={() => {
                                    setAddQuotaVisible(false);
                                    addQuotaForm.resetFields();
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
