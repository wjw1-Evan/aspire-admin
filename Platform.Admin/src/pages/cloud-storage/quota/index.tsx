import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchFormCard from '@/components/SearchFormCard';
import useCommonStyles from '@/hooks/useCommonStyles';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { PieChartOutlined, EditOutlined, ReloadOutlined, UserOutlined, CloudOutlined, WarningOutlined, CheckCircleOutlined, BarChartOutlined, TeamOutlined, FileOutlined, CalendarOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, TableOutlined, DatabaseOutlined, CloudServerOutlined, LineChartOutlined } from '@ant-design/icons';
import { getQuotaList, getUserQuota, updateUserQuota, getQuotaWarnings, getQuotaUsageStats, setUserQuota, deleteUserQuota, type StorageQuota, type UpdateQuotaRequest, type QuotaListRequest, type QuotaUsageStats, type QuotaWarning } from '@/services/cloud-storage/quotaApi';
import { Grid, Button, Tag, Space, Modal, Drawer, Row, Col, Card, Form, Input, Select, Descriptions, Spin, Progress, InputNumber, Switch, Alert, Statistic, Tabs, Popconfirm, Typography, Badge, List, Avatar, Empty } from 'antd';
import { useMessage } from '@/hooks/useMessage';
import dayjs from 'dayjs';
import { getUserList, type AppUser } from '@/services/user/api';
import { getCurrentCompany } from '@/services/company';

const { useBreakpoint } = Grid;

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
    const { styles } = useCommonStyles();

    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingQuota, setViewingQuota] = useState<StorageQuota | null>(null);
    const [editQuotaVisible, setEditQuotaVisible] = useState(false);
    const [editingQuota, setEditingQuota] = useState<StorageQuota | null>(null);

    const [editQuotaForm] = Form.useForm();

    const tableRef = useRef<HTMLDivElement>(null);

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
            error(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.fetchFailed', defaultMessage: '获取配额详情失败' }));
        }
    }, [error, intl]);

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
            error(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' }));
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
            success(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.deleteSuccess' }));
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
            return <Tag color="default">{intl.formatMessage({ id: 'pages.table.deactivated' })}</Tag>;
        }

        // 避免除以零
        if (!quota.totalQuota || quota.totalQuota === 0) {
            return <Tag color="green">{intl.formatMessage({ id: 'pages.cloud-storage.quota.status.normal' })}</Tag>;
        }

        const usagePercentage = (quota.usedQuota / quota.totalQuota) * 100;
        const warningThreshold = quota.warningThreshold || 80;

        if (usagePercentage >= warningThreshold) {
            return <Tag color="red">{intl.formatMessage({ id: 'pages.cloud-storage.quota.status.warning' })}</Tag>;
        }

        return <Tag color="green">{intl.formatMessage({ id: 'pages.cloud-storage.quota.status.normal' })}</Tag>;
    }, [intl]);

    // 表格列定义
    const columns = [
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' }),
            dataIndex: 'userDisplayName',
            key: 'userDisplayName',
            render: (text: string, record: StorageQuota) => {
                // 显示完整的用户显示名称
                const displayText = text || record.username || record.userId || intl.formatMessage({ id: 'pages.table.unknown' });
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
            title: intl.formatMessage({ id: 'pages.table.username' }),
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
            title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuota' }),
            dataIndex: 'totalQuota',
            key: 'totalQuota',
            render: (quota: number) => formatFileSize(quota),
        },
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usedQuota' }),
            dataIndex: 'usedQuota',
            key: 'usedQuota',
            render: (used: number) => formatFileSize(used),
        },
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usagePercentage' }),
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
            title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.fileCount' }),
            dataIndex: 'fileCount',
            key: 'fileCount',
        },
        {
            title: intl.formatMessage({ id: 'pages.table.status' }),
            key: 'status',
            render: (_: any, record: StorageQuota) => getStatusTag(record),
        },
        {
            title: intl.formatMessage({ id: 'pages.table.updatedAt', defaultMessage: '更新时间' }),
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (time: string) => formatDateTime(time),
        },
        {
            title: intl.formatMessage({ id: 'pages.table.actions' }),
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
                        {intl.formatMessage({ id: 'pages.table.edit' })}
                    </Button>
                    <Popconfirm
                        title={intl.formatMessage({ id: 'pages.cloud-storage.quota.confirmDelete.title' })}
                        description={<span>{intl.formatMessage({ id: 'pages.cloud-storage.quota.confirmDelete.desc' })}</span>}
                        okText={intl.formatMessage({ id: 'pages.table.delete' })}
                        okButtonProps={{ danger: true }}
                        cancelText={intl.formatMessage({ id: 'pages.table.cancel' })}
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
                            {intl.formatMessage({ id: 'pages.table.delete' })}
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
            extra={
                <Space wrap>
                    <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingQuota(null);
                            setAddQuotaVisible(true);
                        }}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.quota.action.add' })}
                    </Button>
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            actionRef.current?.reload?.();
                            loadUsageStats();
                            loadWarnings();
                        }}
                    >
                        {intl.formatMessage({ id: 'pages.common.refresh', defaultMessage: '刷新' })}
                    </Button>
                </Space>
            }
        >
            {/* 搜索表单 */}
            {activeTab === 'quota-list' && (
                <SearchFormCard>
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
                </SearchFormCard>
            )}

            {/* 标签页 */}
            <Card className={styles.card}>
                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    items={[
                        {
                            key: 'list',
                            label: (
                                <Space>
                                    <TableOutlined />
                                    {intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.quotaList' })}
                                </Space>
                            ),
                            children: (
                                <div ref={tableRef}>
                                    <Form
                                        form={searchForm}
                                        layout={isMobile ? 'vertical' : 'inline'}
                                        onFinish={(values) => {
                                            actionRef.current?.reload?.();
                                        }}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Form.Item name="search" label={intl.formatMessage({ id: 'pages.userManagement.search.label' })}>
                                            <Input
                                                placeholder={intl.formatMessage({ id: 'pages.userManagement.search.placeholder' })}
                                                style={{ width: 200 }}
                                                allowClear
                                            />
                                        </Form.Item>
                                        <Form.Item name="isEnabled" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.isEnabled' })}>
                                            <Select
                                                placeholder={intl.formatMessage({ id: 'pages.userManagement.status.placeholder' })}
                                                style={{ width: 120 }}
                                                allowClear
                                            >
                                                <Select.Option value={true}>{intl.formatMessage({ id: 'pages.table.enable' })}</Select.Option>
                                                <Select.Option value={false}>{intl.formatMessage({ id: 'pages.table.disable' })}</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item>
                                            <Space>
                                                <Button type="primary" htmlType="submit">
                                                    {intl.formatMessage({ id: 'pages.button.search' })}
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        searchForm.resetFields();
                                                        actionRef.current?.reload?.();
                                                    }}
                                                >
                                                    {intl.formatMessage({ id: 'pages.button.reset' })}
                                                </Button>
                                            </Space>
                                        </Form.Item>
                                    </Form>

                                    <DataTable<StorageQuota>
                                        actionRef={actionRef}
                                        rowKey="userId"
                                        columns={columns}
                                        request={async (params, sort) => {
                                            const searchValues = searchForm.getFieldsValue();
                                            const res = await getQuotaList({
                                                current: params.current,
                                                pageSize: params.pageSize,
                                                ...searchValues,
                                                ...sort,
                                            });
                                            return {
                                                data: res.data?.data || [],
                                                success: res.success,
                                                total: res.data?.total || 0,
                                            };
                                        }}
                                        pagination={{
                                            pageSize: 10,
                                        }}
                                        search={false}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'stats',
                            label: (
                                <Space>
                                    <PieChartOutlined />
                                    {intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.usageStats' })}
                                </Space>
                            ),
                            children: usageStats ? (
                                <Space direction="vertical" style={{ width: '100%' }} size="large">
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} sm={12} md={6}>
                                            <StatCard
                                                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalUsers' })}
                                                value={usageStats.totalUsers}
                                                icon={<UserOutlined />}
                                                color="#1890ff"
                                            />
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <StatCard
                                                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalQuota' })}
                                                value={formatFileSize(usageStats.totalQuota)}
                                                icon={<DatabaseOutlined />}
                                                color="#52c41a"
                                            />
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <StatCard
                                                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalUsed' })}
                                                value={formatFileSize(usageStats.totalUsed)}
                                                icon={<CloudServerOutlined />}
                                                color="#faad14"
                                            />
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <StatCard
                                                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.averageUsage' })}
                                                value={`${usageStats.averageUsage.toFixed(1)}%`}
                                                icon={<LineChartOutlined />}
                                                color="#722ed1"
                                            />
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} lg={12}>
                                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.quota.usageDistribution.title' })} bordered={false}>
                                                <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {/* 简单的饼图展示，实际项目中可以使用 ECharts 或 G2 */}
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#1890ff' }}>
                                                            {usageStats.averageUsage.toFixed(1)}%
                                                        </div>
                                                        <Typography.Text type="secondary">
                                                            {intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.averageUsage' })}
                                                        </Typography.Text>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={24} lg={12}>
                                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.quota.usageRanking.title' })} bordered={false}>
                                                <div style={{ height: 350, overflowY: 'auto' }}>
                                                    {usageStats.topUsers.map((user, index) => (
                                                        <div key={user.userId} style={{ marginBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <Space>
                                                                    <Typography.Text strong>{index + 1}.</Typography.Text>
                                                                    <Typography.Text>{user.userDisplayName || user.username}</Typography.Text>
                                                                </Space>
                                                                <Typography.Text type="secondary">
                                                                    {formatFileSize(user.usedQuota)} / {formatFileSize(user.usedQuota / (user.usagePercentage / 100))}
                                                                </Typography.Text>
                                                            </div>
                                                            <Progress
                                                                percent={parseFloat(user.usagePercentage.toFixed(1))}
                                                                size="small"
                                                                status={user.usagePercentage > 90 ? 'exception' : 'active'}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </Card>
                                        </Col>
                                    </Row>
                                </Space>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <Spin />
                                </div>
                            ),
                        },
                        {
                            key: 'warnings',
                            label: (
                                <Space>
                                    <Badge count={warnings.length} size="small" offset={[10, 0]}>
                                        <WarningOutlined />
                                    </Badge>
                                    {intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.warnings' })}
                                </Space>
                            ),
                            children: (
                                <div style={{ minHeight: 400 }}>
                                    {warnings.length > 0 ? (
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={warnings}
                                            renderItem={(item) => (
                                                <List.Item
                                                    actions={[
                                                        <Button key="edit" type="link" onClick={() => handleEdit(item as any)}>
                                                            {intl.formatMessage({ id: 'pages.table.edit' })}
                                                        </Button>
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        avatar={
                                                            <Avatar
                                                                icon={<WarningOutlined />}
                                                                style={{ backgroundColor: item.warningType === 'exceeded' ? '#ff4d4f' : '#faad14' }}
                                                            />
                                                        }
                                                        title={
                                                            <Space>
                                                                {intl.formatMessage(
                                                                    { id: 'pages.cloud-storage.quota.warning.title' },
                                                                    { userDisplayName: item.userDisplayName || item.username }
                                                                )}
                                                                <Tag color={item.warningType === 'exceeded' ? 'error' : 'warning'}>
                                                                    {item.warningType === 'exceeded'
                                                                        ? intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.exceeded' })
                                                                        : intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.approaching' })}
                                                                </Tag>
                                                            </Space>
                                                        }
                                                        description={
                                                            <div>
                                                                <p>
                                                                    {intl.formatMessage(
                                                                        { id: 'pages.cloud-storage.quota.warning.info' },
                                                                        {
                                                                            used: formatFileSize(item.usedQuota),
                                                                            total: formatFileSize(item.totalQuota),
                                                                            percent: item.usagePercentage.toFixed(1)
                                                                        }
                                                                    )}
                                                                </p>
                                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                                    {intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.timeLabel' })}: {formatDateTime(item.createdAt)}
                                                                </Typography.Text>
                                                            </div>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    ) : (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={intl.formatMessage({ id: 'pages.cloud-storage.quota.warnings.empty' })}
                                            style={{ marginTop: 60 }}
                                        />
                                    )}
                                </div>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* 配额详情抽屉 */}
            <Drawer
                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.title' })}
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                width={isMobile ? '100%' : 600}
            >
                <Spin spinning={!viewingQuota}>
                    {viewingQuota ? (
                        <>
                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.basicInfo' })} className={styles.card} style={{ marginBottom: 16 }}>
                                <Descriptions column={isMobile ? 1 : 2} size="small">
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' })}</Space>}
                                        span={2}
                                    >
                                        {viewingQuota.userDisplayName && viewingQuota.userDisplayName !== viewingQuota.username
                                            ? `${viewingQuota.userDisplayName} (${viewingQuota.username})`
                                            : viewingQuota.userDisplayName || viewingQuota.username || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CloudOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuota' })}</Space>}
                                    >
                                        {formatFileSize(viewingQuota.totalQuota)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><BarChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usedQuota' })}</Space>}
                                    >
                                        {formatFileSize(viewingQuota.usedQuota)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><PieChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usagePercentage' })}</Space>}
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
                                        label={<Space><FileOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.fileCount' })}</Space>}
                                    >
                                        {viewingQuota.fileCount || 0}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><WarningOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThreshold' })}</Space>}
                                    >
                                        {viewingQuota.warningThreshold || 80}%
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CheckCircleOutlined />{intl.formatMessage({ id: 'pages.table.isEnabled' })}</Space>}
                                    >
                                        {viewingQuota.isEnabled !== false
                                            ? intl.formatMessage({ id: 'pages.table.enable' })
                                            : intl.formatMessage({ id: 'pages.table.disable' })}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.lastCalculated' })}</Space>}
                                    >
                                        {formatDateTime((viewingQuota as any).lastCalculatedAt || viewingQuota.updatedAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.table.createdAt' })}</Space>}
                                    >
                                        {formatDateTime(viewingQuota.createdAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.table.updatedAt' })}</Space>}
                                    >
                                        {formatDateTime(viewingQuota.updatedAt)}
                                    </Descriptions.Item>
                                    {(viewingQuota as any).createdByUsername && (
                                        <Descriptions.Item
                                            label={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.createdBy' })}</Space>}
                                        >
                                            {(viewingQuota as any).createdByUsername}
                                        </Descriptions.Item>
                                    )}
                                    {(viewingQuota as any).updatedByUsername && (
                                        <Descriptions.Item
                                            label={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.updatedBy' })}</Space>}
                                        >
                                            {(viewingQuota as any).updatedByUsername}
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Card>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            {intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.noData' })}
                        </div>
                    )}
                </Spin>
            </Drawer>

            {/* 编辑配额弹窗 */}
            <Modal
                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.action.edit' })}
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
                        label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuotaGB' })}
                        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' }) }]}
                    >
                        <InputNumber
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' })}
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value) => `${value}`}
                        />
                    </Form.Item>
                    <Form.Item
                        name="warningThreshold"
                        label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThresholdPercent' })}
                    >
                        <InputNumber
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.warningThreshold' })}
                            style={{ width: '100%' }}
                            min={0}
                            max={100}
                        />
                    </Form.Item>
                    <Form.Item
                        name="isEnabled"
                        label={intl.formatMessage({ id: 'pages.table.isEnabled' })}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {intl.formatMessage({ id: 'pages.table.save', defaultMessage: '保存' })}
                            </Button>
                            <Button
                                onClick={() => {
                                    setEditQuotaVisible(false);
                                    setEditingQuota(null);
                                    editQuotaForm.resetFields();
                                }}
                            >
                                {intl.formatMessage({ id: 'pages.table.cancel' })}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 新增配额弹窗 */}
            <Modal
                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.action.add' })}
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
                        label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' })}
                        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' }) }]}
                    >
                        <Select
                            showSearch
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' })}
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
                        label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuotaGB' })}
                        rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' }) }]}
                    >
                        <InputNumber
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' })}
                            style={{ width: '100%' }}
                            min={0}
                            formatter={(value) => `${value}`}
                        />
                    </Form.Item>
                    <Form.Item
                        name="warningThreshold"
                        label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThresholdPercent' })}
                    >
                        <InputNumber
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.warningThreshold' })}
                            style={{ width: '100%' }}
                            min={0}
                            max={100}
                        />
                    </Form.Item>
                    <Form.Item
                        name="isEnabled"
                        label={intl.formatMessage({ id: 'pages.table.isEnabled' })}
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch defaultChecked />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitLoading}>
                                {intl.formatMessage({ id: 'pages.table.save', defaultMessage: '保存' })}
                            </Button>
                            <Button
                                onClick={() => {
                                    setAddQuotaVisible(false);
                                    addQuotaForm.resetFields();
                                }}
                            >
                                {intl.formatMessage({ id: 'pages.table.cancel' })}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

        </PageContainer>
    );
};

export default CloudStorageQuotaPage;
