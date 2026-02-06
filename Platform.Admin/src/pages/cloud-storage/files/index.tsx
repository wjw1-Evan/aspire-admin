/**
 * CloudStorageFilesPage - 云存储文件管理页面
 *
 * 重构后的主页面，使用提取的子组件
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { PageContainer, StatCard } from '@/components';
import SearchFormCard from '@/components/SearchFormCard';
import useCommonStyles from '@/hooks/useCommonStyles';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Grid } from 'antd';
import {
    Button,
    Tag,
    Space,
    Row,
    Col,
    Card,
    Form,
    Input,
    Select,
    Breadcrumb,
    Dropdown,
    Image,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
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

const { useBreakpoint } = Grid;

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

const CloudStorageFilesPage: React.FC = () => {
    const intl = useIntl();
    const { success, error } = useMessage();
    const { confirm } = useModal();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // 表格引用
    const actionRef = useRef<ActionType | null>(null);

    // 状态管理
    const [currentPath, setCurrentPath] = useState<string>('');
    const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
    const currentParentIdRef = useRef<string | undefined>(undefined);
    const [pathHistory, setPathHistory] = useState<PathHistoryItem[]>([
        { name: '我的文件', path: '' }
    ]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<FileItem[]>([]);
    const [statistics, setStatistics] = useState<StorageStatistics | null>(null);

    // 搜索相关状态
    const [searchParams, setSearchParams] = useState<SearchParams>({});
    const searchParamsRef = useRef<SearchParams>({});
    const [searchForm] = Form.useForm();
    const { styles } = useCommonStyles();
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

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    // 组件卸载时清理 Blob URL
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // 刷新处理
    const handleRefresh = useCallback(() => {
        actionRef.current?.reload?.();
        loadStatistics();
    }, [loadStatistics]);

    // 数据获取函数
    const fetchData = useCallback(async (params: any, sorter: any) => {
        const { current = 1, pageSize = 20 } = params;

        let sortBy = 'updatedAt';
        let sortOrder: 'asc' | 'desc' = 'desc';

        if (sorter && Object.keys(sorter).length > 0) {
            const field = Object.keys(sorter)[0];
            const order = sorter[field];
            if (order) {
                sortBy = field;
                sortOrder = order === 'ascend' ? 'asc' : 'desc';
            }
        }

        const mergedParams = { ...searchParamsRef.current, ...params };

        try {
            let response;

            if (isSearchMode && (mergedParams.keyword || mergedParams.fileType || mergedParams.tags?.length)) {
                const searchRequest: FileSearchRequest = {
                    keyword: mergedParams.keyword,
                    fileType: mergedParams.fileType,
                    tags: mergedParams.tags,
                    startDate: mergedParams.startDate,
                    endDate: mergedParams.endDate,
                    minSize: mergedParams.minSize,
                    maxSize: mergedParams.maxSize,
                    page: current,
                    pageSize,
                    sortBy,
                    sortOrder,
                };
                response = await searchFiles(searchRequest);
            } else {
                const parentId = currentParentIdRef.current;
                const listRequest: FileListRequest = {
                    parentId: parentId,
                    page: current,
                    pageSize,
                    sortBy,
                    sortOrder,
                };
                response = await getFileList(listRequest);
            }

            if (response.success && response.data) {
                const rawData = response.data.list || response.data.data || [];
                const transformedData = rawData.map(transformFileItem);

                return {
                    data: transformedData,
                    total: response.data.total || 0,
                    success: true,
                };
            }

            return { data: [], total: 0, success: false };
        } catch (err) {
            console.error('Failed to load files:', err);
            return { data: [], total: 0, success: false };
        }
    }, [isSearchMode]);

    // 搜索处理
    const handleSearch = useCallback((values: any) => {
        if (values.dateRange && Array.isArray(values.dateRange) && values.dateRange.length === 2) {
            const [start, end] = values.dateRange;
            values.startDate = start ? dayjs(start).toISOString() : undefined;
            values.endDate = end ? dayjs(end).toISOString() : undefined;
            delete values.dateRange;
        }

        searchParamsRef.current = values;
        setSearchParams(values);
        setIsSearchMode(true);

        actionRef.current?.reloadAndReset?.() || actionRef.current?.reload?.();
    }, []);

    const handleReset = useCallback(() => {
        searchForm.resetFields();
        searchParamsRef.current = {};
        setSearchParams({});
        setIsSearchMode(false);
        actionRef.current?.reloadAndReset?.() || actionRef.current?.reload?.();
    }, [searchForm]);

    // 文件夹导航
    const handleFolderClick = useCallback((folder: FileItem) => {
        const newPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
        const newPathItem = { id: folder.id, name: folder.name, path: newPath };

        currentParentIdRef.current = folder.id;
        setCurrentPath(newPath);
        setCurrentParentId(folder.id);
        setPathHistory(prev => [...prev, newPathItem]);
        setIsSearchMode(false);
        searchForm.resetFields();
        searchParamsRef.current = {};
        setSearchParams({});
        actionRef.current?.reload?.();
    }, [currentPath, searchForm]);

    const handleBreadcrumbClick = useCallback((index: number) => {
        const targetItem = pathHistory[index];
        const newPathHistory = pathHistory.slice(0, index + 1);

        currentParentIdRef.current = targetItem.id;
        setCurrentPath(targetItem.path);
        setCurrentParentId(targetItem.id);
        setPathHistory(newPathHistory);
        setIsSearchMode(false);
        searchForm.resetFields();
        searchParamsRef.current = {};
        setSearchParams({});
        actionRef.current?.reload?.();
    }, [pathHistory, searchForm]);

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
                            setVersionList(versionResp.data.data || []);
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
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.detailFailed' }));
        }
    }, [error, intl, previewUrl]);

    const handleDownload = useCallback(async (file: FileItem) => {
        try {
            if (file.isFolder) {
                await downloadFolder(file.id, file.name);
            } else {
                await downloadFile(file.id, file.name);
            }
            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.downloadStarted' }));
        } catch (err) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.downloadFailed' }));
        }
    }, [success, error, intl]);

    const handleDelete = useCallback(async (file: FileItem) => {
        try {
            await deleteItem(file.id);
            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.deleteSuccess' }));
            actionRef.current?.reload?.();
            loadStatistics();
        } catch (err) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.deleteFailed' }));
        }
    }, [success, error, intl, loadStatistics]);

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
            if (resp.success && resp.data?.users) {
                setUserOptions(resp.data.users);
            }
        } catch (e) {
            console.error('加载用户列表失败', e);
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.loadUsersFailed' }));
        } finally {
            setUserLoading(false);
        }
    }, [error, intl]);

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
            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.shareSuccess' }));
            setShareVisible(false);
            setSharingItem(null);
        } catch (err) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.shareFailed' }));
        }
    }, [sharingItem, success, error, intl]);

    // 批量操作
    const handleBatchDelete = useCallback(async () => {
        if (selectedRowKeys.length === 0) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.selectFilesToDelete' }));
            return;
        }

        confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`,
            onOk: async () => {
                try {
                    await batchDeleteItems({ ids: selectedRowKeys });
                    success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.batchDeleteSuccess' }));
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    actionRef.current?.reload?.();
                    loadStatistics();
                } catch (err) {
                    error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.batchDeleteFailed' }));
                }
            },
        });
    }, [selectedRowKeys, confirm, success, error, intl, loadStatistics]);

    // 创建文件夹
    const handleCreateFolder = useCallback(async (values: CreateFolderRequest) => {
        try {
            await createFolder({ ...values, parentId: currentParentId });
            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.createFolderSuccess' }));
            setCreateFolderVisible(false);
            actionRef.current?.reload?.();
        } catch (err) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.createFolderFailed' }));
        }
    }, [currentParentId, success, error, intl]);

    // 重命名
    const handleRenameSubmit = useCallback(async (values: RenameItemRequest) => {
        if (!renamingItem) return;

        try {
            await renameItem(renamingItem.id, values);
            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.renameSuccess' }));
            setRenameVisible(false);
            setRenamingItem(null);
            actionRef.current?.reload?.();
        } catch (err) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.renameFailed' }));
        }
    }, [renamingItem, success, error, intl]);

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

            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadSuccess' }));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
            actionRef.current?.reload?.();
            loadStatistics();
        } catch (err) {
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadFailed' }));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
        }
    }, [currentParentId, success, error, intl, loadStatistics]);

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
            error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadFailedMsg' }, { label }));
            return false;
        }
    }, [currentParentId, error, intl]);

    const handleBatchUpload = useCallback(async (files: File[]) => {
        if (!files || files.length === 0) return;

        let successCount = 0;
        for (const file of files) {
            const ok = await uploadSingleWithProgress(file);
            if (ok) successCount += 1;
        }

        if (successCount > 0) {
            success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.uploadComplete' }, { count: successCount, total: files.length }));
            actionRef.current?.reload?.();
            loadStatistics();
        }
    }, [loadStatistics, success, intl, uploadSingleWithProgress]);

    // 上传大小提示
    const maxUploadSizeLabel = useMemo(() => formatFileSize(MAX_UPLOAD_BYTES), []);

    // 版本操作
    const handleDownloadVersion = useCallback((versionId: string, fileName: string) => {
        downloadVersion(versionId, fileName);
    }, []);

    const handleRestoreVersion = useCallback((versionId: string) => {
        confirm({
            title: intl.formatMessage({ id: 'pages.cloud-storage.files.confirmRestore.title' }),
            onOk: async () => {
                try {
                    await restoreVersion({ versionId });
                    success(intl.formatMessage({ id: 'pages.cloud-storage.files.message.restoreSuccess' }));
                    actionRef.current?.reload?.();
                    if (viewingFile) {
                        handleView(viewingFile);
                    }
                } catch (e) {
                    error(intl.formatMessage({ id: 'pages.cloud-storage.files.message.restoreFailed' }));
                }
            }
        });
    }, [confirm, success, error, intl, viewingFile, handleView]);

    // 预览处理
    const handlePreview = useCallback(() => {
        const mimeType = viewingFile?.mimeType?.toLowerCase() || '';
        if (isImageFile(mimeType)) {
            setImagePreviewVisible(true);
        } else {
            setPreviewVisible(true);
        }
    }, [viewingFile]);

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
                <Space size="small">
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
                            confirm({
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
    ], [intl, handleFolderClick, handleView, handleOpenShare, handleDownload, handleRename, handleDelete, confirm]);

    return (
        <PageContainer
            title={
                <Space>
                    <CloudOutlined />
                    {intl.formatMessage({ id: 'pages.cloud-storage.files.title' })}
                </Space>
            }
            style={{ paddingBlock: 12 }}
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
                        onClick={handleRefresh}
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
            {/* 统计卡片区域 */}
            {statistics && (
                <Card className={styles.card} style={{ marginBottom: 16 }}>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title={intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.fileCount' })}
                                value={statistics.totalFiles}
                                icon={<FileOutlined />}
                                color="#1890ff"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title={intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.folderCount' })}
                                value={statistics.totalFolders}
                                icon={<FolderOutlined />}
                                color="#52c41a"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title={intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.totalQuota' })}
                                value={formatFileSize(statistics.totalQuota)}
                                icon={<CloudOutlined />}
                                color="#722ed1"
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <StatCard
                                title={intl.formatMessage({ id: 'pages.cloud-storage.files.statistics.usedSpace' })}
                                value={formatFileSize(statistics.usedQuota)}
                                icon={<div style={{ fontSize: 20, color: '#fa8c16', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                    {statistics.totalQuota > 0 ? Math.round((statistics.usedQuota / statistics.totalQuota) * 100) : 0}%
                                </div>}
                                color="#fa8c16"
                                suffix={
                                    <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
                                        / {formatFileSize(statistics.totalQuota)}
                                    </span>
                                }
                            />
                        </Col>
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
            <SearchFormCard>
                <Form
                    form={searchForm}
                    layout={isMobile ? 'vertical' : 'inline'}
                    onFinish={handleSearch}
                >
                    <Form.Item name="keyword" label={intl.formatMessage({ id: 'pages.cloud-storage.files.search.keyword' })}>
                        <Input
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.search.placeholder' })}
                            style={isMobile ? { width: '100%' } : { width: 200 }}
                        />
                    </Form.Item>
                    <Form.Item name="fileType" label={intl.formatMessage({ id: 'pages.cloud-storage.files.search.fileType' })}>
                        <Select
                            placeholder={intl.formatMessage({ id: 'pages.cloud-storage.files.search.typePlaceholder' })}
                            style={isMobile ? { width: '100%' } : { width: 120 }}
                            allowClear
                        >
                            <Select.Option value="image">{intl.formatMessage({ id: 'pages.cloud-storage.files.search.type.image' })}</Select.Option>
                            <Select.Option value="document">{intl.formatMessage({ id: 'pages.cloud-storage.files.search.type.document' })}</Select.Option>
                            <Select.Option value="video">{intl.formatMessage({ id: 'pages.cloud-storage.files.search.type.video' })}</Select.Option>
                            <Select.Option value="audio">{intl.formatMessage({ id: 'pages.cloud-storage.files.search.type.audio' })}</Select.Option>
                            <Select.Option value="archive">{intl.formatMessage({ id: 'pages.cloud-storage.files.search.type.archive' })}</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SearchOutlined />}
                                style={isMobile ? { width: '100%' } : {}}
                            >
                                {intl.formatMessage({ id: 'pages.button.search' })}
                            </Button>
                            <Button
                                onClick={handleReset}
                                style={isMobile ? { width: '100%' } : {}}
                            >
                                {intl.formatMessage({ id: 'pages.button.reset' })}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </SearchFormCard>

            {/* 数据表格 */}
            <DataTable
                actionRef={actionRef}
                columns={columns}
                request={fetchData}
                rowKey="id"
                search={false}
                scroll={{ x: 'max-content' }}
                pagination={{
                    pageSize: 20,
                    pageSizeOptions: [10, 20, 50, 100],
                    showSizeChanger: true,
                    showQuickJumper: true,
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
