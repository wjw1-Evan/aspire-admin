/**
 * CloudStorageFilesPage - 云存储文件管理页面
 *
 * 重构后的主页面，使用提取的子组件
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { PageContainer, StatCard } from '@/components';
import useCommonStyles from '@/hooks/useCommonStyles';
import SearchBar from '@/components/SearchBar';
import { useIntl } from '@umijs/max';
import { Grid, Table, App } from 'antd';
import {
    Button,
    Tag,
    Space,
    Row,
    Col,
    Card,
    Breadcrumb,
    Dropdown,
    Image,
} from 'antd';
import { useModal } from '@/hooks/useModal';
import { tokenUtils } from '@/utils/token';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    CloudOutlined,
    FolderOutlined,
    FileOutlined,
    DownloadOutlined,
    ShareAltOutlined,
    UploadOutlined,
    FolderAddOutlined,
    MoreOutlined,
    SearchOutlined,
    RotateLeftOutlined,
    RotateRightOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    SwapOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import {
    getFileList,
    getFileDetail,
    createFolder,
    renameItem,
    deleteItem,
    batchDeleteItems,
    uploadFile,
    batchUploadFiles,
    downloadFile,
    searchFiles,
    getStorageStatistics,
    downloadFolder,
    getVersionList,
    downloadVersion,
    restoreVersion,
    type FileItem,
    type FileListRequest,
    type CreateFolderRequest,
    type RenameItemRequest,
    type FileSearchRequest,
    type StorageStatistics,
    type FileVersion,
} from '@/services/cloud-storage';
import { createShare, type CreateShareRequest } from '@/services/cloud-storage/shareApi';
import { getAllUsers, type AppUser } from '@/services/user/api';

// 导入子组件
import {
    CreateFolderModal,
    RenameModal,
    UploadModal,
    ShareModal,
    FilePreviewModal,
    FileDetailDrawer,
} from './components';

// 导入工具函数和类型
import type { SearchParams, PathHistoryItem, UploadProgressItem, OfficeContent } from './types';
import { MAX_UPLOAD_BYTES, formatFileSize, formatDateTime, getFileIcon, transformFileItem, isImageFile } from './utils';
import type { PageParams } from '@/types/api-response';

const CloudStorageFilesPage: React.FC = () => {
    const intl = useIntl();
    const { message, modal } = App.useApp();
    const { styles } = useCommonStyles();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    // 搜索参数
    const searchParamsRef = useRef<PageParams>({ page: 1, pageSize: 20, search: '' });

    // 导航相关
    const [currentPath, setCurrentPath] = useState<string>('');
    const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
    const currentParentIdRef = useRef<string | undefined>(undefined);
    const [pathHistory, setPathHistory] = useState<PathHistoryItem[]>([
        { name: '我的文件', path: '' }
    ]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<FileItem[]>([]);
    const [statistics, setStatistics] = useState<StorageStatistics | null>(null);
    // 数据状态
    const [data, setData] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

    const [isSearchMode, setIsSearchMode] = useState(false);

    // 弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [officeContent, setOfficeContent] = useState<OfficeContent | null>(null);
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);
    const [versionList, setVersionList] = useState<FileVersion[]>([]);
    const [versionLoading, setVersionLoading] = useState(false);
    const [createFolderVisible, setCreateFolderVisible] = useState(false);
    const [renameVisible, setRenameVisible] = useState(false);
    const [renamingItem, setRenamingItem] = useState<FileItem | null>(null);
    const [uploadVisible, setUploadVisible] = useState(false);
    const [uploadType, setUploadType] = useState<'file' | 'folder'>('file');
    const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgressItem>>({});
    const [shareVisible, setShareVisible] = useState(false);
    const [sharingItem, setSharingItem] = useState<FileItem | null>(null);
    const [userOptions, setUserOptions] = useState<AppUser[]>([]);
    const [userLoading, setUserLoading] = useState(false);

    // 加载统计数据
    const loadStatistics = useCallback(async () => {
        try {
            const response = await getStorageStatistics();
            if (response.success && response.data) {
                const apiData = response.data as any;
                const transformedStatistics: StorageStatistics = {
                    totalFiles: apiData.fileCount || apiData.totalFiles || 0,
                    totalFolders: apiData.folderCount || apiData.totalFolders || 0,
                    totalSize: apiData.usedSpace || apiData.totalSize || 0,
                    usedQuota: apiData.usedSpace || apiData.usedQuota || 0,
                    totalQuota: apiData.totalQuota || 0,
                    fileTypeStats: apiData.typeUsage
                        ? Object.entries(apiData.typeUsage).map(([type, size]) => ({
                            type,
                            count: 0,
                            size: typeof size === 'number' ? size : 0,
                        }))
                        : apiData.fileTypeStats || [],
                };
                setStatistics(transformedStatistics);
            }
        } catch (err) {
            console.error('Failed to load statistics:', err);
        }
    }, []);

    // 数据获取函数
    const fetchData = useCallback(async () => {
        const currentParams = searchParamsRef.current;
        const { page = 1, pageSize = 20, search } = currentParams;
        const sortBy = currentParams.sortBy || 'updatedAt';
        const sortOrder: 'asc' | 'desc' | undefined = (currentParams.sortOrder as 'asc' | 'desc' | undefined) || 'desc';

        setLoading(true);
        try {
            let response;

            if (isSearchMode && search) {
                const searchRequest: FileSearchRequest = {
                    keyword: search,
                    page: page,
                    pageSize: pageSize,
                    sortBy,
                    sortOrder,
                };
                response = await searchFiles(searchRequest);
            } else {
                const parentId = currentParentIdRef.current;
                const listRequest: FileListRequest = {
                    parentId: parentId,
                    page: page,
                    pageSize: pageSize,
                    sortBy,
                    sortOrder,
                };
                response = await getFileList(listRequest);
            }

            if (response.success && response.data) {
                const transformedData = (response.data.queryable || []).map(transformFileItem);
                setData(transformedData);
                setPagination(prev => ({
                    ...prev,
                    page: page ?? prev.page,
                    pageSize: pageSize ?? prev.pageSize,
                    total: response.data!.rowCount ?? 0,
                }));
            } else {
                setData([]);
                setPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch (err) {
            console.error('Failed to load files:', err);
            setData([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [isSearchMode]);

    useEffect(() => {
        loadStatistics();
        fetchData();
    }, [loadStatistics, fetchData]);

    const refreshAll = useCallback(() => {
        fetchData();
        loadStatistics();
    }, [fetchData, loadStatistics]);

    // 搜索处理

    // 文件夹导航
    const handleFolderClick = useCallback((folder: FileItem) => {
        const newPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
        const newPathItem = { id: folder.id, name: folder.name, path: newPath };

        currentParentIdRef.current = folder.id;
        setCurrentPath(newPath);
        setCurrentParentId(folder.id);
        setPathHistory(prev => [...prev, newPathItem]);
        setIsSearchMode(false);
        searchParamsRef.current = { ...searchParamsRef.current, search: '' };
        fetchData();
    }, [currentPath, fetchData]);

    const handleBreadcrumbClick = useCallback((index: number) => {
        const targetItem = pathHistory[index];
        const newPathHistory = pathHistory.slice(0, index + 1);

        currentParentIdRef.current = targetItem.id;
        setCurrentPath(targetItem.path);
        setCurrentParentId(targetItem.id);
        setPathHistory(newPathHistory);
        setIsSearchMode(false);
        searchParamsRef.current = { ...searchParamsRef.current, search: '' };
        fetchData();
    }, [pathHistory, fetchData]);

    // 搜索处理
    const handleSearch = useCallback((params: PageParams) => {
        searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
        setIsSearchMode(!!params.search);
        fetchData();
    }, [fetchData]);

    // 表格分页和排序处理
    const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
        const newPage = pag.current;
        const newPageSize = pag.pageSize;
        const sortBy = sorter?.field;
        const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;
        
        searchParamsRef.current = {
            ...searchParamsRef.current,
            page: newPage,
            pageSize: newPageSize,
            sortBy,
            sortOrder,
        };
        fetchData();
    }, [fetchData]);

    // 文件操作
    const handleView = useCallback(async (file: FileItem) => {
        try {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
            }

            const response = await getFileDetail(file.id);
            if (response.success && response.data) {
                const fileData = response.data as any;

                if (!response.data.isFolder) {
                    setVersionLoading(true);
                    try {
                        const versionResp = await getVersionList({ fileId: response.data.id, page: 1, pageSize: 50 });
                        if (versionResp.success && versionResp.data) {
                            setVersionList(versionResp.data.queryable || []);
                        } else {
                            setVersionList([]);
                        }
                    } catch (e) {
                        console.error('Failed to load versions', e);
                        setVersionList([]);
                    } finally {
                        setVersionLoading(false);
                    }
                } else {
                    setVersionList([]);
                }

                const transformedFile = transformFileItem(fileData);
                setViewingFile(transformedFile);
                setDetailVisible(true);

                if (!transformedFile.isFolder) {
                    try {
                        setPreviewLoading(true);
                        const token = tokenUtils.getToken();
                        const downloadResponse = await fetch(`/api/cloud-storage/files/${file.id}/download`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!downloadResponse.ok) {
                            throw new Error('Failed to load preview');
                        }

                        const blob = await downloadResponse.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        setPreviewUrl(blobUrl);

                        const mimeType = transformedFile.mimeType?.toLowerCase() || '';
                        const fileName = transformedFile.name?.toLowerCase() || '';

                        if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || fileName.match(/\.xlsx?$/)) {
                            try {
                                const XLSX = await import('xlsx');
                                const arrayBuffer = await blob.arrayBuffer();
                                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                                const firstSheetName = workbook.SheetNames[0];
                                const html = XLSX.utils.sheet_to_html(workbook.Sheets[firstSheetName]);
                                setOfficeContent({ type: 'excel', content: html });
                            } catch (err) {
                                console.error('Failed to parse Excel file', err);
                            }
                        } else if ((mimeType.includes('word') || mimeType.includes('document')) && fileName.endsWith('.docx')) {
                            try {
                                const mammoth = (await import('mammoth')).default;
                                const arrayBuffer = await blob.arrayBuffer();
                                const result = await mammoth.convertToHtml({ arrayBuffer });
                                setOfficeContent({ type: 'word', content: result.value });
                            } catch (err) {
                                console.error('Failed to parse Word file', err);
                            }
                        } else if (mimeType.includes('markdown') || fileName.endsWith('.md')) {
                            try {
                                const { marked } = await import('marked');
                                const text = await blob.text();
                                const html = await marked.parse(text);
                                setMarkdownContent(html);
                            } catch (err) {
                                console.error('Failed to parse Markdown file', err);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to create preview URL', e);
                        setPreviewUrl('');
                        setOfficeContent(null);
                    } finally {
                        setPreviewLoading(false);
                    }
                }
            }
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.detailFailed' }));
        }
    }, [message, intl, previewUrl]);

    const handleDownload = useCallback(async (file: FileItem) => {
        try {
            if (file.isFolder) {
                await downloadFolder(file.id, file.name);
            } else {
                await downloadFile(file.id, file.name);
            }
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.downloadStarted' }));
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.downloadFailed' }));
        }
    }, [message, intl]);

    const handleDelete = useCallback(async (file: FileItem) => {
        try {
            await deleteItem(file.id);
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.deleteSuccess' }));
            refreshAll();
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.deleteFailed' }));
        }
    }, [message, intl]);

    const handleRename = useCallback((file: FileItem) => {
        setRenamingItem(file);
        setRenameVisible(true);
    }, []);

    const handleOpenShare = useCallback((file: FileItem) => {
        setSharingItem(file);
        setShareVisible(true);
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            setUserLoading(true);
            const resp = await getAllUsers();

            if (resp.success && resp.data) {

                setUserOptions(resp.data);
            }
        } catch (e) {
            console.error('加载用户列表失败', e);
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.loadUsersFailed' }));
        } finally {
            setUserLoading(false);
        }
    }, [message, intl]);

    useEffect(() => {
        if (shareVisible) {
            loadUsers();
        }
    }, [shareVisible, loadUsers]);

    const handleCreateShare = useCallback(async (values: any) => {
        if (!sharingItem) return;

        try {
            const payload: CreateShareRequest = {
                ...values,
                fileId: sharingItem.id,
                expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined,
                maxDownloads: values.maxDownloads ? Number(values.maxDownloads) : undefined,
                allowedUserIds: values.shareType === 'internal' ? values.allowedUserIds || [] : undefined,
            };
            await createShare(payload);
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.shareSuccess' }));
            setShareVisible(false);
            setSharingItem(null);
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.shareFailed' }));
        }
    }, [sharingItem, message, intl]);

    // 批量操作
    const handleBatchDelete = useCallback(async () => {
        if (selectedRowKeys.length === 0) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.selectFilesToDelete' }));
            return;
        }

        modal.confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`,
            onOk: async () => {
                try {
                    await batchDeleteItems({ ids: selectedRowKeys });
                    message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.batchDeleteSuccess' }));
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    refreshAll();
                } catch (err) {
                    message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.batchDeleteFailed' }));
                }
            },
        });
    }, [selectedRowKeys, modal, message, intl]);

    // 创建文件夹
    const handleCreateFolder = useCallback(async (values: CreateFolderRequest) => {
        try {
            await createFolder({ ...values, parentId: currentParentId });
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.createFolderSuccess' }));
            setCreateFolderVisible(false);
            refreshAll();
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.createFolderFailed' }));
        }
    }, [currentParentId, message, intl]);

    // 重命名
    const handleRenameSubmit = useCallback(async (values: RenameItemRequest) => {
        if (!renamingItem) return;

        try {
            await renameItem(renamingItem.id, values);
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.renameSuccess' }));
            setRenameVisible(false);
            setRenamingItem(null);
            refreshAll();
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.renameFailed' }));
        }
    }, [renamingItem, message, intl]);

    // 文件上传
    const handleUpload = useCallback(async (file: File) => {
        const uploadId = `${Date.now()}_${file.name}`;
        const label = file.name;

        try {
            setUploadProgress(prev => ({ ...prev, [uploadId]: { percent: 0, label } }));

            await uploadFile(
                { file, parentId: currentParentId },
                (percent) => {
                    setUploadProgress(prev => ({ ...prev, [uploadId]: { percent, label: prev[uploadId]?.label || label } }));
                }
            );

            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadSuccess' }));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
            refreshAll();
        } catch (err) {
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadFailed' }));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
        }
    }, [currentParentId, message, intl]);

    const uploadSingleWithProgress = useCallback(async (file: File) => {
        const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
        const relativePath = (file as any).webkitRelativePath as string | undefined;
        const label = relativePath || file.name;

        try {
            setUploadProgress(prev => ({ ...prev, [uploadId]: { percent: 0, label } }));

            await batchUploadFiles(
                { files: [file], parentId: currentParentId },
                (percent) => {
                    setUploadProgress(prev => ({ ...prev, [uploadId]: { percent, label: prev[uploadId]?.label || label } }));
                },
            );

            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
            return true;
        } catch (err) {
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
            message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadFailedMsg' }, { label }));
            return false;
        }
    }, [currentParentId, message, intl]);

    const handleBatchUpload = useCallback(async (files: File[]) => {
        if (!files || files.length === 0) return;

        let successCount = 0;
        for (const file of files) {
            const ok = await uploadSingleWithProgress(file);
            if (ok) successCount += 1;
        }

        if (successCount > 0) {
            message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadComplete' }, { count: successCount, total: files.length }));
            refreshAll();
        }
    }, [refreshAll, message, intl, uploadSingleWithProgress]);

    // 上传大小提示
    const maxUploadSizeLabel = useMemo(() => formatFileSize(MAX_UPLOAD_BYTES), []);

    // 版本操作
    const handleDownloadVersion = useCallback((versionId: string, fileName: string) => {
        downloadVersion(versionId, fileName);
    }, []);

    const handleRestoreVersion = useCallback((versionId: string) => {
        modal.confirm({
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.confirmRestore.title' }),
            onOk: async () => {
                try {
                    await restoreVersion({ versionId });
                    message.success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.restoreSuccess' }));
                    refreshAll();
                    if (viewingFile) {
                        handleView(viewingFile);
                    }
                } catch (e) {
                    message.error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.restoreFailed' }));
                }
            }
        });
    }, [modal, message, intl, viewingFile, handleView, refreshAll]);

    // 预览处理
    const handlePreview = useCallback(() => {
        const mimeType = viewingFile?.mimeType?.toLowerCase() || '';
        if (isImageFile(mimeType)) {
            setImagePreviewVisible(true);
        } else {
            setPreviewVisible(true);
        }
    }, [viewingFile]);

    // 统计块配置
    const statsConfig = [
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.fileCount' }), value: statistics?.totalFiles ?? 0, icon: <FileOutlined />, color: '#1890ff' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.folderCount' }), value: statistics?.totalFolders ?? 0, icon: <FolderOutlined />, color: '#52c41a' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.totalQuota' }), value: formatFileSize(statistics?.totalQuota ?? 0), icon: <CloudOutlined />, color: '#722ed1' },
        { title: intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.usedSpace' }), value: statistics && statistics.totalQuota > 0 ? `${Math.round((statistics.usedQuota / statistics.totalQuota) * 100)}%` : '0%', icon: null, color: '#fa8c16', suffix: <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>/ {formatFileSize(statistics?.totalQuota ?? 0)}</span> },
    ];

    // 表格列定义
    const columns = useMemo(() => [
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.name' }),
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (text: string, record: FileItem) => (
                <Space>
                    {getFileIcon(record)}
                    <a
                        onClick={() => {
                            if (record.isFolder) {
                                handleFolderClick(record);
                            } else {
                                handleView(record);
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        {text}
                    </a>
                </Space>
            ),
        },
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.size' }),
            dataIndex: 'size',
            key: 'size',
            sorter: true,
            render: (size: number, record: FileItem) =>
                record.isFolder ? '-' : formatFileSize(size),
        },
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.updatedAt' }),
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            sorter: true,
            render: (time: string) => formatDateTime(time),
        },
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.creator' }),
            dataIndex: 'createdByName',
            key: 'createdByName',
        },
        {
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.field.action' }),
            key: 'action',
            fixed: 'right' as const,
            render: (_: unknown, record: FileItem) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<ShareAltOutlined />}
                        onClick={() => handleOpenShare(record)}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.action.share' })}
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(record)}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.action.download' })}
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleRename(record)}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.action.rename' })}
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            modal.confirm({
                                title: intl.formatMessage({ id: 'pages.cloud-storage.files.confirmDelete.title' }),
                                content: intl.formatMessage(
                                    { id: 'pages.cloud-storage.files.confirmDelete.desc' },
                                    {
                                        type: record.isFolder
                                            ? intl.formatMessage({ id: 'pages.cloud-storage.files.field.type.folder' })
                                            : intl.formatMessage({ id: 'pages.cloud-storage.files.field.type.file' }),
                                        name: record.name,
                                    }
                                ),
                                onOk: () => handleDelete(record),
                                okButtonProps: { danger: true },
                            });
                        }}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.action.delete' })}
                    </Button>
                </Space>
            ),
        },
    ], [intl, handleFolderClick, handleView, handleOpenShare, handleDownload, handleRename, handleDelete, modal]);

    return (
        <PageContainer
            title={
                <Space>
                    <CloudOutlined />
                    {intl.formatMessage({ id: 'pages.cloud-storage.files.title' })}
                </Space>
            }
            extra={
                <Space wrap>
                    {selectedRowKeys.length > 0 && (
                        <Button
                            key="batch-delete"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleBatchDelete}
                        >
                            {intl.formatMessage({ id: 'pages.cloud-storage.files.action.batchDelete' })} ({selectedRowKeys.length})
                        </Button>
                    )}
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={refreshAll}
                    >
                        {intl.formatMessage({ id: 'pages.button.refresh' })}
                    </Button>
                    <Button
                        key="create-folder"
                        icon={<FolderAddOutlined />}
                        onClick={() => setCreateFolderVisible(true)}
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.action.newFolder' })}
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'file',
                                    label: intl.formatMessage({ id: 'pages.cloud-storage.files.action.uploadFile' }),
                                    icon: <FileOutlined />,
                                    onClick: () => {
                                        setUploadType('file');
                                        setUploadVisible(true);
                                    },
                                },
                                {
                                    key: 'folder',
                                    label: intl.formatMessage({ id: 'pages.cloud-storage.files.action.uploadFolder' }),
                                    icon: <FolderOutlined />,
                                    onClick: () => {
                                        setUploadType('folder');
                                        setUploadVisible(true);
                                    },
                                },
                            ],
                        }}
                    >
                        <Button
                            key="upload"
                            type="primary"
                            icon={<UploadOutlined />}
                        >
                            {intl.formatMessage({ id: 'pages.cloud-storage.files.action.upload' })} <MoreOutlined style={{ fontSize: 12 }} />
                        </Button>
                    </Dropdown>
                </Space>
            }
        >
            {/* 统计区域：循环渲染精简代码 */}
            {statistics && (
                <Card className={styles.card} style={{ marginBottom: 16 }}>
                    <Row gutter={[12, 12]}>
                        {statsConfig.map((stat, idx) => (
                            <Col xs={24} sm={12} md={6} key={idx}>
                                <StatCard title={stat.title} value={stat.value ?? 0} icon={stat.icon} color={stat.color} suffix={stat.suffix} />
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}

            {/* 面包屑导航 */}
            <Card className={styles.card} style={{ marginBottom: 16 }}>
                <Breadcrumb
                    items={pathHistory.map((item, index) => ({
                        key: index,
                        title: index === 0 ? (
                            <a onClick={() => handleBreadcrumbClick(index)}>
                                {intl.formatMessage({ id: 'pages.cloud-storage.files.breadcrumb.myFiles' })}
                            </a>
                        ) : (
                            <a onClick={() => handleBreadcrumbClick(index)}>{item.name}</a>
                        )
                    }))}
                />
            </Card>

            {/* 搜索表单 */}
            <SearchBar
                initialParams={searchParamsRef.current}
                onSearch={handleSearch}
                style={{ marginBottom: 16 }}
            />

            {/* 数据表格 */}
            <Table
                dataSource={data}
                columns={columns}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                onChange={handleTableChange}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                }}
                rowSelection={{
                    selectedRowKeys,
                    onChange: (keys, rows) => {
                        setSelectedRowKeys(keys as string[]);
                        setSelectedRows(rows);
                    },
                }}
            />

            {/* 子组件 */}
            <FileDetailDrawer
                open={detailVisible}
                onClose={() => setDetailVisible(false)}
                file={viewingFile}
                versionList={versionList}
                versionLoading={versionLoading}
                previewUrl={previewUrl}
                previewLoading={previewLoading}
                isMobile={isMobile}
                formatFileSize={formatFileSize}
                formatDateTime={formatDateTime}
                onPreview={handlePreview}
                onDownloadVersion={handleDownloadVersion}
                onRestoreVersion={handleRestoreVersion}
            />

            <ShareModal
                open={shareVisible}
                onClose={() => {
                    setShareVisible(false);
                    setSharingItem(null);
                }}
                file={sharingItem}
                userOptions={userOptions}
                userLoading={userLoading}
                onSubmit={handleCreateShare}
            />

            <CreateFolderModal
                open={createFolderVisible}
                onClose={() => setCreateFolderVisible(false)}
                onSubmit={handleCreateFolder}
            />

            <RenameModal
                open={renameVisible}
                onClose={() => {
                    setRenameVisible(false);
                    setRenamingItem(null);
                }}
                file={renamingItem}
                onSubmit={handleRenameSubmit}
            />

            <UploadModal
                open={uploadVisible}
                onClose={() => setUploadVisible(false)}
                uploadType={uploadType}
                uploadProgress={uploadProgress}
                maxUploadSizeLabel={maxUploadSizeLabel}
                onUpload={handleUpload}
                onBatchUpload={handleBatchUpload}
            />

            <FilePreviewModal
                open={previewVisible}
                onClose={() => {
                    setPreviewVisible(false);
                    setOfficeContent(null);
                    setMarkdownContent(null);
                }}
                file={viewingFile}
                previewUrl={previewUrl}
                previewLoading={previewLoading}
                officeContent={officeContent}
                markdownContent={markdownContent}
                onDownload={handleDownload}
                formatFileSize={formatFileSize}
            />

            {/* 图片预览组件（独立于 Modal） */}
            <Image
                src={previewUrl || undefined}
                alt={viewingFile?.name || 'preview'}
                style={{ display: 'none' }}
                preview={{
                    open: imagePreviewVisible,
                    onOpenChange: (visible) => {
                        setImagePreviewVisible(visible);
                    },
                    actionsRender: (
                        _,
                        {
                            transform: { scale },
                            actions: {
                                onFlipY,
                                onFlipX,
                                onRotateLeft,
                                onRotateRight,
                                onZoomOut,
                                onZoomIn,
                                onReset,
                            },
                        },
                    ) => (
                        <Space size={12} className="toolbar-wrapper">
                            <DownloadOutlined onClick={() => viewingFile && handleDownload(viewingFile)} />
                            <SwapOutlined rotate={90} onClick={onFlipY} />
                            <SwapOutlined onClick={onFlipX} />
                            <RotateLeftOutlined onClick={onRotateLeft} />
                            <RotateRightOutlined onClick={onRotateRight} />
                            <ZoomOutOutlined disabled={scale === 1} onClick={onZoomOut} />
                            <ZoomInOutlined disabled={scale === 50} onClick={onZoomIn} />
                            <UndoOutlined onClick={onReset} />
                        </Space>
                    ),
                }}
            />
        </PageContainer>
    );
};

export default CloudStorageFilesPage;
