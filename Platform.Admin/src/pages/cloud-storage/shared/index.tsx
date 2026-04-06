import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { Grid, Table, Button, Tag, Space, Modal, Drawer, Row, Col, Card, Form, Input, Select, Descriptions, Spin, Tabs, DatePicker, Switch, App } from 'antd';
import { ShareAltOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, CopyOutlined, LinkOutlined, LockOutlined, UnlockOutlined, CalendarOutlined, UserOutlined, FileOutlined, DownloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { formatDateTime } from '@/utils/format';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types';

const { RangePicker } = DatePicker;

// ==================== Types ====================
interface FileShare { id: string; fileId: string; fileName: string; shareToken: string; shareType: 'internal' | 'external'; accessType: 'view' | 'download' | 'edit'; password: string; expiresAt?: string; maxDownloads?: number; downloadCount: number; accessCount: number; isEnabled: boolean; createdAt: string; createdBy?: string; createdByName?: string; }

// ==================== API ====================
const api = {
    getMyShares: (params: { page: number; pageSize: number; search?: string; sortBy?: string; sortOrder?: string }) => request<ApiResponse<PagedResult<any>>>('/api/cloud-storage/share/my-shares', { params }),
    getSharedWithMe: (params: { page: number; pageSize: number; search?: string; sortBy?: string; sortOrder?: string }) => request<ApiResponse<PagedResult<any>>>('/api/cloud-storage/share/shared-with-me', { params }),
    getDetail: (id: string) => request<ApiResponse<any>>(`/api/cloud-storage/share/${id}`),
    update: (id: string, data: any) => request<ApiResponse<void>>(`/api/cloud-storage/share/${id}`, { method: 'PUT', data }),
    delete: (id: string) => request<ApiResponse<void>>(`/api/cloud-storage/share/${id}`, { method: 'DELETE' }),
    toggle: (id: string, enabled: boolean) => request<ApiResponse<void>>(`/api/cloud-storage/share/${id}/toggle`, { method: 'POST', data: { enabled } }),
    notify: (data: { shareId: string; userIds?: string[]; message?: string }) => request<ApiResponse<void>>('/api/cloud-storage/share/notify', { method: 'POST', data }),
    getFileDetail: (id: string) => request<ApiResponse<any>>(`/api/cloud-storage/files/${id}`),
};

const CloudStorageSharedPage: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const { styles } = useCommonStyles();

    const [state, setState] = useState({
        activeTab: 'my-shares' as 'my-shares' | 'shared-with-me',
        data: [] as FileShare[], loading: false,
        pagination: { page: 1, total: 0 },
        selectedRowKeys: [] as string[], selectedRows: [] as FileShare[],
        detailVisible: false, viewingShare: null as FileShare | null,
        editShareVisible: false, editingShare: null as FileShare | null,
        notifyVisible: false, notifyingShare: null as FileShare | null,
        fileNameMap: {} as Record<string, string>,
    });

    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));
    const searchParamsRef = useRef<PageParams>({});
    const [editShareForm] = Form.useForm();
    const [notifyForm] = Form.useForm();

    const mapShareType = (type: any): 'internal' | 'external' => {
        if (typeof type === 'string') return type.toLowerCase() === 'internal' ? 'internal' : 'external';
        return type === 1 ? 'internal' : 'external';
    };
    const mapAccessType = (permission: any): 'view' | 'download' | 'edit' => {
        if (typeof permission === 'number') { if (permission === 1) return 'download'; if (permission >= 2) return 'edit'; return 'view'; }
        const lower = typeof permission === 'string' ? permission.toLowerCase() : '';
        if (lower === 'download') return 'download'; if (lower === 'edit' || lower === 'full') return 'edit'; return 'view';
    };
    const transformShare = (item: any): FileShare => ({
        id: item.id, fileId: item.fileItemId, fileName: item.fileName || item.fileItemName || item.fileItemId || '未知文件',
        shareToken: item.shareToken, shareType: mapShareType(item.type), accessType: mapAccessType(item.permission),
        password: item.password || '', expiresAt: item.expiresAt,
        maxDownloads: typeof item.settings?.maxDownloads === 'number' ? item.settings.maxDownloads : (typeof item.maxDownloads === 'number' ? item.maxDownloads : undefined),
        downloadCount: item.downloadCount || item.accessCount || 0, accessCount: item.accessCount || 0,
        isEnabled: item.isActive !== undefined ? item.isActive : item.isEnabled,
        createdAt: item.createdAt, createdBy: item.createdBy, createdByName: item.createdByName || item.createdByUsername || '',
    });

    const resolveFileName = useCallback(async (fileId?: string) => {
        if (!fileId) return undefined;
        const cachedName = state.fileNameMap[fileId];
        if (cachedName) return cachedName;
        try { const res = await api.getFileDetail(fileId); if (res.success && res.data) { const name = res.data.name || fileId; set({ fileNameMap: { ...state.fileNameMap, [fileId]: name } }); return name; } } catch {}
        return fileId;
    }, [state.fileNameMap]);

    const fetchData = useCallback(async () => {
        const { page = 1, search, sortBy, sortOrder } = searchParamsRef.current;
        set({ loading: true });
        try {
            const res = state.activeTab === 'my-shares' ? await api.getMyShares({ page, search, sortBy, sortOrder }) : await api.getSharedWithMe({ page, search, sortBy, sortOrder });
            if (res.success && res.data) {
                const transformed = (res.data.queryable || []).map(transformShare);
                const missingIds = Array.from(new Set(transformed.map((i: any) => i.fileId).filter((id: string) => id && !state.fileNameMap[id])));
                if (missingIds.length > 0) {
                    const details = await Promise.all(missingIds.map(async (id: string) => { try { const r = await api.getFileDetail(id); return { id, name: r.success && r.data ? r.data.name : id }; } catch { return { id, name: id }; } }));
                    const newMap = { ...state.fileNameMap }; details.forEach(d => { if (d?.id) newMap[d.id] = d.name; }); set({ fileNameMap: newMap });
                    transformed.forEach((item: any) => { if (newMap[item.fileId]) item.fileName = newMap[item.fileId]; });
                } else { transformed.forEach((item: any) => { if (state.fileNameMap[item.fileId]) item.fileName = state.fileNameMap[item.fileId]; }); }
                set({ data: transformed, pagination: { ...state.pagination, page, total: res.data.rowCount ?? 0 } });
            } else { set({ data: [], pagination: { ...state.pagination, total: 0 } }); }
        } catch { set({ data: [], pagination: { ...state.pagination, total: 0 } }); }
        finally { set({ loading: false }); }
    }, [state.activeTab, state.fileNameMap, state.pagination]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSearch = useCallback((params: PageParams) => { searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 }; fetchData(); }, [fetchData]);
    const handleTableChange = useCallback((pag: any, _f: any, s: any) => { searchParamsRef.current = { ...searchParamsRef.current, page: pag.current, sortBy: s?.field, sortOrder: s?.order === 'ascend' ? 'asc' : s?.order === 'descend' ? 'desc' : undefined }; fetchData(); }, [fetchData]);
    const handleRefresh = useCallback(() => { fetchData(); }, [fetchData]);
    const handleTabChange = useCallback((key: string) => { set({ activeTab: key as any, selectedRowKeys: [], selectedRows: [] }); }, []);

    const handleView = useCallback(async (share: FileShare) => {
        try { const res = await api.getDetail(share.id); if (res.success && res.data) { const t = transformShare(res.data); const name = await resolveFileName(t.fileId); set({ viewingShare: { ...t, fileName: name || t.fileName }, detailVisible: true }); } }
        catch { message.error('获取分享详情失败'); }
    }, [message, resolveFileName]);

    const handleEdit = useCallback((share: FileShare) => { set({ editingShare: share, editShareVisible: true }); editShareForm.setFieldsValue({ accessType: share.accessType, password: share.password, expiresAt: share.expiresAt ? dayjs(share.expiresAt) : undefined, maxDownloads: share.maxDownloads, isEnabled: share.isEnabled }); }, [editShareForm]);
    const handleEditSubmit = useCallback(async (values: any) => {
        if (!state.editingShare) return;
        try { await api.update(state.editingShare.id, { ...values, expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined }); message.success('更新分享成功'); set({ editShareVisible: false, editingShare: null }); editShareForm.resetFields(); fetchData(); }
        catch { message.error('更新分享失败'); }
    }, [state.editingShare, message, editShareForm, fetchData]);

    const handleDelete = useCallback(async (share: FileShare) => {
        try { await api.delete(share.id); message.success('删除分享成功'); fetchData(); }
        catch { message.error('删除分享失败'); }
    }, [message, fetchData]);

    const handleToggle = useCallback(async (share: FileShare) => {
        try { await api.toggle(share.id, !share.isEnabled); message.success(`${share.isEnabled ? '禁用' : '启用'}分享成功`); fetchData(); }
        catch { message.error(`${share.isEnabled ? '禁用' : '启用'}分享失败`); }
    }, [message, fetchData]);

    const handleCopyLink = useCallback(async (share: FileShare) => {
        const url = `${window.location.origin}/share/${share.shareToken}`;
        try { await navigator.clipboard.writeText(url); message.success('分享链接已复制到剪贴板'); }
        catch { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); message.success('分享链接已复制到剪贴板'); }
    }, [message]);

    const handleNotify = useCallback((share: FileShare) => { set({ notifyingShare: share, notifyVisible: true }); }, []);
    const handleNotifySubmit = useCallback(async (values: any) => {
        if (!state.notifyingShare) return;
        try { await api.notify({ shareId: state.notifyingShare.id, userIds: values.userIds, message: values.message }); message.success('发送通知成功'); set({ notifyVisible: false, notifyingShare: null }); notifyForm.resetFields(); }
        catch { message.error('发送通知失败'); }
    }, [state.notifyingShare, message, notifyForm]);

    const getShareStatusTag = (share: FileShare) => {
        if (!share.isEnabled) return <Tag color="default">已禁用</Tag>;
        if (share.expiresAt && dayjs(share.expiresAt).isBefore(dayjs())) return <Tag color="red">已过期</Tag>;
        if (share.maxDownloads && share.downloadCount >= share.maxDownloads) return <Tag color="orange">下载已满</Tag>;
        return <Tag color="green">有效</Tag>;
    };

    const getAccessTypeTag = (accessType: string) => {
        const m: Record<string, { color: string; text: string }> = { view: { color: 'blue', text: '查看' }, download: { color: 'green', text: '下载' }, edit: { color: 'orange', text: '编辑' } };
        const c = m[accessType] || { color: 'default', text: accessType };
        return <Tag color={c.color}>{c.text}</Tag>;
    };

    const columns = [
        { title: '文件名', dataIndex: 'fileName', key: 'fileName', sorter: true, render: (text: string, r: FileShare) => (<Space><FileOutlined /><a onClick={() => handleView(r)} style={{ cursor: 'pointer' }}>{text}</a></Space>) },
        { title: '分享类型', dataIndex: 'shareType', key: 'shareType', sorter: true, render: (t: string) => <Tag color={t === 'internal' ? 'blue' : 'green'}>{t === 'internal' ? '内部' : '外部'}</Tag> },
        { title: '访问权限', dataIndex: 'accessType', key: 'accessType', sorter: true, render: (t: string) => getAccessTypeTag(t) },
        { title: '状态', key: 'status', render: (_: any, r: FileShare) => getShareStatusTag(r) },
        { title: '访问次数', dataIndex: 'accessCount', key: 'accessCount', sorter: true },
        { title: '下载次数', dataIndex: 'downloadCount', key: 'downloadCount', sorter: true },
        { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', sorter: true, render: (t: string) => formatDateTime(t) },
        { title: '操作', key: 'action', fixed: 'right' as const, render: (_: any, r: FileShare) => (<Space>
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopyLink(r)}>复制链接</Button>
            {state.activeTab === 'my-shares' && (<>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
                <Button type="link" size="small" icon={r.isEnabled ? <LockOutlined /> : <UnlockOutlined />} onClick={() => handleToggle(r)}>{r.isEnabled ? '禁用' : '启用'}</Button>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: '确认删除', content: `确定要删除分享 "${r.fileName}" 吗？`, onOk: () => handleDelete(r), okButtonProps: { danger: true } })}>删除</Button>
            </>)}
        </Space>) },
    ];

    return (
        <PageContainer title={<Space><ShareAltOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.shared.title' })}</Space>}
            extra={<Space wrap><Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button></Space>}>
            <SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} />
            <Card className={styles.card}>
                <Tabs activeKey={state.activeTab} onChange={handleTabChange} items={[
                    { key: 'my-shares', label: '我的分享', children: <Table<FileShare> dataSource={state.data} columns={columns} rowKey="id" loading={state.loading} scroll={{ x: 'max-content' }} onChange={handleTableChange} pagination={{ current: state.pagination.page, total: state.pagination.total }} /> },
                    { key: 'shared-with-me', label: '分享给我的', children: <Table<FileShare> dataSource={state.data} columns={columns.filter(c => c.key !== 'action')} rowKey="id" loading={state.loading} scroll={{ x: 'max-content' }} onChange={handleTableChange} pagination={{ current: state.pagination.page, total: state.pagination.total }} /> },
                ]} />
            </Card>

            {/* 详情 */}
            <Drawer title="分享详情" placement="right" onClose={() => set({ detailVisible: false })} open={state.detailVisible} size={isMobile ? 'default' : 'large'}>
                <Spin spinning={!state.viewingShare}>
                    {state.viewingShare && (<>
                        <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
                            <Descriptions column={isMobile ? 1 : 2} size="small">
                                <Descriptions.Item label={<Space><FileOutlined />文件名</Space>} span={2}>{state.viewingShare.fileName}</Descriptions.Item>
                                <Descriptions.Item label={<Space><ShareAltOutlined />分享类型</Space>}><Tag color={state.viewingShare.shareType === 'internal' ? 'blue' : 'green'}>{state.viewingShare.shareType === 'internal' ? '内部分享' : '外部分享'}</Tag></Descriptions.Item>
                                <Descriptions.Item label={<Space><UserOutlined />访问权限</Space>}>{getAccessTypeTag(state.viewingShare.accessType)}</Descriptions.Item>
                                <Descriptions.Item label={<Space><LinkOutlined />分享链接</Space>} span={2}><Space><code>{`${window.location.origin}/share/${state.viewingShare.shareToken}`}</code><Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopyLink(state.viewingShare!)}>复制</Button></Space></Descriptions.Item>
                                <Descriptions.Item label={<Space><CalendarOutlined />创建时间</Space>}>{formatDateTime(state.viewingShare.createdAt)}</Descriptions.Item>
                                <Descriptions.Item label={<Space><UserOutlined />创建者</Space>}>{state.viewingShare.createdByName}</Descriptions.Item>
                                {state.viewingShare.expiresAt && <Descriptions.Item label={<Space><ClockCircleOutlined />过期时间</Space>}>{formatDateTime(state.viewingShare.expiresAt)}</Descriptions.Item>}
                                {state.viewingShare.maxDownloads && <Descriptions.Item label={<Space><DownloadOutlined />下载限制</Space>}>{state.viewingShare.downloadCount} / {state.viewingShare.maxDownloads}</Descriptions.Item>}
                            </Descriptions>
                        </Card>
                        <Card title="访问统计" className={styles.card} style={{ marginBottom: 16 }}>
                            <Row gutter={[12, 12]}>
                                <Col span={12}><StatCard title="访问次数" value={state.viewingShare.accessCount} icon={<EyeOutlined />} color="#1890ff" /></Col>
                                <Col span={12}><StatCard title="下载次数" value={state.viewingShare.downloadCount} icon={<DownloadOutlined />} color="#52c41a" /></Col>
                            </Row>
                        </Card>
                    </>)}
                </Spin>
            </Drawer>

            {/* 编辑 */}
            <Modal title="编辑分享" open={state.editShareVisible} onCancel={() => { set({ editShareVisible: false, editingShare: null }); editShareForm.resetFields(); }} footer={null} width={600}>
                <Form form={editShareForm} layout="vertical" onFinish={handleEditSubmit}>
                    <Form.Item name="accessType" label="访问权限" rules={[{ required: true, message: '请选择访问权限' }]}><Select placeholder="请选择访问权限"><Select.Option value="view">仅查看</Select.Option><Select.Option value="download">查看和下载</Select.Option><Select.Option value="edit">查看、下载和编辑</Select.Option></Select></Form.Item>
                    <Form.Item name="password" label="访问密码"><Input.Password placeholder="设置访问密码（可选）" /></Form.Item>
                    <Form.Item name="expiresAt" label="过期时间"><DatePicker showTime placeholder="设置过期时间（可选）" style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="maxDownloads" label="下载次数限制"><Input type="number" placeholder="设置最大下载次数（可选）" min={1} /></Form.Item>
                    <Form.Item name="isEnabled" label="启用状态" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">保存</Button><Button onClick={() => { set({ editShareVisible: false, editingShare: null }); editShareForm.resetFields(); }}>取消</Button></Space></Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default CloudStorageSharedPage;
