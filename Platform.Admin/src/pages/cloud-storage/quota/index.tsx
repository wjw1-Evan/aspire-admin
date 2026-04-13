import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import { useIntl } from '@umijs/max';
import { PieChartOutlined, EditOutlined, ReloadOutlined, UserOutlined, CloudOutlined, WarningOutlined, CheckCircleOutlined, BarChartOutlined, TableOutlined, DatabaseOutlined, CloudServerOutlined, LineChartOutlined, PlusOutlined, DeleteOutlined, FileOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import { Grid, Button, Tag, Space, Row, Col, Spin, Progress, Alert, Statistic, Tabs, Popconfirm, Typography, Badge, List, Avatar, Empty, App, Input } from 'antd';
import { Drawer } from 'antd';
import { ModalForm, ProFormDigit, ProFormSwitch, ProFormSelect } from '@ant-design/pro-form';
import { ProCard } from '@ant-design/pro-components';
import { getUserList, type AppUser } from '@/services/user/api';
import dayjs from 'dayjs';
import { getCurrentCompany } from '@/services/company';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult } from '@/types';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import type { PageParams } from '@/types';

interface StorageQuota { userId: string; totalQuota: number; usedQuota: number; fileCount: number; warningThreshold?: number; isEnabled: boolean; userDisplayName?: string; username?: string; createdAt: string; updatedAt: string; }
interface QuotaUsageStats { totalUsers: number; totalQuota: number; totalUsed: number; averageUsage: number; usageDistribution: { range: string; count: number; percentage: number }[]; topUsers: { userId: string; userDisplayName?: string; username?: string; usedQuota: number; usagePercentage: number }[]; }
interface QuotaWarning { userId: string; userDisplayName?: string; username?: string; warningType: string; usedQuota: number; totalQuota: number; usagePercentage: number; createdAt: string; }

interface UserQuotaResponse { userId: string; totalQuota: number; usedQuota: number; }
interface UpdateQuotaRequest { totalQuota?: number; warningThreshold?: number; isEnabled?: boolean; }
interface QuotaFormValues { userId?: string; totalQuota: number; warningThreshold?: number; isEnabled?: boolean; }

const api = {
    getUserQuota: (userId: string) => request<ApiResponse<UserQuotaResponse>>(`/apiservice/api/storage-quota/user/${userId}`),
    updateUserQuota: (userId: string, data: UpdateQuotaRequest) => request<ApiResponse<void>>(`/apiservice/api/storage-quota/user/${userId}`, { method: 'PUT', data }),
    getUsageStats: () => request<ApiResponse<QuotaUsageStats>>('/apiservice/api/storage-quota/usage-stats'),
    getWarnings: (companyId?: string) => request<ApiResponse<PagedResult<QuotaWarning>>>('/apiservice/api/storage-quota/warnings', { params: { companyId } }),
    setUserQuota: (data: { userId: string; totalQuota: number; warningThreshold?: number; isEnabled?: boolean }) => request<ApiResponse<void>>(`/apiservice/api/storage-quota/user/${data.userId}`, { method: 'PUT', data }),
    deleteUserQuota: (userId: string) => request<ApiResponse<void>>(`/apiservice/api/storage-quota/user/${userId}`, { method: 'DELETE' }),
};

const CloudStorageQuotaPage: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const { styles } = useCommonStyles();
    const tableRef = useRef<ActionType | undefined>(undefined);
    const [searchText, setSearchText] = useState('');

    const [state, setState] = useState({
        activeTab: 'quota-list' as 'quota-list' | 'usage-stats' | 'warnings',
        usageStats: null as QuotaUsageStats | null,
        warnings: [] as QuotaWarning[],
        detailVisible: false, viewingQuota: null as StorageQuota | null,
        editQuotaVisible: false, editingQuota: null as StorageQuota | null,
        addQuotaVisible: false, userOptions: [] as AppUser[], userLoading: false, submitLoading: false,
        deletingId: null as string | null,
        currentCompanyId: undefined as string | undefined,
    });

    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => {
        getCurrentCompany().then(res => { if (res.success && res.data) { const id = (res.data as any).id || (res.data as any).companyId; if (id) set({ currentCompanyId: id }); } });
    }, []);

    const refreshAll = useCallback(() => {
        if (state.activeTab === 'quota-list') {
            tableRef.current?.reload();
        }
        api.getUsageStats().then(res => { if (res.success && res.data) set({ usageStats: res.data }); else set({ usageStats: { totalUsers: 0, totalQuota: 0, totalUsed: 0, averageUsage: 0, usageDistribution: [], topUsers: [] } }); });
        api.getWarnings(state.currentCompanyId).then(res => { if (res.success && res.data) set({ warnings: res.data.queryable || [] }); });
    }, [state.activeTab, state.currentCompanyId]);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const handleTabChange = useCallback((key: string) => set({ activeTab: key as any }), []);

    const bytesToGB = (bytes?: number) => bytes === undefined || bytes === null ? 0 : Number((bytes / (1024 ** 3)).toFixed(2));
    const gbToBytes = (gb?: number) => gb === undefined || gb === null ? undefined : Math.round(gb * 1024 * 1024 * 1024);
    const formatFileSize = (bytes: any) => { const b = Number(bytes); if (!b || Number.isNaN(b)) return '0 B'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; let size = b; let i = 0; while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; } return `${size.toFixed(2)} ${units[i]}`; };
    const fmtPct = (v: any, decimals = 1) => Number(v || 0).toFixed(decimals);
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

    const handleEdit = useCallback((quota: StorageQuota) => { set({ editingQuota: quota, editQuotaVisible: true }); }, []);

    const handleEditSubmit = useCallback(async (values: QuotaFormValues) => {
        if (!state.editingQuota) return false;
        try {
            const totalQuota = values.totalQuota !== undefined ? gbToBytes(values.totalQuota) : undefined;
            await api.updateUserQuota(state.editingQuota.userId, { totalQuota, warningThreshold: values.warningThreshold, isEnabled: values.isEnabled });
            message.success('更新配额成功');
            set({ editQuotaVisible: false, editingQuota: null });
            refreshAll();
            return true;
        } catch {
            message.error('更新配额失败');
            return false;
        }
    }, [state.editingQuota, message, refreshAll]);

    const loadUserOptions = useCallback(async (keyword?: string) => {
        set({ userLoading: true });
        try { const res = await getUserList({ page: 1, search: keyword }); if (res.success && res.data) set({ userOptions: res.data.queryable || [] }); }
        catch (err) { console.error('Failed to load users:', err); }
        finally { set({ userLoading: false }); }
    }, []);

    useEffect(() => { if (state.addQuotaVisible) loadUserOptions(); }, [state.addQuotaVisible, loadUserOptions]);

    const handleAddSubmit = useCallback(async (values: QuotaFormValues) => {
        if (!values.userId) { message.error(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' })); return false; }
        set({ submitLoading: true });
        try {
            await api.setUserQuota({ userId: values.userId, totalQuota: gbToBytes(values.totalQuota) ?? 0, warningThreshold: values.warningThreshold, isEnabled: values.isEnabled });
            message.success('新增配额成功');
            set({ addQuotaVisible: false });
            refreshAll();
            return true;
        } catch {
            message.error('新增配额失败');
            return false;
        } finally {
            set({ submitLoading: false });
        }
    }, [message, refreshAll, intl]);

    const handleDelete = useCallback(async (quota: StorageQuota) => {
        set({ deletingId: quota.userId });
        try { await api.deleteUserQuota(quota.userId); message.success(intl.formatMessage({ id: 'pages.cloud-storage.quota.message.deleteSuccess' })); refreshAll(); }
        catch { message.error('删除配额失败'); }
        finally { set({ deletingId: null }); }
    }, [message, refreshAll, intl]);

    const columns: ProColumns<StorageQuota>[] = [
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' }), dataIndex: 'userDisplayName', key: 'userDisplayName', sorter: true, render: (dom: any, record: StorageQuota) => (<Space><UserOutlined /><a onClick={() => handleView(record)} style={{ cursor: 'pointer' }} title={dom || record.username || record.userId}>{dom || record.username || record.userId || intl.formatMessage({ id: 'pages.table.unknown' })}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.table.username' }), dataIndex: 'username', key: 'username', sorter: true, render: (dom: any, record: StorageQuota) => <span title={dom || record.userId}>{dom || record.userId || '-'}</span> },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuota' }), dataIndex: 'totalQuota', key: 'totalQuota', sorter: true, render: (dom: any) => formatFileSize(dom) },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usedQuota' }), dataIndex: 'usedQuota', key: 'usedQuota', sorter: true, render: (dom: any) => formatFileSize(dom) },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usagePercentage' }), key: 'usagePercentage', render: (_: any, r: StorageQuota) => { const pct = r.totalQuota > 0 ? parseFloat(((r.usedQuota / r.totalQuota) * 100).toFixed(2)) : 0; return <Progress percent={pct} size="small" strokeColor={getUsageColor(pct)} format={(p) => `${p}%`} />; } },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.quota.field.fileCount' }), dataIndex: 'fileCount', key: 'fileCount', sorter: true },
        { title: intl.formatMessage({ id: 'pages.table.status' }), key: 'status', render: (_: any, r: StorageQuota) => getStatusTag(r) },
        { title: intl.formatMessage({ id: 'pages.table.updatedAt', defaultMessage: '更新时间' }), dataIndex: 'updatedAt', key: 'updatedAt', sorter: true, render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-' },
        { title: intl.formatMessage({ id: 'pages.table.actions' }), key: 'action', fixed: 'right' as const, render: (_: any, r: StorageQuota) => (<Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={state.deletingId === r.userId} onClick={() => modal.confirm({ title: intl.formatMessage({ id: 'pages.cloud-storage.quota.confirmDelete.title' }), content: intl.formatMessage({ id: 'pages.cloud-storage.quota.confirmDelete.desc' }), onOk: () => handleDelete(r), okButtonProps: { danger: true } })}>{intl.formatMessage({ id: 'pages.table.delete' })}</Button>
        </Space>) },
    ];

    const userSelectOptions = state.userOptions.map(u => ({
        label: `${u.username}${u.name ? ` (${u.name})` : ''}`,
        value: u.id,
    }));

    return (
        <PageContainer>
            <ProCard className={styles.card}>
                <Tabs activeKey={state.activeTab} onChange={handleTabChange} items={[
                    { key: 'quota-list', label: <Space><TableOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.quotaList' })}</Space>, children: (
                        <ProTable<StorageQuota>
                            actionRef={tableRef}
                            rowKey="userId"
                            search={false}
                            request={async (params: any) => {
                                const { current, pageSize, sortBy, sortOrder } = params;
                                const res = await request<ApiResponse<PagedResult<StorageQuota>>>('/apiservice/api/storage-quota/list', {
                                    method: 'GET',
                                    params: { page: current, pageSize, sortBy, sortOrder, companyId: state.currentCompanyId, search: searchText } as PageParams,
                                });
                                if (res.success && res.data) {
                                    return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: true };
                                }
                                return { data: [], total: 0, success: false };
                            }}
                            columns={columns}
                            scroll={{ x: 'max-content' }}
                            toolBarRender={() => [
                              <Input.Search
                                key="search"
                                placeholder="搜索..."
                                allowClear
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onSearch={(value) => { setSearchText(value); tableRef.current?.reload(); }}
                                style={{ width: 260, marginRight: 8 }}
                                prefix={<SearchOutlined />}
                              />,
                              <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingQuota: null, addQuotaVisible: true })}>{intl.formatMessage({ id: 'pages.cloud-storage.quota.action.add' })}</Button>,
                            ]}
                        />
                    )},
                    { key: 'usage-stats', label: <Space><PieChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.usageStats' })}</Space>, children: state.usageStats ? (<Space orientation="vertical" style={{ width: '100%' }} size="large">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalUsers' })} value={state.usageStats.totalUsers} icon={<UserOutlined />} color="#1890ff" /></Col>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalQuota' })} value={formatFileSize(state.usageStats.totalQuota)} icon={<DatabaseOutlined />} color="#52c41a" /></Col>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.totalUsed' })} value={formatFileSize(state.usageStats.totalUsed)} icon={<CloudServerOutlined />} color="#faad14" /></Col>
                            <Col xs={24} sm={12} md={6}><StatCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.averageUsage' })} value={`${fmtPct(state.usageStats.totalQuota > 0 ? (state.usageStats.totalUsed / state.usageStats.totalQuota * 100) : 0)}%`} icon={<LineChartOutlined />} color="#722ed1" /></Col>
                        </Row>
                         <Row gutter={[16, 16]}>
                             <Col xs={24} lg={12}><ProCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.usageDistribution.title' })} bordered><div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {state.usageStats.usageDistribution?.length > 0 ? (<div style={{ width: '100%', padding: '0 20px' }}>{state.usageStats.usageDistribution.map((item, i) => (<div key={i} style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>{item.range}</span><span>{item.count}人 ({fmtPct(item.percentage)}%)</span></div><Progress percent={parseFloat(fmtPct(item.percentage))} size="small" /></div>))}</div>) : (<div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, fontWeight: 'bold', color: '#1890ff' }}>{fmtPct(state.usageStats.averageUsage)}%</div><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.cloud-storage.quota.statistics.averageUsage' })}</Typography.Text></div>)}
                             </div></ProCard></Col>
                              <Col xs={24} lg={12}><ProCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.usageRanking.title' })} bordered><div style={{ height: 350, overflowY: 'auto' }}>{state.usageStats.topUsers.map((user, i) => (<div key={user.userId} style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><Space><Typography.Text strong>{i + 1}.</Typography.Text><Typography.Text>{user.userDisplayName || user.username}</Typography.Text></Space><Typography.Text type="secondary">{formatFileSize(user.usedQuota)} / {formatFileSize(user.usagePercentage > 0 ? user.usedQuota / (user.usagePercentage / 100) : 0)}</Typography.Text></div><Progress percent={parseFloat(fmtPct(user.usagePercentage))} size="small" status={Number(user.usagePercentage) > 90 ? 'exception' : 'active'} /></div>))}</div></ProCard></Col>
                        </Row>
                    </Space>) : <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div> },
                    { key: 'warnings', label: <Space><Badge count={state.warnings.length} size="small" offset={[10, 0]}><WarningOutlined /></Badge>{intl.formatMessage({ id: 'pages.cloud-storage.quota.tabs.warnings' })}</Space>, children: (<div style={{ minHeight: 400 }}>
                        {state.warnings.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column' }}>{state.warnings.map((item) => (<div key={item.userId} style={{ display: 'flex', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}>
                            <div style={{ marginRight: 16 }}><Avatar icon={<WarningOutlined />} style={{ backgroundColor: item.warningType === 'exceeded' ? '#ff4d4f' : '#faad14' }} /></div>
                            <div style={{ flex: 1 }}><div style={{ marginBottom: 4 }}><Space><Typography.Text strong>{intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.title' }, { userDisplayName: item.userDisplayName || item.username })}</Typography.Text><Tag color={item.warningType === 'exceeded' ? 'error' : 'warning'}>{item.warningType === 'exceeded' ? intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.exceeded' }) : intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.approaching' })}</Tag></Space></div>
                                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}><p>{intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.info' }, { used: formatFileSize(item.usedQuota), total: formatFileSize(item.totalQuota), percent: fmtPct(item.usagePercentage) })}</p><Typography.Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'pages.cloud-storage.quota.warning.timeLabel' })}: {item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Typography.Text></div>
                            </div>
                            <div style={{ marginLeft: 16 }}><Button type="link" onClick={() => handleEdit(item as any)}>{intl.formatMessage({ id: 'pages.table.edit' })}</Button></div>
                        </div>))}</div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'pages.cloud-storage.quota.warnings.empty' })} style={{ marginTop: 60 }} />}
                    </div>) },
                ]} />
            </ProCard>

            <Drawer title={intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.title' })} placement="right" onClose={() => set({ detailVisible: false })} open={state.detailVisible} size="large">
                <Spin spinning={!state.viewingQuota}>
                    {state.viewingQuota && (<ProCard title={intl.formatMessage({ id: 'pages.cloud-storage.quota.drawer.basicInfo' })} className={styles.card} style={{ marginBottom: 16 }}>
                        <Row gutter={[16, 16]}>
                            <Col span={24}><Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' })}: </Space>{state.viewingQuota.userDisplayName && state.viewingQuota.userDisplayName !== state.viewingQuota.username ? `${state.viewingQuota.userDisplayName} (${state.viewingQuota.username})` : state.viewingQuota.userDisplayName || state.viewingQuota.username || '-'}</Col>
                            <Col xs={24} sm={12}><Space><CloudOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuota' })}: </Space>{formatFileSize(state.viewingQuota.totalQuota)}</Col>
                            <Col xs={24} sm={12}><Space><BarChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usedQuota' })}: </Space>{formatFileSize(state.viewingQuota.usedQuota)}</Col>
                            <Col xs={24} sm={12}><Space><PieChartOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.usagePercentage' })}: </Space><Progress percent={state.viewingQuota.totalQuota > 0 ? Math.round((state.viewingQuota.usedQuota / state.viewingQuota.totalQuota) * 100) : 0} size="small" strokeColor={getUsageColor(state.viewingQuota.totalQuota > 0 ? (state.viewingQuota.usedQuota / state.viewingQuota.totalQuota) * 100 : 0)} /></Col>
                            <Col xs={24} sm={12}><Space><FileOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.fileCount' })}: </Space>{state.viewingQuota.fileCount || 0}</Col>
                            <Col xs={24} sm={12}><Space><WarningOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThreshold' })}: </Space>{state.viewingQuota.warningThreshold || 80}%</Col>
                            <Col xs={24} sm={12}><Space><CheckCircleOutlined />{intl.formatMessage({ id: 'pages.table.isEnabled' })}: </Space>{state.viewingQuota.isEnabled !== false ? intl.formatMessage({ id: 'pages.table.enable' }) : intl.formatMessage({ id: 'pages.table.disable' })}</Col>
                            <Col xs={24} sm={12}><Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.table.updatedAt' })}: </Space>{state.viewingQuota.updatedAt ? dayjs(state.viewingQuota.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Col>
                        </Row>
                    </ProCard>)}
                </Spin>
            </Drawer>

            <ModalForm
                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.action.edit' })}
                open={state.editQuotaVisible}
                onOpenChange={(isOpen) => { if (!isOpen) set({ editQuotaVisible: false, editingQuota: null }); }}
                onFinish={handleEditSubmit}
                initialValues={state.editingQuota ? {
                    totalQuota: bytesToGB(state.editingQuota.totalQuota),
                    warningThreshold: state.editingQuota.warningThreshold,
                    isEnabled: state.editingQuota.isEnabled,
                } : undefined}
                autoFocusFirstInput
                width={600}
            >
                <ProFormDigit name="totalQuota" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuotaGB' })} fieldProps={{ min: 0 }} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' }) }]} />
                <ProFormDigit name="warningThreshold" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThresholdPercent' })} fieldProps={{ min: 0, max: 100 }} />
                <ProFormSwitch name="isEnabled" label={intl.formatMessage({ id: 'pages.table.isEnabled' })} />
            </ModalForm>

            <ModalForm
                title={intl.formatMessage({ id: 'pages.cloud-storage.quota.action.add' })}
                open={state.addQuotaVisible}
                onOpenChange={(isOpen) => { if (!isOpen) set({ addQuotaVisible: false }); }}
                onFinish={handleAddSubmit}
                initialValues={{ isEnabled: true }}
                autoFocusFirstInput
                width={600}
                submitter={{ render: (_, defaultDom) => [<Spin key="spin" spinning={state.submitLoading}>{defaultDom}</Spin>] }}
            >
                <ProFormSelect name="userId" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.user' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.message.selectUser' }) }]} showSearch fieldProps={{ options: userSelectOptions }} />
                <ProFormDigit name="totalQuota" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.totalQuotaGB' })} fieldProps={{ min: 0 }} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloud-storage.quota.placeholder.totalQuota' }) }]} />
                <ProFormDigit name="warningThreshold" label={intl.formatMessage({ id: 'pages.cloud-storage.quota.field.warningThresholdPercent' })} fieldProps={{ min: 0, max: 100 }} />
                <ProFormSwitch name="isEnabled" label={intl.formatMessage({ id: 'pages.table.isEnabled' })} fieldProps={{ checkedChildren: intl.formatMessage({ id: 'pages.table.enable' }), unCheckedChildren: intl.formatMessage({ id: 'pages.table.disable' }) }} />
            </ModalForm>
        </PageContainer>
    );
};

export default CloudStorageQuotaPage;
