import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchBar from '@/components/SearchBar';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useIntl } from '@umijs/max';
import { PieChartOutlined, EditOutlined, ReloadOutlined, UserOutlined, CloudOutlined, WarningOutlined, CheckCircleOutlined, BarChartOutlined, TableOutlined, DatabaseOutlined, CloudServerOutlined, LineChartOutlined, PlusOutlined, DeleteOutlined, FileOutlined, CalendarOutlined } from '@ant-design/icons';
import { Grid, Button, Tag, Space, Modal, Drawer, Row, Col, Card, Form, Input, Select, Descriptions, Spin, Progress, InputNumber, Switch, Alert, Statistic, Tabs, Popconfirm, Typography, Badge, List, Avatar, Empty, Table, App } from 'antd';
import { getUserList, type AppUser } from '@/services/user/api';
import { formatDateTime } from '@/utils/format';
import { getCurrentCompany } from '@/services/company';
import type { PageParams } from '@/types/api-response';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types/api-response';

// ==================== Types ====================
interface StorageQuota { userId: string; totalQuota: number; usedQuota: number; fileCount: number; warningThreshold?: number; isEnabled: boolean; userDisplayName?: string; username?: string; createdAt: string; updatedAt: string; }
interface QuotaUsageStats { totalUsers: number; totalQuota: number; totalUsed: number; averageUsage: number; usageDistribution: { range: string; count: number; percentage: number }[]; topUsers: { userId: string; userDisplayName?: string; username?: string; usedQuota: number; usagePercentage: number }[]; }
interface QuotaWarning { userId: string; userDisplayName?: string; username?: string; warningType: string; usedQuota: number; totalQuota: number; usagePercentage: number; createdAt: string; }

// ==================== API ====================
const api = {
    list: (params: { page: number; pageSize: number; sortBy?: string; sortOrder?: string; companyId?: string; search?: string }) => request<ApiResponse<PagedResult<StorageQuota>>>('/api/cloud-storage/quota/list', { method: 'GET', params }),
    getUserQuota: (userId: string) => request<ApiResponse<any>>(`/api/cloud-storage/quota/users/${userId}`),
    updateUserQuota: (userId: string, data: any) => request<ApiResponse<void>>(`/api/cloud-storage/quota/users/${userId}`, { method: 'PUT', data }),
    getUsageStats: () => request<ApiResponse<QuotaUsageStats>>('/api/cloud-storage/quota/usage-stats'),
    getWarnings: (companyId?: string) => request<ApiResponse<PagedResult<QuotaWarning>>>('/api/cloud-storage/quota/warnings', { params: { companyId } }),
    setUserQuota: (data: { userId: string; totalQuota: number; warningThreshold?: number; isEnabled?: boolean }) => request<ApiResponse<void>>('/api/cloud-storage/quota/users', { method: 'POST', data }),
    deleteUserQuota: (userId: string) => request<ApiResponse<void>>(`/api/cloud-storage/quota/users/${userId}`, { method: 'DELETE' }),
};

const CloudStorageQuotaPage: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const { styles } = useCommonStyles();

    const [state, setState] = useState({
        activeTab: 'quota-list' as 'quota-list' | 'usage-stats' | 'warnings',
        data: [] as StorageQuota[], loading: false,
        pagination: { page: 1, pageSize: 10, total: 0 },
        usageStats: null as QuotaUsageStats | null,
        warnings: [] as QuotaWarning[],
        detailVisible: false, viewingQuota: null as StorageQuota | null,
        editQuotaVisible: false, editingQuota: null as StorageQuota | null,
        addQuotaVisible: false, userOptions: [] as AppUser[], userLoading: false, submitLoading: false,
        deletingId: null as string | null,
        currentCompanyId: undefined as string | undefined,
    });

    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

    const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 10, search: '' });
    const [editQuotaForm] = Form.useForm();
    const [addQuotaForm] = Form.useForm();

    useEffect(() => {
        getCurrentCompany().then(res => { if (res.success && res.data) { const id = (res.data as any).id || (res.data as any).companyId; if (id) set({ currentCompanyId: id }); } });
    }, []);

    const refreshAll = useCallback(() => {
        if (state.activeTab === 'quota-list') fetchData();
        api.getUsageStats().then(res => { if (res.success && res.data) set({ usageStats: res.data }); else set({ usageStats: { totalUsers: 0, totalQuota: 0, totalUsed: 0, averageUsage: 0, usageDistribution: [], topUsers: [] } }); });
        api.getWarnings(state.currentCompanyId).then(res => { if (res.success && res.data) set({ warnings: res.data.queryable || [] }); });
    }, [state.activeTab, state.currentCompanyId]);

    const fetchData = useCallback(async () => {
        const { page = 1, pageSize = 10, search, sortBy, sortOrder } = searchParamsRef.current;
        set({ loading: true });
        try {
            const res = await api.list({ page, pageSize, sortBy, sortOrder, companyId: state.currentCompanyId, search });
            if (res.success && res.data) { set({ data: res.data.queryable || [], pagination: { ...state.pagination, page, pageSize, total: res.data.rowCount ?? 0 } }); }
            else { set({ data: [], pagination: { ...state.pagination, total: 0 } }); }
        } finally { set({ loading: false }); }
    }, [state.currentCompanyId, state.pagination]);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const handleSearch = useCallback((params: PageParams) => { searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 }; fetchData(); }, [fetchData]);
    const handleTableChange = useCallback((pag: any, _f: any, s: any) => { searchParamsRef.current = { ...searchParamsRef.current, page: pag.current, pageSize: pag.pageSize, sortBy: s?.field, sortOrder: s?.order === 'ascend' ? 'asc' : s?.order === 'descend' ? 'desc' : undefined }; fetchData(); }, [fetchData]);
    const handleTabChange = useCallback((key: string) => set({ activeTab: key as any }), []);

    const bytesToGB = (bytes?: number) => bytes === undefined || bytes === null ? 0 : Number((bytes / (1024 ** 3)).toFixed(2));
    const gbToBytes = (gb?: number) => gb === undefined || gb === null ? undefined : Math.round(gb * 1024 * 1024 * 1024);
    const formatFileSize = (bytes: number) => { if (!bytes || Number.isNaN(bytes)) return '0 B'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; let size = bytes; let i = 0; while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; } return `${size.toFixed(2)} ${units[i]}`; };
    const getUsageColor = (pct: number) => pct >= 90 ? '#ff4d4f' : pct >= 80 ? '#fa8c16' : pct >= 60 ? '#faad14' : '#52c41a';

    const getStatusTag = (quota: StorageQuota) => {
        if (!quota.isEnabled) return <Tag color="default">{intl.formatMessage({ id: 'pages.table.deactivated' })}</Tag>;
        if (!quota.totalQuota || quota.totalQuota === 0) return <Tag color="green">{intl.formatMessage({ id: 'pages.cloud-storage.quota.status.normal' })}</Tag>;
        const pct = (quota.usedQuota / quota.totalQuota) * 100;
        return pct >= (quota.warningThreshold || 80) ? <Tag color="red">{intl.formatMessage({ id: 'pages.cloud-storage.quota.status.warning' })}</Tag> : <Tag color="green">{intl.formatMessage({ id: 'pages.cloud-storage.quota.status.normal' })}</Tag>;
    };

    const handleView = useCallback(async (quota: StorageQuota) => {
        try {
            const res = await api.getUserQuota(quota.userId);
            if (res.success && res.data) {
                const d = res.data as any;
                set({ viewingQuota: { ...d, id: d.id || d.userId, userDisplayName: quota.userDisplayName || quota.username || d.createdByUsername || d.userId || '未知用户', username: quota.username || d.createdByUsername || d.userId || '-', usedQuota: d.usedSpace !== undefined ? d.usedSpace : (d.usedQuota || 0), fileCount: d.fileCount !== undefined ? d.fileCount : (quota.fileCount || 0), warningThreshold: d.warningThreshold !== undefined ? d.warningThreshold : 80, isEnabled: d.isEnabled !== undefined ? d.isEnabled : (!d.isDeleted) }, detailVisible: true });
            }
        } catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.fetchFailed', defaultMessage: '获取配额详情失败' })); }
    }, [message, intl]);

    const handleEdit = useCallback((quota: StorageQuota) => { set({ editingQuota: quota, editQuotaVisible: true }); editQuotaForm.setFieldsValue({ totalQuota: bytesToGB(quota.totalQuota), warningThreshold: quota.warningThreshold, isEnabled: quota.isEnabled }); }, [editQuotaForm]);
    const handleEditSubmit = useCallback(async (values: any) => {
        if (!state.editingQuota) return;
        try { await api.updateUserQuota(state.editingQuota.userId, { ...values, totalQuota: values.totalQuota !== undefined ? gbToBytes(values.totalQuota) : undefined }); message.success('更新配额成功'); set({ editQuotaVisible: false, editingQuota: null }); editQuotaForm.resetFields(); refreshAll(); }
        catch { message.error('更新配额失败'); }
    }, [state.editingQuota, message, editQuotaForm, refreshAll]);

    const loadUserOptions = useCallback(async (keyword?: string) => {
        set({ userLoading: true });
        try { const res = await getUserList({ page: 1, pageSize: 50, search: keyword }); if (res.success && res.data) set({ userOptions: res.data.queryable || [] }); }
        catch (err) { console.error('Failed to load users:', err); }
        finally { set({ userLoading: false }); }
    }, []);

    useEffect(() => { if (state.addQuotaVisible) loadUserOptions(); }, [state.addQuotaVisible, loadUserOptions]);

    const handleAddSubmit = useCallback(async (values: any) => {
        if (!values.userId) { message.error(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' })); return; }
        set({ submitLoading: true });
        try { await api.setUserQuota({ userId: values.userId, totalQuota: gbToBytes(values.totalQuota) ?? 0, warningThreshold: values.warningThreshold, isEnabled: values.isEnabled }); message.success('新增配额成功'); set({ addQuotaVisible: false }); addQuotaForm.resetFields(); refreshAll(); }
        catch { message.error('新增配额失败'); }
        finally { set({ submitLoading: false }); }
    }, [addQuotaForm, message, refreshAll, intl]);

    const handleDelete = useCallback(async (quota: StorageQuota) => {
        set({ deletingId: quota.userId });
        try { await api.deleteUserQuota(quota.userId); message.success(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.deleteSuccess' })); refreshAll(); }
        catch { message.error('删除配额失败'); }
        finally { set({ deletingId: null }); }
    }, [message, refreshAll, intl]);

    const columns = [
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' }), dataIndex: 'userDisplayName', key: 'userDisplayName', sorter: true, render: (text: string, record: StorageQuota) => (<Space><UserOutlined /><a onClick={() => handleView(record)} style={{ cursor: 'pointer' }} title={text || record.username || record.userId}>{text || record.username || record.userId || intl.formatMessage({ id: 'pages.table.unknown' })}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.table.username' }), dataIndex: 'username', key: 'username', sorter: true, render: (text: string, record: StorageQuota) => <span title={text || record.userId}>{text || record.userId || '-'}</span> },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuota' }), dataIndex: 'totalQuota', key: 'totalQuota', sorter: true, render: (q: number) => formatFileSize(q) },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usedQuota' }), dataIndex: 'usedQuota', key: 'usedQuota', sorter: true, render: (u: number) => formatFileSize(u) },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usagePercentage' }), key: 'usagePercentage', render: (_: any, r: StorageQuota) => { const pct = r.totalQuota > 0 ? parseFloat(((r.usedQuota / r.totalQuota) * 100).toFixed(2)) : 0; return <Progress percent={pct} size="small" strokeColor={getUsageColor(pct)} format={(p) => `${p}%`} />; } },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.fileCount' }), dataIndex: 'fileCount', key: 'fileCount', sorter: true },
        { title: intl.formatMessage({ id: 'pages.table.status' }), key: 'status', render: (_: any, r: StorageQuota) => getStatusTag(r) },
        { title: intl.formatMessage({ id: 'pages.table.updatedAt', defaultMessage: '更新时间' }), dataIndex: 'updatedAt', key: 'updatedAt', sorter: true, render: (t: string) => formatDateTime(t) },
        { title: intl.formatMessage({ id: 'pages.table.actions' }), key: 'action', fixed: 'right' as const, render: (_: any, r: StorageQuota) => (<Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={state.deletingId === r.userId} onClick={() => modal.confirm({ title: intl.formatMessage({ id: 'pages.cloud-storage.quota.confirmDelete.title' }), content: intl.formatMessage({ id: 'pages.cloud-storage.quota.confirmDelete.desc' }), onOk: () => handleDelete(r), okButtonProps: { danger: true } })}>{intl.formatMessage({ id: 'pages.table.delete' })}</Button>
        </Space>) },
    ];

    return (
        <PageContainer title={<Space><PieChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.title' })}</Space>}
            extra={<Space wrap>
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingQuota: null, addQuotaVisible: true })}>{intl.formatMessage({ id: 'pages.cloud-storage.quota.action.add' })}</Button>
                <Button key="refresh" icon={<ReloadOutlined />} onClick={refreshAll}>{intl.formatMessage({ id: 'pages.common.refresh', defaultMessage: '刷新' })}</Button>
            </Space>}>
            <Card className={styles.card}>
                <Tabs activeKey={state.activeTab} onChange={handleTabChange} items={[
                    { key: 'quota-list', label: <Space><TableOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.quotaList' })}</Space>, children: (<div><SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} /><Table<StorageQuota> dataSource={state.data} rowKey="userId" columns={columns} loading={state.loading} onChange={handleTableChange} pagination={{ current: state.pagination.page, pageSize: state.pagination.pageSize, total: state.pagination.total }} /></div>) },
                    { key: 'usage-stats', label: <Space><PieChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.usageStats' })}</Space>, children: state.usageStats ? (<Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalUsers' })} value={state.usageStats.totalUsers} icon={<UserOutlined />} color="#1890ff" /></Col>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalQuota' })} value={formatFileSize(state.usageStats.totalQuota)} icon={<DatabaseOutlined />} color="#52c41a" /></Col>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalUsed' })} value={formatFileSize(state.usageStats.totalUsed)} icon={<CloudServerOutlined />} color="#faad14" /></Col>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.averageUsage' })} value={`${(state.usageStats.totalQuota > 0 ? (state.usageStats.totalUsed / state.usageStats.totalQuota * 100) : 0).toFixed(1)}%`} icon={<LineChartOutlined />} color="#722ed1" /></Col>
                        </Row>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} lg={12}><Card title={intl.formatMessage({ id: 'pages.cloud-storage.quota.usageDistribution.title' })} variant="borderless"><div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {state.usageStats.usageDistribution?.length > 0 ? (<div style={{ width: '100%', padding: '0 20px' }}>{state.usageStats.usageDistribution.map((item, i) => (<div key={i} style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>{item.range}</span><span>{item.count}人 ({item.percentage.toFixed(1)}%)</span></div><Progress percent={parseFloat(item.percentage.toFixed(1))} size="small" /></div>))}</div>) : (<div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, fontWeight: 'bold', color: '#1890ff' }}>{state.usageStats.averageUsage.toFixed(1)}%</div><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.averageUsage' })}</Typography.Text></div>)}
                            </div></Card></Col>
                            <Col xs={24} lg={12}><Card title={intl.formatMessage({ id: 'pages.cloud-storage.quota.usageRanking.title' })} variant="borderless"><div style={{ height: 350, overflowY: 'auto' }}>{state.usageStats.topUsers.map((user, i) => (<div key={user.userId} style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><Space><Typography.Text strong>{i + 1}.</Typography.Text><Typography.Text>{user.userDisplayName || user.username}</Typography.Text></Space><Typography.Text type="secondary">{formatFileSize(user.usedQuota)} / {formatFileSize(user.usedQuota / (user.usagePercentage / 100))}</Typography.Text></div><Progress percent={parseFloat(user.usagePercentage.toFixed(1))} size="small" status={user.usagePercentage > 90 ? 'exception' : 'active'} /></div>))}</div></Card></Col>
                        </Row>
                    </Space>) : <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div> },
                    { key: 'warnings', label: <Space><Badge count={state.warnings.length} size="small" offset={[10, 0]}><WarningOutlined /></Badge>{intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.warnings' })}</Space>, children: (<div style={{ minHeight: 400 }}>
                        {state.warnings.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column' }}>{state.warnings.map((item) => (<div key={item.userId} style={{ display: 'flex', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}>
                            <div style={{ marginRight: 16 }}><Avatar icon={<WarningOutlined />} style={{ backgroundColor: item.warningType === 'exceeded' ? '#ff4d4f' : '#faad14' }} /></div>
                            <div style={{ flex: 1 }}><div style={{ marginBottom: 4 }}><Space><Typography.Text strong>{intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.title' }, { userDisplayName: item.userDisplayName || item.username })}</Typography.Text><Tag color={item.warningType === 'exceeded' ? 'error' : 'warning'}>{item.warningType === 'exceeded' ? intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.exceeded' }) : intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.approaching' })}</Tag></Space></div>
                                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}><p>{intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.info' }, { used: formatFileSize(item.usedQuota), total: formatFileSize(item.totalQuota), percent: item.usagePercentage.toFixed(1) })}</p><Typography.Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.timeLabel' })}: {formatDateTime(item.createdAt)}</Typography.Text></div>
                            </div>
                            <div style={{ marginLeft: 16 }}><Button type="link" onClick={() => handleEdit(item as any)}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button></div>
                        </div>))}</div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'pages.cloud-storage.quota.warnings.empty' })} style={{ marginTop: 60 }} />}
                    </div>) },
                ]} />
            </Card>

            {/* 详情 */}
            <Drawer title={intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.title' })} placement="right" onClose={() => set({ detailVisible: false })} open={state.detailVisible} size={isMobile ? 'default' : 'large'}>
                <Spin spinning={!state.viewingQuota}>
                    {state.viewingQuota && (<Card title={intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.basicInfo' })} className={styles.card} style={{ marginBottom: 16 }}>
                        <Descriptions column={isMobile ? 1 : 2} size="small">
                            <Descriptions.Item label={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' })}</Space>} span={2}>{state.viewingQuota.userDisplayName && state.viewingQuota.userDisplayName !== state.viewingQuota.username ? `${state.viewingQuota.userDisplayName} (${state.viewingQuota.username})` : state.viewingQuota.userDisplayName || state.viewingQuota.username || '-'}</Descriptions.Item>
                            <Descriptions.Item label={<Space><CloudOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuota' })}</Space>}>{formatFileSize(state.viewingQuota.totalQuota)}</Descriptions.Item>
                            <Descriptions.Item label={<Space><BarChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usedQuota' })}</Space>}>{formatFileSize(state.viewingQuota.usedQuota)}</Descriptions.Item>
                            <Descriptions.Item label={<Space><PieChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usagePercentage' })}</Space>}><Progress percent={state.viewingQuota.totalQuota > 0 ? Math.round((state.viewingQuota.usedQuota / state.viewingQuota.totalQuota) * 100) : 0} size="small" strokeColor={getUsageColor(state.viewingQuota.totalQuota > 0 ? (state.viewingQuota.usedQuota / state.viewingQuota.totalQuota) * 100 : 0)} /></Descriptions.Item>
                            <Descriptions.Item label={<Space><FileOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.fileCount' })}</Space>}>{state.viewingQuota.fileCount || 0}</Descriptions.Item>
                            <Descriptions.Item label={<Space><WarningOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThreshold' })}</Space>}>{state.viewingQuota.warningThreshold || 80}%</Descriptions.Item>
                            <Descriptions.Item label={<Space><CheckCircleOutlined />{intl.formatMessage({ id: 'pages.table.isEnabled' })}</Space>}>{state.viewingQuota.isEnabled !== false ? intl.formatMessage({ id: 'pages.table.enable' }) : intl.formatMessage({ id: 'pages.table.disable' })}</Descriptions.Item>
                            <Descriptions.Item label={<Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.table.updatedAt' })}</Space>}>{formatDateTime(state.viewingQuota.updatedAt)}</Descriptions.Item>
                        </Descriptions>
                    </Card>)}
                </Spin>
            </Drawer>

            {/* 编辑配额 */}
            <Modal title={intl.formatMessage({ id: 'pages.cloud-storage.quota.action.edit' })} open={state.editQuotaVisible} onCancel={() => { set({ editQuotaVisible: false, editingQuota: null }); editQuotaForm.resetFields(); }} footer={null} width={600}>
                <Form form={editQuotaForm} layout="vertical" onFinish={handleEditSubmit}>
                    <Form.Item name="totalQuota" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuotaGB' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' }) }]}><InputNumber placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' })} style={{ width: '100%' }} min={0} formatter={(v) => `${v}`} /></Form.Item>
                    <Form.Item name="warningThreshold" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThresholdPercent' })}><InputNumber placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.warningThreshold' })} style={{ width: '100%' }} min={0} max={100} /></Form.Item>
                    <Form.Item name="isEnabled" label={intl.formatMessage({ id: 'pages.table.isEnabled' })} valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">{intl.formatMessage({ id: 'pages.table.save', defaultMessage: '保存' })}</Button><Button onClick={() => { set({ editQuotaVisible: false, editingQuota: null }); editQuotaForm.resetFields(); }}>{intl.formatMessage({ id: 'pages.table.cancel' })}</Button></Space></Form.Item>
                </Form>
            </Modal>

            {/* 新增配额 */}
            <Modal title={intl.formatMessage({ id: 'pages.cloud-storage.quota.action.add' })} open={state.addQuotaVisible} onCancel={() => { set({ addQuotaVisible: false }); addQuotaForm.resetFields(); }} footer={null} width={600}>
                <Form form={addQuotaForm} layout="vertical" onFinish={handleAddSubmit}>
                    <Form.Item name="userId" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' }) }]}><Select showSearch placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' })} loading={state.userLoading} optionFilterProp="label" onSearch={(v) => loadUserOptions(v)} filterOption={false} options={state.userOptions.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>
                    <Form.Item name="totalQuota" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuotaGB' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' }) }]}><InputNumber placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' })} style={{ width: '100%' }} min={0} formatter={(v) => `${v}`} /></Form.Item>
                    <Form.Item name="warningThreshold" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThresholdPercent' })}><InputNumber placeholder={intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.warningThreshold' })} style={{ width: '100%' }} min={0} max={100} /></Form.Item>
                    <Form.Item name="isEnabled" label={intl.formatMessage({ id: 'pages.table.isEnabled' })} valuePropName="checked" initialValue={true}><Switch defaultChecked /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit" loading={state.submitLoading}>{intl.formatMessage({ id: 'pages.table.save', defaultMessage: '保存' })}</Button><Button onClick={() => { set({ addQuotaVisible: false }); addQuotaForm.resetFields(); }}>{intl.formatMessage({ id: 'pages.table.cancel' })}</Button></Space></Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default CloudStorageQuotaPage;
