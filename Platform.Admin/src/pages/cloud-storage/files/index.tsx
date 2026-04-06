/**
 * CloudStorageFilesPage - 云存储文件管理页面
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer, StatCard } from '@/components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { Grid, App, Drawer, Descriptions, Button, Tag, Space, Row, Col, Card, Breadcrumb, Dropdown, Image, Select, Input, Modal, Popconfirm, Progress } from 'antd';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormDatePicker, ProFormSelect, ProFormDigit } from '@ant-design/pro-form';
import { tokenUtils } from '@/utils/token';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CloudOutlined, FolderOutlined, FileOutlined, DownloadOutlined, ShareAltOutlined, UploadOutlined, FolderAddOutlined, MoreOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult, PageParams } from '@/types';

// ==================== Types ====================
interface FileItem { id: string; name: string; parentId?: string; isFolder: boolean; size?: number; mimeType?: string; createdByName?: string; createdAt: string; updatedAt: string; }
interface StorageStatistics { totalFiles: number; totalFolders: number; totalSize: number; usedQuota: number; totalQuota: number; fileTypeStats: { type: string; count: number; size: number }[]; }
interface FileVersion { id: string; fileId: string; version: number; versionNumber?: number; size: number; createdByName: string; createdAt: string; comment?: string; }
interface AppUser { id: string; name: string; username: string; email?: string; }
interface PathHistoryItem { id?: string; name: string; path: string; }

// ==================== API ====================
const api = {
    list: (params: PageParams & { parentId?: string }) => request<ApiResponse<PagedResult<FileItem>>>('/api/cloud-storage/files/list', { params }),
    search: (params: PageParams & { keyword: string }) => request<ApiResponse<PagedResult<FileItem>>>('/api/cloud-storage/files/search', { params }),
    get: (id: string) => request<ApiResponse<FileItem>>(`/api/cloud-storage/files/${id}`),
    delete: (id: string) => request<ApiResponse<void>>(`/api/cloud-storage/files/${id}`, { method: 'DELETE' }),
    batchDelete: (ids: string[]) => request<ApiResponse<void>>('/api/cloud-storage/files/batch-delete', { method: 'POST', data: { ids } }),
    createFolder: (data: { name: string; parentId?: string }) => request<ApiResponse<FileItem>>('/api/cloud-storage/folders', { method: 'POST', data }),
    rename: (id: string, data: { name: string }) => request<ApiResponse<FileItem>>(`/api/cloud-storage/files/${id}/rename`, { method: 'PUT', data }),
    statistics: () => request<ApiResponse<StorageStatistics>>('/api/cloud-storage/statistics'),
    versions: (fileId: string, page: number, pageSize: number) => request<ApiResponse<PagedResult<FileVersion>>>('/api/cloud-storage/files/versions', { params: { fileId, page, pageSize } }),
    restoreVersion: (versionId: string) => request<ApiResponse<void>>('/api/cloud-storage/files/versions/restore', { method: 'POST', data: { versionId } }),
    share: (data: { fileId: string; shareType: string; expiresAt?: string; maxDownloads?: number; allowedUserIds?: string[] }) => request<ApiResponse<any>>('/api/cloud-storage/share', { method: 'POST', data }),
    users: () => request<ApiResponse<AppUser[]>>('/api/users/all'),
};

// ==================== Utils ====================
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (record: FileItem): React.ReactNode => {
    if (record.isFolder) return <FolderOutlined style={{ color: '#faad14' }} />;
    const ext = record.name?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return <FileOutlined style={{ color: '#1890ff' }} />;
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt'].includes(ext)) return <FileOutlined style={{ color: '#52c41a' }} />;
    if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'java'].includes(ext)) return <FileOutlined style={{ color: '#722ed1' }} />;
    return <FileOutlined />;
};

const isImageFile = (mimeType: string): boolean => mimeType.startsWith('image/');
const isOfficeFile = (mimeType: string, fileName?: string): boolean => {
    const mt = mimeType?.toLowerCase() || '';
    return mt.includes('word') || mt.includes('excel') || mt.includes('powerpoint') || mt.includes('officedocument') || !!fileName?.match(/\.(docx?|xlsx?|pptx?)$/i);
};

// ==================== Main ====================
const CloudStorageFilesPage: React.FC = () => {
    const intl = useIntl();
    const { message } = App.useApp();
    const actionRef = useRef<ActionType>(null!);
    const currentParentIdRef = useRef<string | undefined>(undefined);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const [state, setState] = useState({
        data: [] as FileItem[], loading: false,
        statistics: null as StorageStatistics | null,
        currentPath: '', currentParentId: undefined as string | undefined,
        pathHistory: [{ name: '我的文件', path: '' }] as PathHistoryItem[],
        selectedRowKeys: [] as string[], selectedRows: [] as FileItem[],
        isSearchMode: false, searchText: '',
        sorter: undefined as { sortBy: string; sortOrder: string } | undefined,
        detailVisible: false, viewingFile: null as FileItem | null,
        previewVisible: false, imagePreviewVisible: false,
        previewUrl: '', previewLoading: false,
        officeContent: null as { type: string; content: string } | null,
        markdownContent: null as string | null,
        versionList: [] as FileVersion[], versionLoading: false,
        createFolderVisible: false, renameVisible: false, renamingFile: null as FileItem | null,
        shareVisible: false, sharingFile: null as FileItem | null,
        uploadVisible: false, uploadType: 'file' as 'file' | 'folder',
        uploadProgress: {} as Record<string, { percent: number; label: string }>,
        userOptions: [] as AppUser[], userLoading: false,
    });

    const set = (partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial }));

    useEffect(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);

    const fetchData = useCallback(async (params: any) => {
        const { current, pageSize } = params;
        const sortParams = state.sorter?.sortBy && state.sorter?.sortOrder ? state.sorter : undefined;
        const res = state.isSearchMode && state.searchText
            ? await api.search({ page: current, pageSize, keyword: state.searchText, ...sortParams })
            : await api.list({ page: current, pageSize, parentId: currentParentIdRef.current, ...sortParams });
        if (res.success && res.data) {
            set({ data: res.data.queryable || [] });
            api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: res.success };
        }
        return { data: [], total: 0, success: false };
    }, [state.isSearchMode, state.searchText, state.sorter]);

    const handleFolderClick = useCallback((folder: FileItem) => {
        const newPath = state.currentPath ? `${state.currentPath}/${folder.name}` : folder.name;
        currentParentIdRef.current = folder.id;
        set({ currentPath: newPath, currentParentId: folder.id, pathHistory: [...state.pathHistory, { id: folder.id, name: folder.name, path: newPath }], isSearchMode: false, searchText: '' });
        actionRef.current?.reload();
    }, [state.currentPath, state.pathHistory]);

    const handleBreadcrumbClick = useCallback((index: number) => {
        const targetItem = state.pathHistory[index];
        currentParentIdRef.current = targetItem.id ?? undefined;
        set({ currentPath: targetItem.path, currentParentId: targetItem.id, pathHistory: state.pathHistory.slice(0, index + 1), isSearchMode: false, searchText: '' });
        actionRef.current?.reload();
    }, [state.pathHistory]);

    const handleView = useCallback(async (file: FileItem) => {
        try {
            if (state.previewUrl?.startsWith('blob:')) { URL.revokeObjectURL(state.previewUrl); set({ previewUrl: '' }); }
            const response = await api.get(file.id);
            if (response.success && response.data) {
                if (!response.data.isFolder) {
                    set({ versionLoading: true });
                    try {
                        const vr = await api.versions(response.data.id, 1, 50);
                        set({ versionList: vr.success && vr.data ? vr.data.queryable || [] : [] });
                    } catch { set({ versionList: [] }); }
                    finally { set({ versionLoading: false }); }
                } else { set({ versionList: [] }); }
                set({ viewingFile: response.data, detailVisible: true });
                if (!response.data.isFolder) {
                    set({ previewLoading: true });
                    try {
                        const token = tokenUtils.getToken();
                        const dl = await fetch(`/api/cloud-storage/files/${file.id}/download`, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (!dl.ok) throw new Error('Failed');
                        const blob = await dl.blob();
                        set({ previewUrl: URL.createObjectURL(blob) });
                        const mimeType = response.data.mimeType?.toLowerCase() || '';
                        const fileName = response.data.name?.toLowerCase() || '';
                        if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || fileName.match(/\.xlsx?$/)) {
                            try { const XLSX = await import('xlsx'); const ab = await blob.arrayBuffer(); set({ officeContent: { type: 'excel', content: XLSX.utils.sheet_to_html(XLSX.read(ab, { type: 'array' }).Sheets[XLSX.read(ab, { type: 'array' }).SheetNames[0]]) } }); } catch {}
                        } else if ((mimeType.includes('word') || mimeType.includes('document')) && fileName.endsWith('.docx')) {
                            try { const mammoth = (await import('mammoth')).default; const ab = await blob.arrayBuffer(); set({ officeContent: { type: 'word', content: (await mammoth.convertToHtml({ arrayBuffer: ab })).value } }); } catch {}
                        } else if (mimeType.includes('markdown') || fileName.endsWith('.md')) {
                            try { const { marked } = await import('marked'); set({ markdownContent: await marked.parse(await blob.text()) }); } catch {}
                        }
                    } catch { set({ previewUrl: '', officeContent: null }); }
                    finally { set({ previewLoading: false }); }
                }
            }
        } catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.detailFailed' })); }
    }, [message, intl, state.previewUrl]);

    const handleDownload = useCallback(async (file: FileItem) => {
        try {
            const token = tokenUtils.getToken();
            const response = await fetch(`/api/cloud-storage/files/${file.id}/download`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = file.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.downloadStarted' }));
        } catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.downloadFailed' })); }
    }, [message, intl]);

    const handleDelete = useCallback(async (file: FileItem) => {
        try { await api.delete(file.id); message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.deleteSuccess' })); actionRef.current?.reload(); }
        catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.deleteFailed' })); }
    }, [message, intl]);

    const handleBatchDelete = useCallback(() => {
        if (state.selectedRowKeys.length === 0) { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.selectFilesToDelete' })); return; }
        Modal.confirm({ title: '确认删除', content: `确定要删除选中的 ${state.selectedRowKeys.length} 个文件吗？`, onOk: async () => {
            try { await api.batchDelete(state.selectedRowKeys); message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.batchDeleteSuccess' })); set({ selectedRowKeys: [], selectedRows: [] }); actionRef.current?.reload(); }
            catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.batchDeleteFailed' })); }
        }});
    }, [state.selectedRowKeys, message, intl]);

    const loadUsers = useCallback(async () => {
        set({ userLoading: true });
        try { const resp = await api.users(); if (resp.success && resp.data) set({ userOptions: resp.data }); }
        catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.loadUsersFailed' })); }
        finally { set({ userLoading: false }); }
    }, [message, intl]);

    const handleShareSubmit = useCallback(async (values: any) => {
        if (!state.sharingFile) return false;
        try {
            await api.share({ fileId: state.sharingFile.id, shareType: values.shareType, expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined, maxDownloads: values.maxDownloads ? Number(values.maxDownloads) : undefined, allowedUserIds: values.shareType === 'internal' ? values.allowedUserIds || [] : undefined });
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.shareSuccess' }));
            set({ shareVisible: false, sharingFile: null }); return true;
        } catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.shareFailed' })); return false; }
    }, [state.sharingFile, message, intl]);

    useEffect(() => { if (state.shareVisible) loadUsers(); }, [state.shareVisible, loadUsers]);

    const handlePreview = useCallback(() => {
        const mimeType = state.viewingFile?.mimeType?.toLowerCase() || '';
        set({ [isImageFile(mimeType) ? 'imagePreviewVisible' : 'previewVisible']: true });
    }, [state.viewingFile]);

    const columns: ProColumns<FileItem>[] = [
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.name' }), dataIndex: 'name', key: 'name', sorter: true, render: (dom: any, record) => (<Space>{getFileIcon(record)}<a onClick={() => record.isFolder ? handleFolderClick(record) : handleView(record)} style={{ cursor: 'pointer' }}>{dom}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.size' }), dataIndex: 'size', key: 'size', sorter: true, render: (_: any, r) => r.isFolder ? '-' : formatFileSize(r.size || 0) },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.updatedAt' }), dataIndex: 'updatedAt', key: 'updatedAt', sorter: true, render: (dom: any) => dom ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.creator' }), dataIndex: 'createdByName', key: 'createdByName' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.action' }), key: 'action', fixed: 'right', render: (_: any, record) => (<Space>
            <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => set({ sharingFile: record, shareVisible: true })}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.share' })}</Button>
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.download' })}</Button>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ renamingFile: record, renameVisible: true })}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.rename' })}</Button>
            <Popconfirm title={intl.formatMessage({ id: 'pages.cloud-storage.files.confirmDelete.title' })} onConfirm={() => handleDelete(record)} okButtonProps={{ danger: true }}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.delete' })}</Button>
            </Popconfirm>
        </Space>) },
    ];

    const statsConfig = [
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.fileCount' }), value: state.statistics?.totalFiles ?? 0, icon: <FileOutlined />, color: '#1890ff' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.folderCount' }), value: state.statistics?.totalFolders ?? 0, icon: <FolderOutlined />, color: '#52c41a' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.totalQuota' }), value: formatFileSize(state.statistics?.totalQuota ?? 0), icon: <CloudOutlined />, color: '#722ed1' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.usedSpace' }), value: state.statistics && state.statistics.totalQuota > 0 ? `${Math.round((state.statistics.usedQuota / state.statistics.totalQuota) * 100)}%` : '0%', icon: null, color: '#fa8c16', suffix: <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>/ {formatFileSize(state.statistics?.totalQuota ?? 0)}</span> },
    ];

    return (
        <PageContainer title={<Space><CloudOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.title' })}</Space>}
            extra={<Space wrap>
                {state.selectedRowKeys.length > 0 && <Button key="batch-delete" danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.batchDelete' })} ({state.selectedRowKeys.length})</Button>}
                <Button key="refresh" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>{intl.formatMessage({ id: 'pages.button.refresh' })}</Button>
                <Button key="create-folder" icon={<FolderAddOutlined />} onClick={() => set({ createFolderVisible: true })}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.newFolder' })}</Button>
                <Dropdown menu={{ items: [
                    { key: 'file', label: intl.formatMessage({ id: 'pages.cloud-storage.files.action.uploadFile' }), icon: <FileOutlined />, onClick: () => set({ uploadType: 'file', uploadVisible: true }) },
                    { key: 'folder', label: intl.formatMessage({ id: 'pages.cloud-storage.files.action.uploadFolder' }), icon: <FolderOutlined />, onClick: () => set({ uploadType: 'folder', uploadVisible: true }) },
                ]}}>
                    <Button key="upload" type="primary" icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.cloud-storage.files.action.upload' })} <MoreOutlined style={{ fontSize: 12 }} /></Button>
                </Dropdown>
            </Space>}>
            {state.statistics && <Card style={{ marginBottom: 16 }}><Row gutter={[12, 12]}>{statsConfig.map((stat, idx) => (<Col xs={24} sm={12} md={6} key={idx}><StatCard title={stat.title} value={stat.value ?? 0} icon={stat.icon} color={stat.color} suffix={stat.suffix} /></Col>))}</Row></Card>}
            <Card style={{ marginBottom: 16 }}><Breadcrumb items={state.pathHistory.map((item, index) => ({ key: index, title: index === 0 ? <a onClick={() => handleBreadcrumbClick(index)}>{intl.formatMessage({ id: 'pages.cloud-storage.files.breadcrumb.myFiles' })}</a> : <a onClick={() => handleBreadcrumbClick(index)}>{item.name}</a> }))} /></Card>
            <ProTable actionRef={actionRef} request={fetchData} columns={columns} rowKey="id" search={false}
                onChange={(_p, _f, s: any) => set({ sorter: s?.order ? { sortBy: s.field, sortOrder: s.order === 'ascend' ? 'asc' : 'desc' } : undefined })}
                toolBarRender={() => [<Input.Search key="search" placeholder="搜索..." style={{ width: 200 }} allowClear value={state.searchText} onChange={(e) => set({ searchText: e.target.value })} onSearch={(v) => { set({ searchText: v, isSearchMode: !!v }); actionRef.current?.reload(); }} />]}
                rowSelection={{ selectedRowKeys: state.selectedRowKeys, onChange: (keys, rows) => set({ selectedRowKeys: keys as string[], selectedRows: rows }) }} />

            {/* 创建文件夹 */}
            <ModalForm key="create-folder" title={intl.formatMessage({ id: 'pages.cloud-storage.files.action.newFolder' })} open={state.createFolderVisible} onOpenChange={(open) => { if (!open) set({ createFolderVisible: false }); }}
                onFinish={async (values) => { try { await api.createFolder({ name: values.name, parentId: currentParentIdRef.current }); message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.createFolderSuccess' })); set({ createFolderVisible: false }); actionRef.current?.reload(); return true; } catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.createFolderFailed' })); return false; } }} autoFocusFirstInput width={400}>
                <ProFormText name="name" label="文件夹名称" placeholder="请输入文件夹名称" rules={[{ required: true, message: '请输入文件夹名称' }]} />
            </ModalForm>

            {/* 重命名 */}
            <ModalForm key={state.renamingFile?.id || 'rename'} title={intl.formatMessage({ id: 'pages.cloud-storage.files.action.rename' })} open={state.renameVisible} onOpenChange={(open) => { if (!open) set({ renameVisible: false, renamingFile: null }); }}
                initialValues={state.renamingFile ? { name: state.renamingFile.name } : undefined}
                onFinish={async (values) => { if (!state.renamingFile) return false; try { await api.rename(state.renamingFile.id, { name: values.name }); message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.renameSuccess' })); set({ renameVisible: false, renamingFile: null }); actionRef.current?.reload(); return true; } catch { message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.renameFailed' })); return false; } }} autoFocusFirstInput width={400}>
                <ProFormText name="name" label="新名称" placeholder="请输入新名称" rules={[{ required: true, message: '请输入新名称' }]} />
            </ModalForm>

            {/* 分享 */}
            <ModalForm key={state.sharingFile?.id || 'share'} title={intl.formatMessage({ id: 'pages.cloud-storage.files.action.share' })} open={state.shareVisible} onOpenChange={(open) => { if (!open) set({ shareVisible: false, sharingFile: null }); }}
                onFinish={handleShareSubmit} autoFocusFirstInput width={500}>
                <ProFormSelect name="shareType" label="分享方式" rules={[{ required: true, message: '请选择分享方式' }]} options={[{ label: '公开链接', value: 'public' }, { label: '内部分享给指定用户', value: 'internal' }]} />
                <ProFormDatePicker name="expiresAt" label="过期时间" />
                <ProFormDigit name="maxDownloads" label="下载次数限制" min={1} />
                {state.userOptions.length > 0 && <ProFormSelect name="allowedUserIds" label="选择用户" mode="multiple" options={state.userOptions.map(u => ({ label: u.name, value: u.id }))} />}
            </ModalForm>

            {/* 文件详情 */}
            {state.detailVisible && state.viewingFile && (
                <Drawer title={state.viewingFile.name} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingFile: null, previewUrl: '', officeContent: null, markdownContent: null })} size={isMobile ? 'default' : 'large'}>
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="名称">{state.viewingFile.name}</Descriptions.Item>
                        <Descriptions.Item label="类型">{state.viewingFile.isFolder ? '文件夹' : state.viewingFile.mimeType}</Descriptions.Item>
                        <Descriptions.Item label="大小">{state.viewingFile.isFolder ? '-' : formatFileSize(state.viewingFile.size || 0)}</Descriptions.Item>
                        <Descriptions.Item label="创建者">{state.viewingFile.createdByName}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">{state.viewingFile.createdAt ? dayjs(state.viewingFile.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="更新时间">{state.viewingFile.updatedAt ? dayjs(state.viewingFile.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                    </Descriptions>
                    {!state.viewingFile.isFolder && (
                        <>
                            <Space style={{ marginTop: 16 }}>
                                <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(state.viewingFile!)}>下载</Button>
                                <Button icon={<ShareAltOutlined />} onClick={() => set({ shareVisible: true, sharingFile: state.viewingFile })}>分享</Button>
                                <Button icon={<EyeOutlined />} onClick={handlePreview} disabled={!state.previewUrl && !state.previewLoading} loading={state.previewLoading}>预览</Button>
                            </Space>
                            {state.versionList.length > 0 && (
                                <Card title="版本历史" style={{ marginTop: 16 }}>
                                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                        {state.versionList.map((v) => (
                                            <div key={v.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>版本 {v.versionNumber ?? v.version}</div>
                                                    <div style={{ color: '#666', fontSize: 12 }}>{formatFileSize(v.size)} · {v.createdAt ? dayjs(v.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'} · {v.createdByName || '-'}</div>
                                                </div>
                                                <Space size="small" wrap>
                                                    <Button size="small" onClick={() => handleDownload({ ...state.viewingFile!, id: v.id } as FileItem)}>下载</Button>
                                                    <Button size="small" type="primary" onClick={async () => { try { await api.restoreVersion(v.id); message.success('恢复成功'); actionRef.current?.reload(); } catch { message.error('恢复失败'); } }}>恢复</Button>
                                                </Space>
                                            </div>
                                        ))}
                                    </Space>
                                </Card>
                            )}
                        </>
                    )}
                </Drawer>
            )}

            {/* 图片预览 */}
            <Image src={state.previewUrl || undefined} alt={state.viewingFile?.name || 'preview'} style={{ display: 'none' }} preview={{ open: state.imagePreviewVisible, onOpenChange: (visible) => set({ imagePreviewVisible: visible }) }} />
        </PageContainer>
    );
};

export default CloudStorageFilesPage;
