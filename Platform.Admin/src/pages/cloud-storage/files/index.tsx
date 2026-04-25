/**
 * CloudStorageFilesPage - 云存储文件管理页面
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { request } from '@umijs/max';
import { App, Button, Tag, Space, Breadcrumb, Dropdown, Image, Input, Modal, Popconfirm, Card, Upload, Progress } from 'antd';
import { Drawer } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { ProDescriptions, ProCard } from '@ant-design/pro-components';
import { ProTable, ProColumns, ActionType } from '@ant-design/pro-table';
import { ModalForm, ProFormText, ProFormDatePicker, ProFormSelect, ProFormDigit } from '@ant-design/pro-form';
import { tokenUtils } from '@/utils/token';
import { EditOutlined, DeleteOutlined, CloudOutlined, FolderOutlined, FileOutlined, DownloadOutlined, ShareAltOutlined, UploadOutlined, FolderAddOutlined, MoreOutlined, EyeOutlined, SearchOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiResponse, PagedResult } from '@/types';

// ==================== Types ====================
interface FileItem { id: string; name: string; parentId?: string; isFolder: boolean; size?: number; mimeType?: string; createdByName?: string; createdAt: string; updatedAt: string; }
interface StorageStatistics { fileCount: number; folderCount: number; usedSpace: number; totalQuota: number; typeUsage?: Record<string, number>; lastUpdatedAt?: string; }
interface FileVersion { id: string; fileId: string; version: number; versionNumber?: number; size: number; createdByName: string; createdAt: string; comment?: string; }
interface AppUser { id: string; name: string; username: string; email?: string; }
interface PathHistoryItem { id?: string; name: string; path: string; }
interface ShareRequest { fileId: string; shareType: string; expiresAt?: string; maxDownloads?: number; allowedUserIds?: string[]; }
interface ShareResponse { shareLink?: string; expiresAt?: string; }
interface ShareFormValues { shareType: string; expiresAt?: string; maxDownloads?: number; allowedUserIds?: string[]; }

const api = {
    list: (params: any) => request<ApiResponse<PagedResult<FileItem>>>('/apiservice/api/cloud-storage/list', { params }),
    search: (params: any) => request<ApiResponse<PagedResult<FileItem>>>('/apiservice/api/cloud-storage/search', { params }),
    get: (id: string) => request<ApiResponse<FileItem>>(`/apiservice/api/cloud-storage/files/${id}`),
    delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/cloud-storage/items/${id}`, { method: 'DELETE' }),
    batchDelete: (ids: string[]) => request<ApiResponse<void>>('/apiservice/api/cloud-storage/items/batch-delete', { method: 'POST', data: { ids } }),
    createFolder: (data: { name: string; parentId?: string }) => request<ApiResponse<FileItem>>('/apiservice/api/cloud-storage/folders', { method: 'POST', data }),
    rename: (id: string, data: { name: string }) => request<ApiResponse<FileItem>>(`/apiservice/api/cloud-storage/items/${id}/rename`, { method: 'PUT', data }),
    statistics: () => request<ApiResponse<StorageStatistics>>('/apiservice/api/cloud-storage/statistics'),
    versions: (fileId: string, page: number, pageSize: number) => request<ApiResponse<PagedResult<FileVersion>>>('/apiservice/api/file-version/list', { params: { fileId, page, pageSize } }),
    restoreVersion: (fileId: string, versionNumber: number) => request<ApiResponse<void>>(`/apiservice/api/file-version/${fileId}/versions/${versionNumber}/restore`, { method: 'POST' }),
    share: (data: ShareRequest) => request<ApiResponse<ShareResponse>>(`/apiservice/api/file-share/${data.fileId}`, { method: 'POST', data }),
    users: () => request<ApiResponse<AppUser[]>>('/apiservice/api/users/all'),
    upload: (data: FormData) => request<ApiResponse<FileItem>>('/apiservice/api/cloud-storage/upload', { method: 'POST', data, headers: { 'Content-Type': 'multipart/form-data' } }),
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

    const [state, setState] = useState({
        data: [] as FileItem[], loading: false,
        statistics: null as StorageStatistics | null,
        currentPath: '', currentParentId: undefined as string | undefined,
        pathHistory: [{ name: intl.formatMessage({ id: 'pages.cloudStorage.path.myFiles' }), path: '' }] as PathHistoryItem[],
        selectedRowKeys: [] as string[], selectedRows: [] as FileItem[],
        isSearchMode: false, search: '',
        detailVisible: false, viewingFile: null as FileItem | null,
        previewVisible: false, imagePreviewVisible: false,
        previewUrl: '', previewLoading: false,
        officeContent: null as { type: string; content: string } | null,
        markdownContent: null as string | null,
        versionList: [] as FileVersion[], versionLoading: false,
        createFolderVisible: false, renameVisible: false, renamingFile: null as FileItem | null,
        shareVisible: false, sharingFile: null as FileItem | null,
        uploadVisible: false, uploadType: 'file' as 'file' | 'folder', uploadFileList: [] as UploadFile[],
        uploadProgress: {} as Record<string, { percent: number; label: string }>,
        userOptions: [] as AppUser[], userLoading: false,
    });

    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    useEffect(() => { api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); }); }, []);

    const fetchData = useCallback(async (params: any, sort: any, filter: any) => {
        const res = state.isSearchMode && state.search
            ? await api.search({ ...params, keyword: state.search, sort, filter })
            : await api.list({ ...params, parentId: currentParentIdRef.current, sort, filter });
        if (res.success && res.data) {
            set({ data: res.data.queryable || [] });
            api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
            return { data: res.data.queryable || [], total: res.data.rowCount || 0, success: res.success };
        }
        return { data: [], total: 0, success: false };
    }, [state.isSearchMode, state.search]);

    const handleFolderClick = useCallback((folder: FileItem) => {
        const newPath = state.currentPath ? `${state.currentPath}/${folder.name}` : folder.name;
        currentParentIdRef.current = folder.id;
        set({ currentPath: newPath, currentParentId: folder.id, pathHistory: [...state.pathHistory, { id: folder.id, name: folder.name, path: newPath }], isSearchMode: false, search: '' });
        actionRef.current?.reload();
    }, [state.currentPath, state.pathHistory]);

    const handleBreadcrumbClick = useCallback((index: number) => {
        const targetItem = state.pathHistory[index];
        currentParentIdRef.current = targetItem.id ?? undefined;
        set({ currentPath: targetItem.path, currentParentId: targetItem.id, pathHistory: state.pathHistory.slice(0, index + 1), isSearchMode: false, search: '' });
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
                        const dl = await fetch(`/apiservice/api/cloud-storage/items/${file.id}/download`, { headers: { 'Authorization': `Bearer ${token}` } });
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
            const response = await fetch(`/apiservice/api/cloud-storage/items/${file.id}/download`, { headers: { 'Authorization': `Bearer ${token}` } });
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

    const handleShareSubmit = useCallback(async (values: ShareFormValues) => {
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
        { title: intl.formatMessage({ id: 'pages.cloudStorage.table.name' }), dataIndex: 'name', key: 'name', sorter: true, render: (dom, record) => (<Space>{getFileIcon(record)}<a onClick={() => record.isFolder ? handleFolderClick(record) : handleView(record)} style={{ cursor: 'pointer' }}>{dom}</a></Space>) },
        { title: intl.formatMessage({ id: 'pages.cloudStorage.table.type' }), dataIndex: 'isFolder', key: 'isFolder', width: 80, render: (dom, record) => record.isFolder ? <Tag color="orange">{intl.formatMessage({ id: 'pages.cloudStorage.type.folder' })}</Tag> : <Tag color="blue">文件</Tag> },
        { title: intl.formatMessage({ id: 'pages.cloudStorage.table.size' }), dataIndex: 'size', key: 'size', sorter: true, render: (_, r) => r.isFolder ? '-' : formatFileSize(r.size || 0) },
        { title: intl.formatMessage({ id: 'pages.cloudStorage.table.updatedAt' }), dataIndex: 'updatedAt', key: 'updatedAt', sorter: true, render: (dom) => dom && typeof dom === 'string' ? dayjs(dom).format('YYYY-MM-DD HH:mm:ss') : '-' },
        { title: intl.formatMessage({ id: 'pages.cloudStorage.table.creator' }), dataIndex: 'createdByName', key: 'createdByName' },
        { title: intl.formatMessage({ id: 'pages.cloudStorage.table.action' }), key: 'action', fixed: 'right', width: 220, render: (_, record) => (<Space size={4}>
            <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => set({ sharingFile: record, shareVisible: true })}>{intl.formatMessage({ id: 'pages.cloudStorage.action.share' })}</Button>
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>{intl.formatMessage({ id: 'pages.cloudStorage.action.download' })}</Button>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ renamingFile: record, renameVisible: true })}>{intl.formatMessage({ id: 'pages.cloudStorage.action.rename' })}</Button>
            <Popconfirm title={intl.formatMessage({ id: 'pages.cloudStorage.message.confirmDelete' }, { name: record.name })} onConfirm={() => handleDelete(record)} okButtonProps={{ danger: true }}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>{intl.formatMessage({ id: 'pages.cloudStorage.action.delete' })}</Button>
            </Popconfirm>
        </Space>) },
    ];

    return (
        <PageContainer>
          <ProTable actionRef={actionRef} headerTitle={
              <Space size={24}>
                <Space><CloudOutlined />{intl.formatMessage({ id: 'pages.cloudStorage.title' })}</Space>
                <Space size={12}>
                  <Tag color="blue">{intl.formatMessage({ id: 'pages.cloudStorage.statistics.fileCount' })} {state.statistics?.fileCount || 0}</Tag>
                  <Tag color="green">{intl.formatMessage({ id: 'pages.cloudStorage.statistics.folderCount' })} {state.statistics?.folderCount || 0}</Tag>
                  <Tag color="purple">{intl.formatMessage({ id: 'pages.cloudStorage.statistics.totalQuota' })} {formatFileSize(state.statistics?.totalQuota || 0)}</Tag>
                  <Tag color="orange">{intl.formatMessage({ id: 'pages.cloudStorage.statistics.usedSpace' })} {formatFileSize(state.statistics?.usedSpace || 0)}</Tag>
                </Space>
              </Space>
            } request={fetchData} columns={columns} rowKey="id" search={false}
                scroll={{ x: 'max-content' }}
                toolBarRender={() => [
                  <Input.Search
                    key="search"
                    placeholder={intl.formatMessage({ id: 'pages.cloudStorage.search.placeholder' })}
                    allowClear
                    value={state.search}
                    onChange={(e) => set({ search: e.target.value })}
                    onSearch={(value) => { set({ search: value, isSearchMode: !!value }); actionRef.current?.reload(); }}
                    style={{ width: 260, marginRight: 8 }}
                    prefix={<SearchOutlined />}
                  />,
                  <Button key="create-folder" icon={<FolderAddOutlined />} onClick={() => set({ createFolderVisible: true })}>{intl.formatMessage({ id: 'pages.cloudStorage.action.createFolder' })}</Button>,
                  <Dropdown key="upload" menu={{ items: [
                    { key: 'file', label: intl.formatMessage({ id: 'pages.cloudStorage.action.uploadFile' }), icon: <FileOutlined />, onClick: () => set({ uploadType: 'file', uploadVisible: true }) },
                    { key: 'folder', label: intl.formatMessage({ id: 'pages.cloudStorage.action.uploadFolder' }), icon: <FolderOutlined />, onClick: () => set({ uploadType: 'folder', uploadVisible: true }) },
                  ]}}>
                    <Button type="primary" icon={<UploadOutlined />}>{intl.formatMessage({ id: 'pages.cloudStorage.action.uploadFile' })} <MoreOutlined style={{ fontSize: 12 }} /></Button>
                  </Dropdown>,
                ]}
                rowSelection={{ selectedRowKeys: state.selectedRowKeys, onChange: (keys, rows) => set({ selectedRowKeys: keys as string[], selectedRows: rows }) }} />

            {/* 创建文件夹 */}
            <ModalForm key="create-folder" title={intl.formatMessage({ id: 'pages.cloudStorage.action.createFolder' })} open={state.createFolderVisible} onOpenChange={(open) => { if (!open) set({ createFolderVisible: false }); }}
                onFinish={async (values) => { try { await api.createFolder({ name: values.name, parentId: currentParentIdRef.current }); message.success(intl.formatMessage({ id: 'pages.cloudStorage.message.createFolderSuccess' })); set({ createFolderVisible: false }); actionRef.current?.reload(); return true; } catch { message.error(intl.formatMessage({ id: 'pages.cloudStorage.message.createFolderFailed' })); return false; } }} autoFocusFirstInput width={400}>
                <ProFormText name="name" label={intl.formatMessage({ id: 'pages.cloudStorage.form.folderName' })} placeholder={intl.formatMessage({ id: 'pages.cloudStorage.form.folderNamePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloudStorage.form.folderNamePlaceholder' }) }]} />
            </ModalForm>

            {/* 重命名 */}
            <ModalForm key={state.renamingFile?.id || 'rename'} title={intl.formatMessage({ id: 'pages.cloudStorage.action.rename' })} open={state.renameVisible} onOpenChange={(open) => { if (!open) set({ renameVisible: false, renamingFile: null }); }}
                initialValues={state.renamingFile ? { name: state.renamingFile.name } : undefined}
                onFinish={async (values) => { if (!state.renamingFile) return false; try { await api.rename(state.renamingFile.id, { name: values.name }); message.success(intl.formatMessage({ id: 'pages.cloudStorage.message.renameSuccess' })); set({ renameVisible: false, renamingFile: null }); actionRef.current?.reload(); return true; } catch { message.error(intl.formatMessage({ id: 'pages.cloudStorage.message.renameFailed' })); return false; } }} autoFocusFirstInput width={400}>
                <ProFormText name="name" label={intl.formatMessage({ id: 'pages.cloudStorage.form.fileName' })} placeholder={intl.formatMessage({ id: 'pages.cloudStorage.form.fileNamePlaceholder' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloudStorage.form.fileNamePlaceholder' }) }]} />
            </ModalForm>

            {/* 分享 */}
            <ModalForm key={state.sharingFile?.id || 'share'} title={intl.formatMessage({ id: 'pages.cloud-storage.files.action.share' })} open={state.shareVisible} onOpenChange={(open) => { if (!open) set({ shareVisible: false, sharingFile: null }); }}
                onFinish={handleShareSubmit} autoFocusFirstInput width={500}>
                <ProFormSelect name="shareType" label={intl.formatMessage({ id: 'pages.cloudStorage.form.shareType' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.cloudStorage.form.shareTypePlaceholder' }) }]} options={[{ label: intl.formatMessage({ id: 'pages.cloudStorage.form.shareTypePublic' }), value: 'public' }, { label: intl.formatMessage({ id: 'pages.cloudStorage.form.shareTypeInternal' }), value: 'internal' }]} />
                <ProFormDatePicker name="expiresAt" label={intl.formatMessage({ id: 'pages.cloudStorage.form.expiresAt' })} />
                <ProFormDigit name="maxDownloads" label={intl.formatMessage({ id: 'pages.cloudStorage.form.maxDownloads' })} min={1} />
                {state.userOptions.length > 0 && <ProFormSelect name="allowedUserIds" label={intl.formatMessage({ id: 'pages.cloudStorage.form.selectUsers' })} mode="multiple" options={state.userOptions.map(u => ({ label: u.name, value: u.id }))} />}
            </ModalForm>

            {/* 上传文件 */}
            <Modal
                title={state.uploadType === 'folder' ? intl.formatMessage({ id: 'pages.cloudStorage.action.uploadFolder' }) : intl.formatMessage({ id: 'pages.cloudStorage.action.uploadFile' })}
                open={state.uploadVisible}
                onCancel={() => set({ uploadVisible: false, uploadFileList: [] })}
                footer={null}
                width={600}
            >
                <Upload.Dragger
                    multiple={true}
                    directory={state.uploadType === 'folder'}
                    action="/apiservice/api/cloud-storage/upload"
                    accept="*/*"
                    headers={{ Authorization: `Bearer ${tokenUtils.getToken()}` }}
                    data={() => ({ parentId: currentParentIdRef.current || '' })}
                    beforeUpload={(file) => {
                        set({ uploadFileList: [...state.uploadFileList, { uid: file.uid, name: file.name, status: 'uploading' }] });
                        return true;
                    }}
                    onChange={(info) => {
                        set({ uploadFileList: info.fileList });
                        if (info.file.status === 'done') {
                            const response = info.file.response as any;
                            if (response?.success === false) {
                                const errorMsg = response?.errorCode
                                    ? intl.formatMessage({ id: response.errorCode, defaultMessage: response.message || `${info.file.name} ${intl.formatMessage({ id: 'pages.cloudStorage.message.uploadFailed' })}` })
                                    : (response.message || `${info.file.name} ${intl.formatMessage({ id: 'pages.cloudStorage.message.uploadFailed' })}`);
                                message.error(errorMsg);
                            } else {
                                message.success(`${info.file.name} ${intl.formatMessage({ id: 'pages.cloudStorage.message.uploadSuccess' })}`);
                                if (info.fileList.every(f => f.status !== 'uploading')) {
                                    set({ uploadVisible: false, uploadFileList: [] });
                                    actionRef.current?.reload();
                                }
                            }
                        } else if (info.file.status === 'error') {
                            const response = info.file.response as any;
                            const errorMsg = response?.errorCode
                                ? intl.formatMessage({ id: response.errorCode, defaultMessage: response?.message || `${info.file.name} ${intl.formatMessage({ id: 'pages.cloudStorage.message.uploadFailed' })}` })
                                : (response?.message || `${info.file.name} ${intl.formatMessage({ id: 'pages.cloudStorage.message.uploadFailed' })}`);
                            message.error(errorMsg);
                        }
                    }}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">{intl.formatMessage({ id: 'pages.cloudStorage.upload.dragText' })}</p>
                    <p className="ant-upload-hint">{intl.formatMessage({ id: 'pages.cloudStorage.upload.hint' })}</p>
                </Upload.Dragger>
            </Modal>

            {/* 文件详情 */}
            {state.detailVisible && state.viewingFile && (
                <Drawer title={state.viewingFile.name} placement="right" open={state.detailVisible} onClose={() => set({ detailVisible: false, viewingFile: null, previewUrl: '', officeContent: null, markdownContent: null })} size="large">
                    <ProDescriptions column={1} size="small" bordered>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.cloudStorage.detail.name' })}>{state.viewingFile.name}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.cloudStorage.detail.type' })}>{state.viewingFile.isFolder ? intl.formatMessage({ id: 'pages.cloudStorage.type.folder' }) : state.viewingFile.mimeType}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.cloudStorage.detail.size' })}>{state.viewingFile.isFolder ? '-' : formatFileSize(state.viewingFile.size || 0)}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.cloudStorage.detail.creator' })}>{state.viewingFile.createdByName}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.cloudStorage.detail.createdAt' })}>{state.viewingFile.createdAt ? dayjs(state.viewingFile.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                        <ProDescriptions.Item label={intl.formatMessage({ id: 'pages.cloudStorage.detail.updatedAt' })}>{state.viewingFile.updatedAt ? dayjs(state.viewingFile.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</ProDescriptions.Item>
                    </ProDescriptions>
                    {!state.viewingFile.isFolder && (
                        <>
                            <Space style={{ marginTop: 16 }}>
                                <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(state.viewingFile!)}>{intl.formatMessage({ id: 'pages.cloudStorage.action.download' })}</Button>
                                <Button icon={<ShareAltOutlined />} onClick={() => set({ shareVisible: true, sharingFile: state.viewingFile })}>{intl.formatMessage({ id: 'pages.cloudStorage.action.share' })}</Button>
                                <Button icon={<EyeOutlined />} onClick={handlePreview} disabled={!state.previewUrl && !state.previewLoading} loading={state.previewLoading}>{intl.formatMessage({ id: 'pages.cloudStorage.action.preview' })}</Button>
                            </Space>
                            {state.versionList.length > 0 && (
                                <Card title={intl.formatMessage({ id: 'pages.cloudStorage.detail.versionHistory' })} style={{ marginTop: 16 }}>
                                    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
                                        {state.versionList.map((v) => (
                                            <div key={v.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>{intl.formatMessage({ id: 'pages.cloudStorage.detail.version' })} {v.versionNumber ?? v.version}</div>
                                                    <div style={{ color: '#666', fontSize: 12 }}>{formatFileSize(v.size)} · {v.createdAt ? dayjs(v.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'} · {v.createdByName || '-'}</div>
                                                </div>
                                                <Space size="small" wrap>
                                                    <Button size="small" onClick={() => handleDownload({ ...state.viewingFile!, id: v.id } as FileItem)}>{intl.formatMessage({ id: 'pages.cloudStorage.action.download' })}</Button>
                                                    <Button size="small" type="primary" onClick={async () => { try { await api.restoreVersion(v.fileId, v.versionNumber ?? v.version); message.success(intl.formatMessage({ id: 'pages.cloudStorage.message.restoreSuccess' })); actionRef.current?.reload(); } catch { message.error(intl.formatMessage({ id: 'pages.cloudStorage.message.restoreFailed' })); } }}>{intl.formatMessage({ id: 'pages.cloudStorage.action.restore' })}</Button>
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
