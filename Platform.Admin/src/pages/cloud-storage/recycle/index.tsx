import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { Grid, Table, Button, Tag, Space, Modal, Drawer, Row, Col, Card, Form, Input, Select, Descriptions, Spin, Popconfirm, DatePicker, Progress, Alert, App } from 'antd';
import { DeleteOutlined, ReloadOutlined, UndoOutlined, ClearOutlined, DownloadOutlined, FileOutlined, FolderOutlined, CalendarOutlined, UserOutlined, ClockCircleOutlined, CloudOutlined, WarningOutlined } from '@ant-design/icons';
import { formatDateTime } from '@/utils/format';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { request } from '@umijs/max';
import { ApiResponse, PagedResult, PageParams } from '@/types';

dayjs.extend(relativeTime);

// ==================== Types ====================
interface RecycleItem { id: string; name: string; originalPath?: string; size: number; isFolder: boolean; extension?: string; deletedAt: string; deletedByName?: string; daysUntilPermanentDelete: number; createdAt: string; createdByName?: string; description?: string; tags?: string[]; type?: string | number; }
interface RecycleStatistics { totalItems: number; totalSize: number; oldestItem?: string; newestItem?: string; }

// ==================== API ====================
const api = {
    list: (params: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortOrder?: string }) => request<ApiResponse<PagedResult<RecycleItem>>>('/api/cloud-storage/recycle/list', { params }),
    getDetail: (id: string) => request<ApiResponse<RecycleItem>>(`/api/cloud-storage/recycle/${id}`),
    restore: (data: { itemId: string; targetParentId?: string; newName?: string }) => request<ApiResponse<void>>('/api/cloud-storage/recycle/restore', { method: 'POST', data }),
    batchRestore: (data: { ids: string[] }) => request<ApiResponse<void>>('/api/cloud-storage/recycle/batch-restore', { method: 'POST', data }),
    permanentDelete: (id: string) => request<ApiResponse<void>>(`/api/cloud-storage/recycle/${id}/permanent`, { method: 'DELETE' }),
    batchPermanentDelete: (data: { ids: string[] }) => request<ApiResponse<void>>('/api/cloud-storage/recycle/batch-permanent-delete', { method: 'POST', data }),
    empty: () => request<ApiResponse<{ deletedCount: number; freedSpace: number }>>('/api/cloud-storage/recycle/empty', { method: 'POST' }),
    statistics: () => request<ApiResponse<RecycleStatistics>>('/api/cloud-storage/recycle/statistics'),
    autoCleanup: () => request<ApiResponse<{ deletedCount: number; freedSpace: number }>>('/api/cloud-storage/recycle/auto-cleanup', { method: 'POST' }),
    download: async (id: string, fileName: string) => {
        const response = await fetch(`/api/cloud-storage/recycle/${id}/download`);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    },
};

const CloudStorageRecyclePage: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const { styles } = useCommonStyles();

    const [state, setState] = useState({
        data: [] as RecycleItem[], loading: false,
        pagination: { page: 1, pageSize: 10, total: 0 },
        selectedRowKeys: [] as string[], selectedRows: [] as RecycleItem[],
        statistics: null as RecycleStatistics | null,
        detailVisible: false, viewingItem: null as RecycleItem | null,
        restoreVisible: false, restoringItem: null as RecycleItem | null,
        cleanupProgress: null as number | null,
    });

    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));
    const searchParamsRef = useRef<PageParams>({ search: '' });
    const [restoreForm] = Form.useForm();

    const fetchData = useCallback(async () => {
        const { page = 1, pageSize = 10, search, sortBy, sortOrder } = searchParamsRef.current;
        set({ loading: true });
        try {
            const res = await api.list({ page, pageSize, search, sortBy, sortOrder });
            if (res.success && res.data) {
                const list = (res.data.queryable || []).map((item: RecycleItem) => ({ ...item, isFolder: item.isFolder ?? (item.type === 'folder' || item.type === 'Folder' || item.type === 1) }));
                set({ data: list, pagination: { ...state.pagination, page, pageSize, total: res.data.rowCount ?? 0 } });
            } else { set({ data: [], pagination: { ...state.pagination, total: 0 } }); }
        } catch { set({ data: [], pagination: { ...state.pagination, total: 0 } }); }
        finally { set({ loading: false }); }
    }, [state.pagination]);

    const loadStatistics = useCallback(async () => {
        try { const res = await api.statistics(); if (res.success && res.data) set({ statistics: res.data }); } catch {}
    }, []);

    useEffect(() => { loadStatistics(); fetchData(); }, [loadStatistics, fetchData]);

    const handleRefresh = useCallback(() => { fetchData(); loadStatistics(); }, [fetchData, loadStatistics]);
    const handleSearch = useCallback((params: PageParams) => { searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 }; fetchData(); }, [fetchData]);
    const handleTableChange = useCallback((pag: any, _f: any, s: any) => { searchParamsRef.current = { ...searchParamsRef.current, page: pag.current, pageSize: pag.pageSize, sortBy: s?.field, sortOrder: s?.order === 'ascend' ? 'asc' : s?.order === 'descend' ? 'desc' : undefined }; fetchData(); }, [fetchData]);

    const formatFileSize = (bytes: number) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };

    const getFileIcon = (item: RecycleItem) => {
        if (item.isFolder) return <FolderOutlined style={{ color: '#1890ff' }} />;
        const ext = item.extension?.toLowerCase();
        if (ext === 'pdf') return <FileOutlined style={{ color: '#ff4d4f' }} />;
        if (['doc', 'docx'].includes(ext || '')) return <FileOutlined style={{ color: '#1890ff' }} />;
        if (['xls', 'xlsx'].includes(ext || '')) return <FileOutlined style={{ color: '#52c41a' }} />;
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <FileOutlined style={{ color: '#722ed1' }} />;
        return <FileOutlined />;
    };

    const getExpiryTag = (item: RecycleItem) => {
        if (item.daysUntilPermanentDelete <= 0) return <Tag color="red">已过期</Tag>;
        if (item.daysUntilPermanentDelete <= 7) return <Tag color="orange">即将过期 ({item.daysUntilPermanentDelete}天)</Tag>;
        return <Tag color="green">{item.daysUntilPermanentDelete}天后过期</Tag>;
    };

    const handleView = useCallback(async (item: RecycleItem) => {
        try { const res = await api.getDetail(item.id); if (res.success && res.data) set({ viewingItem: res.data, detailVisible: true }); }
        catch { message.error('获取文件详情失败'); }
    }, [message]);

    const handleDownload = useCallback(async (item: RecycleItem) => {
        try { await api.download(item.id, item.name); message.success('下载开始'); }
        catch { message.error('下载失败'); }
    }, [message]);

    const handleRestore = useCallback((item: RecycleItem) => { set({ restoringItem: item, restoreVisible: true }); restoreForm.setFieldsValue({ newName: item.name }); }, [restoreForm]);

    const handleRestoreSubmit = useCallback(async (values: any) => {
        if (!state.restoringItem) return;
        try { await api.restore({ itemId: state.restoringItem.id, targetParentId: values.targetParentId, newName: values.newName !== state.restoringItem.name ? values.newName : undefined }); message.success('恢复成功'); set({ restoreVisible: false, restoringItem: null }); restoreForm.resetFields(); fetchData(); loadStatistics(); }
        catch { message.error('恢复失败'); }
    }, [state.restoringItem, message, restoreForm, fetchData, loadStatistics]);

    const handlePermanentDelete = useCallback(async (item: RecycleItem) => {
        try { await api.permanentDelete(item.id); message.success('永久删除成功'); fetchData(); loadStatistics(); }
        catch { message.error('永久删除失败'); }
    }, [message, fetchData, loadStatistics]);

    const handleBatchRestore = useCallback(() => {
        if (state.selectedRowKeys.length === 0) { message.error('请选择要恢复的文件'); return; }
        modal.confirm({ title: '确认恢复', content: `确定要恢复选中的 ${state.selectedRowKeys.length} 个文件吗？`, onOk: async () => {
            try { await api.batchRestore({ ids: state.selectedRowKeys }); message.success('批量恢复成功'); set({ selectedRowKeys: [], selectedRows: [] }); fetchData(); loadStatistics(); }
            catch { message.error('批量恢复失败'); }
        }});
    }, [state.selectedRowKeys, modal, message, fetchData, loadStatistics]);

    const handleBatchPermanentDelete = useCallback(() => {
        if (state.selectedRowKeys.length === 0) { message.error('请选择要永久删除的文件'); return; }
        modal.confirm({ title: '确认永久删除', content: <div><p>确定要永久删除选中的 {state.selectedRowKeys.length} 个文件吗？</p><Alert message="警告：永久删除后无法恢复！" type="warning" showIcon style={{ marginTop: 8 }} /></div>, onOk: async () => {
            try { await api.batchPermanentDelete({ ids: state.selectedRowKeys }); message.success('批量永久删除成功'); set({ selectedRowKeys: [], selectedRows: [] }); fetchData(); loadStatistics(); }
            catch { message.error('批量永久删除失败'); }
        }});
    }, [state.selectedRowKeys, modal, message, fetchData, loadStatistics]);

    const handleEmptyRecycleBin = useCallback(async () => {
        try { set({ cleanupProgress: 0 }); const res = await api.empty(); if (res.success && res.data) message.success(`清空回收站成功，删除了 ${res.data.deletedCount} 个文件，释放了 ${formatFileSize(res.data.freedSpace)} 空间`); set({ cleanupProgress: null }); fetchData(); loadStatistics(); }
        catch { message.error('清空回收站失败'); set({ cleanupProgress: null }); }
    }, [message, fetchData, loadStatistics]);

    const handleAutoCleanup = useCallback(async () => {
        modal.confirm({ title: '确认自动清理', content: '确定要清理所有过期的文件吗？过期文件将被永久删除。', onOk: async () => {
            try { const res = await api.autoCleanup(); if (res.success && res.data) message.success(`自动清理完成，删除了 ${res.data.deletedCount} 个过期文件，释放了 ${formatFileSize(res.data.freedSpace)} 空间`); fetchData(); loadStatistics(); }
            catch { message.error('自动清理失败'); }
        }});
    }, [modal, message, fetchData, loadStatistics]);

    const columns = [
        { title: '名称', dataIndex: 'name', key: 'name', sorter: true, render: (text: string, record: RecycleItem) => (<Space>{getFileIcon(record)}<a onClick={() => handleView(record)} style={{ cursor: 'pointer' }}>{text}</a></Space>) },
        { title: '原路径', dataIndex: 'originalPath', key: 'originalPath', sorter: true },
        { title: '大小', dataIndex: 'size', key: 'size', sorter: true, render: (size: number, r: RecycleItem) => r.isFolder ? '-' : formatFileSize(size) },
        { title: '删除时间', dataIndex: 'deletedAt', key: 'deletedAt', sorter: true, render: (t: string) => formatDateTime(t) },
        { title: '删除者', dataIndex: 'deletedByName', key: 'deletedByName', sorter: true },
        { title: '过期状态', key: 'expiry', render: (_: any, r: RecycleItem) => getExpiryTag(r) },
        { title: '操作', key: 'action', fixed: 'right' as const, render: (_: any, r: RecycleItem) => (<Space>
            <Button type="link" size="small" icon={<UndoOutlined />} onClick={() => handleRestore(r)}>恢复</Button>
            {!r.isFolder && <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r)}>下载</Button>}
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: '确认永久删除', content: <div><p>确定要永久删除 "{r.name}" 吗？</p><div className="ant-alert ant-alert-warning ant-alert-with-description"><div className="ant-alert-content"><div className="ant-alert-message">警告：永久删除后无法恢复！</div></div></div></div>, onOk: () => handlePermanentDelete(r), okButtonProps: { danger: true } })}>永久删除</Button>
        </Space>) },
    ];

    return (
        <PageContainer title={<Space><DeleteOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.recycle.title' })}</Space>}
            extra={<Space wrap>
                {state.selectedRowKeys.length > 0 && (<>
                    <Button key="batch-restore" icon={<UndoOutlined />} onClick={handleBatchRestore}>{intl.formatMessage({ id: 'pages.cloud-storage.recycle.action.batchRestore' })} ({state.selectedRowKeys.length})</Button>
                    <Button key="batch-delete" danger icon={<DeleteOutlined />} onClick={handleBatchPermanentDelete}>{intl.formatMessage({ id: 'pages.cloud-storage.recycle.action.batchDelete' })} ({state.selectedRowKeys.length})</Button>
                </>)}
                <Button key="auto-cleanup" icon={<ClearOutlined />} onClick={handleAutoCleanup}>{intl.formatMessage({ id: 'pages.cloud-storage.recycle.action.autoCleanup' })}</Button>
                <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button>
                <Button key="empty" danger type="primary" icon={<ClearOutlined />} onClick={() => modal.confirm({ title: '确认清空回收站', content: <div><p>确定要清空整个回收站吗？</p><div style={{ color: '#ff4d4f' }}>警告：此操作将永久删除所有文件，无法恢复！</div></div>, onOk: handleEmptyRecycleBin, okButtonProps: { danger: true } })}>清空回收站</Button>
            </Space>}>
            {state.statistics && (<Card className={styles.card} style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={6}><div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}><FileOutlined style={{ fontSize: 20, color: '#ff4d4f', marginRight: 12 }} /><div style={{ textAlign: 'right', flex: 1 }}><div style={{ fontSize: 20, fontWeight: 'bold' }}>{state.statistics.totalItems}</div><div style={{ fontSize: 12, color: '#666' }}>回收站项目</div></div></div></Col>
                <Col xs={24} sm={12} md={6}><div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}><CloudOutlined style={{ fontSize: 20, color: '#722ed1', marginRight: 12 }} /><div style={{ textAlign: 'right', flex: 1 }}><div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatFileSize(state.statistics.totalSize)}</div><div style={{ fontSize: 12, color: '#666' }}>占用空间</div></div></div></Col>
                <Col xs={24} sm={12} md={6}><div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}><CalendarOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: 12 }} /><div style={{ textAlign: 'right', flex: 1 }}><div style={{ fontSize: 20, fontWeight: 'bold' }}>{state.statistics.oldestItem ? dayjs(state.statistics.oldestItem).fromNow() : '-'}</div><div style={{ fontSize: 12, color: '#666' }}>最早删除</div></div></div></Col>
                <Col xs={24} sm={12} md={6}><div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}><WarningOutlined style={{ fontSize: 20, color: '#fa8c16', marginRight: 12 }} /><div style={{ textAlign: 'right', flex: 1 }}><div style={{ fontSize: 20, fontWeight: 'bold' }}>{state.statistics.newestItem ? dayjs(state.statistics.newestItem).fromNow() : '-'}</div><div style={{ fontSize: 12, color: '#666' }}>最近删除</div></div></div></Col>
            </Row></Card>)}

            <SearchBar initialParams={searchParamsRef.current} onSearch={handleSearch} style={{ marginBottom: 16 }} />

            {state.cleanupProgress !== null && (<Card className={styles.card} style={{ marginBottom: 16 }}><Alert message="正在清空回收站..." description={<Progress percent={state.cleanupProgress} status="active" strokeColor="#1890ff" />} type="info" showIcon /></Card>)}

            <Table<RecycleItem> dataSource={state.data} columns={columns} rowKey="id" loading={state.loading} scroll={{ x: 'max-content' }} onChange={handleTableChange} pagination={{ current: state.pagination.page, pageSize: state.pagination.pageSize, total: state.pagination.total }} rowSelection={{ selectedRowKeys: state.selectedRowKeys, onChange: (keys, rows) => set({ selectedRowKeys: keys as string[], selectedRows: rows }) }} />

            {/* 详情 */}
            <Drawer title="文件详情" placement="right" onClose={() => set({ detailVisible: false })} open={state.detailVisible} size={isMobile ? 'large' : 600}>
                <Spin spinning={!state.viewingItem}>
                    {state.viewingItem && (<>
                        <Card title="基本信息" className={styles.card} style={{ marginBottom: 16 }}>
                            <Descriptions column={isMobile ? 1 : 2} size="small">
                                <Descriptions.Item label={<Space><FileOutlined />名称</Space>} span={2}>{state.viewingItem.name}</Descriptions.Item>
                                <Descriptions.Item label={<Space><FolderOutlined />原路径</Space>} span={2}>{state.viewingItem.originalPath}</Descriptions.Item>
                                <Descriptions.Item label={<Space><CloudOutlined />大小</Space>}>{state.viewingItem.isFolder ? '-' : formatFileSize(state.viewingItem.size)}</Descriptions.Item>
                                <Descriptions.Item label={<Space><CalendarOutlined />删除时间</Space>}>{formatDateTime(state.viewingItem.deletedAt)}</Descriptions.Item>
                                <Descriptions.Item label={<Space><UserOutlined />删除者</Space>}>{state.viewingItem.deletedByName}</Descriptions.Item>
                                <Descriptions.Item label={<Space><ClockCircleOutlined />过期状态</Space>}>{getExpiryTag(state.viewingItem)}</Descriptions.Item>
                                <Descriptions.Item label={<Space><CalendarOutlined />创建时间</Space>}>{formatDateTime(state.viewingItem.createdAt)}</Descriptions.Item>
                                <Descriptions.Item label={<Space><UserOutlined />创建者</Space>}>{state.viewingItem.createdByName}</Descriptions.Item>
                            </Descriptions>
                        </Card>
                        {state.viewingItem.description && <Card title="描述" style={{ marginBottom: 16 }}><p>{state.viewingItem.description}</p></Card>}
                        {state.viewingItem.tags && state.viewingItem.tags.length > 0 && <Card title="标签" style={{ marginBottom: 16 }}><Space wrap>{state.viewingItem.tags.map((tag, i) => <Tag key={i}>{tag}</Tag>)}</Space></Card>}
                    </>)}
                </Spin>
            </Drawer>

            {/* 恢复 */}
            <Modal title="恢复文件" open={state.restoreVisible} onCancel={() => { set({ restoreVisible: false, restoringItem: null }); restoreForm.resetFields(); }} footer={null}>
                <Form form={restoreForm} layout="vertical" onFinish={handleRestoreSubmit}>
                    <Form.Item name="newName" label="文件名" rules={[{ required: true, message: '请输入文件名' }, { max: 100, message: '文件名不能超过100个字符' }]}><Input placeholder="请输入文件名" /></Form.Item>
                    <Form.Item name="targetParentId" label="恢复到"><Select placeholder="选择恢复位置（默认为原位置）" allowClear /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">恢复</Button><Button onClick={() => { set({ restoreVisible: false, restoringItem: null }); restoreForm.resetFields(); }}>取消</Button></Space></Form.Item>
                </Form>
            </Modal>
        </PageContainer>
    );
};

export default CloudStorageRecyclePage;
