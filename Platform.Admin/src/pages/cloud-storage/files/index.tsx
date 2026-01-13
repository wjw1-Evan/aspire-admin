import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components';
import DataTable from '@/components/DataTable';
import type { ActionType } from '@/types/pro-components';
import { useIntl } from '@umijs/max';
import { Grid } from 'antd';
import {
    Button,
    Tag,
    Space,
    Modal,
    Drawer,
    Row,
    Col,
    Card,
    Form,
    Input,
    DatePicker,
    Select,
    Descriptions,
    Spin,
    Upload,
    Progress,
    Breadcrumb,
    Dropdown,
    Popconfirm,
    message,
    Table,
    Divider,
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
    CopyOutlined,
    ScissorOutlined,
    EyeOutlined,
    HistoryOutlined,
    UploadOutlined,
    FolderAddOutlined,
    HomeOutlined,
    MoreOutlined,
    SearchOutlined,
    FilterOutlined,
    CalendarOutlined,
    UserOutlined,
    TagOutlined,
    FileTextOutlined,
    RotateLeftOutlined,
    RotateRightOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    SwapOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { marked } from 'marked';

const { useBreakpoint } = Grid;
const { Dragger } = Upload;

import {
    getFileList,
    getFileDetail,
    createFolder,
    renameItem,
    moveItem,
    copyItem,
    deleteItem,
    batchDeleteItems,
    batchMoveItems,
    uploadFile,
    batchUploadFiles,
    downloadFile,
    getFilePreviewUrl,
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
    type MoveItemRequest,
    type CopyItemRequest,
    type FileUploadRequest,
    type BatchUploadRequest,
    type BatchOperationRequest,
    type FileSearchRequest,
    type StorageStatistics,
    type FileVersion,
} from '@/services/cloud-storage';
import { createShare, type CreateShareRequest } from '@/services/cloud-storage/shareApi';
import { getAllUsers, type AppUser } from '@/services/user/api';

// 与后端保持一致的上传体积上限（5GB）
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

interface SearchParams {
    keyword?: string;
    fileType?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
    minSize?: number;
    maxSize?: number;
}

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
    // 使用 ref 存储 currentParentId，确保 fetchData 能获取到最新值
    const currentParentIdRef = useRef<string | undefined>(undefined);
    const [pathHistory, setPathHistory] = useState<Array<{ id?: string; name: string; path: string }>>([
        { name: '我的文件', path: '' }
    ]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<FileItem[]>([]);
    const [statistics, setStatistics] = useState<StorageStatistics | null>(null);

    // 搜索相关状态
    const [searchParams, setSearchParams] = useState<SearchParams>({});
    const searchParamsRef = useRef<SearchParams>({});
    const [searchForm] = Form.useForm();
    const [isSearchMode, setIsSearchMode] = useState(false);

    // 弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [officeContent, setOfficeContent] = useState<{ type: 'word' | 'excel' | 'ppt'; content: any } | null>(null);
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);
    const [versionList, setVersionList] = useState<FileVersion[]>([]);
    const [versionLoading, setVersionLoading] = useState(false);
    const [createFolderVisible, setCreateFolderVisible] = useState(false);
    const [renameVisible, setRenameVisible] = useState(false);
    const [renamingItem, setRenamingItem] = useState<FileItem | null>(null);
    const [uploadVisible, setUploadVisible] = useState(false);
    const [uploadType, setUploadType] = useState<'file' | 'folder'>('file');
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: { percent: number; label: string } }>({});
    const [shareVisible, setShareVisible] = useState(false);
    const [sharingItem, setSharingItem] = useState<FileItem | null>(null);
    const [userOptions, setUserOptions] = useState<AppUser[]>([]);
    const [userLoading, setUserLoading] = useState(false);

    // 表单
    const [createFolderForm] = Form.useForm();
    const [renameForm] = Form.useForm();
    const [shareForm] = Form.useForm();

    // 加载统计数据
    const loadStatistics = useCallback(async () => {
        try {
            const response = await getStorageStatistics();
            if (response.success && response.data) {
                // 转换后端数据格式到前端期望的格式
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
                            count: 0, // API 没有提供每种类型的文件数量
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

        // 处理排序
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

        // 合并搜索参数，使用 ref 确保获取最新的搜索参数
        const mergedParams = { ...searchParamsRef.current, ...params };

        try {
            let response;

            if (isSearchMode && (mergedParams.keyword || mergedParams.fileType || mergedParams.tags?.length)) {
                // 搜索模式
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
                // 正常文件列表模式
                // 使用 ref 获取最新的 parentId，避免闭包问题
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
                // 后端返回的数据在 list 字段中，而不是 data 字段
                const rawData = response.data.list || response.data.data || [];
                // 转换后端数据格式到前端期望的格式
                const transformedData = rawData.map((item: any) => {
                    // 提取文件扩展名（如果还没有）
                    const extension = item.extension || (() => {
                        if (item.type === 'folder' || item.type === 1) return undefined;
                        const nameParts = item.name?.split('.');
                        return nameParts && nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : undefined;
                    })();

                    return {
                        ...item,
                        // 将 type 字段转换为 isFolder 布尔值
                        isFolder: item.type === 'folder' || item.type === 1,
                        // 确保字段名称匹配
                        createdByName: item.createdByName || item.createdByUsername || '',
                        updatedByName: item.updatedByName || item.updatedByUsername || '',
                        // 确保 parentId 为空字符串时转换为 undefined
                        parentId: item.parentId && item.parentId.trim() ? item.parentId : undefined,
                        // 确保 extension 字段存在
                        extension,
                        // 确保 tags 是数组
                        tags: Array.isArray(item.tags) ? item.tags : [],
                        // 确保 isPublic 有默认值
                        isPublic: item.isPublic !== undefined ? item.isPublic : false,
                    };
                });

                return {
                    data: transformedData,
                    total: response.data.total || 0,
                    success: true,
                };
            }

            return {
                data: [],
                total: 0,
                success: false,
            };
        } catch (err) {
            console.error('Failed to load files:', err);
            return {
                data: [],
                total: 0,
                success: false,
            };
        }
    }, [isSearchMode]);

    // 搜索处理
    const handleSearch = useCallback((values: any) => {
        // 处理日期范围
        if (values.dateRange && Array.isArray(values.dateRange) && values.dateRange.length === 2) {
            const [start, end] = values.dateRange;
            values.startDate = start ? dayjs(start).toISOString() : undefined;
            values.endDate = end ? dayjs(end).toISOString() : undefined;
            delete values.dateRange;
        }

        // 同时更新 state 和 ref
        searchParamsRef.current = values;
        setSearchParams(values);
        setIsSearchMode(true);

        // 重新加载数据
        if (actionRef.current?.reloadAndReset) {
            actionRef.current.reloadAndReset?.();
        } else if (actionRef.current?.reload) {
            actionRef.current.reload?.();
        }
    }, []);

    const handleReset = useCallback(() => {
        searchForm.resetFields();
        // 同时更新 state 和 ref
        searchParamsRef.current = {};
        setSearchParams({});
        setIsSearchMode(false);

        if (actionRef.current?.reloadAndReset) {
            actionRef.current.reloadAndReset?.();
        } else if (actionRef.current?.reload) {
            actionRef.current.reload?.();
        }
    }, [searchForm]);

    // 文件夹导航
    const handleFolderClick = useCallback((folder: FileItem) => {
        const newPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
        const newPathItem = { id: folder.id, name: folder.name, path: newPath };

        // 先更新 ref，确保 fetchData 能获取到最新值
        currentParentIdRef.current = folder.id;
        setCurrentPath(newPath);
        setCurrentParentId(folder.id);
        setPathHistory(prev => [...prev, newPathItem]);
        setIsSearchMode(false);
        searchForm.resetFields();
        searchParamsRef.current = {};
        setSearchParams({});

        // 重新加载数据
        actionRef.current?.reload?.();
    }, [currentPath, searchForm]);

    const handleBreadcrumbClick = useCallback((index: number) => {
        const targetItem = pathHistory[index];
        const newPathHistory = pathHistory.slice(0, index + 1);

        // 先更新 ref，确保 fetchData 能获取到最新值
        currentParentIdRef.current = targetItem.id;
        setCurrentPath(targetItem.path);
        setCurrentParentId(targetItem.id);
        setPathHistory(newPathHistory);
        setIsSearchMode(false);
        searchForm.resetFields();
        searchParamsRef.current = {};
        setSearchParams({});

        // 重新加载数据
        actionRef.current?.reload?.();
    }, [pathHistory, searchForm]);

    // 文件操作
    const handleView = useCallback(async (file: FileItem) => {
        try {
            // 先清理之前的 Blob URL（如果存在）
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
            }

            const response = await getFileDetail(file.id);
            if (response.success && response.data) {
                // 转换后端数据格式到前端期望的格式
                const fileData = response.data as any;

                // 加载历史版本（仅文件）
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
                const transformedFile: FileItem = {
                    ...fileData,
                    isFolder: fileData.type === 'folder' || fileData.type === 1,
                    createdByName: fileData.createdByName || fileData.createdByUsername || '',
                    updatedByName: fileData.updatedByName || fileData.updatedByUsername || '',
                    parentId: fileData.parentId && fileData.parentId.trim() ? fileData.parentId : undefined,
                    tags: Array.isArray(fileData.tags) ? fileData.tags : [],
                    isPublic: fileData.isPublic !== undefined ? fileData.isPublic : false,
                };
                setViewingFile(transformedFile);
                setDetailVisible(true);

                // 如果是文件且支持预览，创建 Blob URL
                if (!transformedFile.isFolder) {
                    try {
                        setPreviewLoading(true);

                        // 使用认证的请求下载文件
                        const token = tokenUtils.getToken();
                        const response = await fetch(`/api/cloud-storage/files/${file.id}/download`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (!response.ok) {
                            throw new Error('Failed to load preview');
                        }

                        // 将响应转换为 Blob
                        const blob = await response.blob();

                        // 创建 Blob URL
                        const blobUrl = URL.createObjectURL(blob);
                        setPreviewUrl(blobUrl);

                        // 检测 Office 文件并解析
                        const mimeType = transformedFile.mimeType?.toLowerCase() || '';
                        const fileName = transformedFile.name?.toLowerCase() || '';

                        // Excel 文件
                        if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || fileName.match(/\.xlsx?$/)) {
                            try {
                                const arrayBuffer = await blob.arrayBuffer();
                                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                                setOfficeContent({ type: 'excel', content: workbook });
                            } catch (err) {
                                console.error('Failed to parse Excel file', err);
                            }
                        }
                        // Word 文件 (.docx)
                        else if ((mimeType.includes('word') || mimeType.includes('document')) && fileName.endsWith('.docx')) {
                            try {
                                const arrayBuffer = await blob.arrayBuffer();
                                const result = await mammoth.convertToHtml({ arrayBuffer });
                                setOfficeContent({ type: 'word', content: result.value });
                            } catch (err) {
                                console.error('Failed to parse Word file', err);
                            }
                        }
                        // Markdown 文件
                        else if (mimeType.includes('markdown') || fileName.endsWith('.md')) {
                            try {
                                const text = await blob.text();
                                setMarkdownContent(text);
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
            error('获取文件详情失败');
        }
    }, [error, previewUrl]);

    const handleDownload = useCallback(async (file: FileItem) => {
        try {
            if (file.isFolder) {
                await downloadFolder(file.id, file.name);
            } else {
                await downloadFile(file.id, file.name);
            }
            success('下载开始');
        } catch (err) {
            error('下载失败');
        }
    }, [success, error]);

    const handleDelete = useCallback(async (file: FileItem) => {
        try {
            await deleteItem(file.id);
            success('删除成功');
            actionRef.current?.reload?.();
            loadStatistics();
        } catch (err) {
            error('删除失败');
        }
    }, [success, error, loadStatistics]);

    const handleRename = useCallback((file: FileItem) => {
        setRenamingItem(file);
        renameForm.setFieldsValue({ name: file.name });
        setRenameVisible(true);
    }, [renameForm]);

    // 创建分享
    const handleOpenShare = useCallback((file: FileItem) => {
        setSharingItem(file);
        shareForm.resetFields();
        shareForm.setFieldsValue({
            shareType: 'internal',
            accessType: 'view',
            password: undefined,
            expiresAt: undefined,
            maxDownloads: undefined,
        });
        setShareVisible(true);
    }, [shareForm]);

    const loadUsers = useCallback(async () => {
        try {
            setUserLoading(true);
            const resp = await getAllUsers();
            if (resp.success && resp.data?.users) {
                setUserOptions(resp.data.users);
            }
        } catch (e) {
            console.error('加载用户列表失败', e);
            error('无法加载用户列表');
        } finally {
            setUserLoading(false);
        }
    }, [error]);

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
            success('创建分享成功');
            setShareVisible(false);
            setSharingItem(null);
            shareForm.resetFields();
        } catch (err) {
            error('创建分享失败');
        }
    }, [sharingItem, success, error, shareForm]);

    // 批量操作
    const handleBatchDelete = useCallback(async () => {
        if (selectedRowKeys.length === 0) {
            error('请选择要删除的文件');
            return;
        }

        confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`,
            onOk: async () => {
                try {
                    await batchDeleteItems({ ids: selectedRowKeys });
                    success('批量删除成功');
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    actionRef.current?.reload?.();
                    loadStatistics();
                } catch (err) {
                    error('批量删除失败');
                }
            },
        });
    }, [selectedRowKeys, confirm, success, error, loadStatistics]);

    // 创建文件夹
    const handleCreateFolder = useCallback(async (values: CreateFolderRequest) => {
        try {
            await createFolder({
                ...values,
                parentId: currentParentId,
            });
            success('创建文件夹成功');
            setCreateFolderVisible(false);
            createFolderForm.resetFields();
            actionRef.current?.reload?.();
        } catch (err) {
            error('创建文件夹失败');
        }
    }, [currentParentId, success, error, createFolderForm]);

    // 重命名
    const handleRenameSubmit = useCallback(async (values: RenameItemRequest) => {
        if (!renamingItem) return;

        try {
            await renameItem(renamingItem.id, values);
            success('重命名成功');
            setRenameVisible(false);
            setRenamingItem(null);
            renameForm.resetFields();
            actionRef.current?.reload?.();
        } catch (err) {
            error('重命名失败');
        }
    }, [renamingItem, success, error, renameForm]);

    // 文件上传
    const handleUpload = useCallback(async (file: File) => {
        const uploadId = `${Date.now()}_${file.name}`;
        const label = file.name;

        try {
            setUploadProgress(prev => ({ ...prev, [uploadId]: { percent: 0, label } }));

            await uploadFile(
                {
                    file,
                    parentId: currentParentId,
                },
                (percent) => {
                    setUploadProgress(prev => ({ ...prev, [uploadId]: { percent, label: prev[uploadId]?.label || label } }));
                }
            );

            success('上传成功');
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
            actionRef.current?.reload?.();
            loadStatistics();
        } catch (err) {
            error('上传失败');
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
        }
    }, [currentParentId, success, error, loadStatistics]);

    // 单个文件（含相对路径）上传，便于分条显示进度
    const uploadSingleWithProgress = useCallback(async (file: File) => {
        const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
        const relativePath = (file as any).webkitRelativePath as string | undefined;
        const label = relativePath || file.name;

        try {
            setUploadProgress(prev => ({ ...prev, [uploadId]: { percent: 0, label } }));

            await batchUploadFiles(
                {
                    files: [file],
                    parentId: currentParentId,
                },
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
            error(`上传失败：${label}`);
            return false;
        }
    }, [currentParentId, error]);

    // 文件夹/多文件上传：逐文件上传并逐条显示进度
    const handleBatchUpload = useCallback(async (files: File[]) => {
        if (!files || files.length === 0) return;

        let successCount = 0;
        for (const file of files) {
            const ok = await uploadSingleWithProgress(file);
            if (ok) successCount += 1;
        }

        if (successCount > 0) {
            success(`上传完成：${successCount}/${files.length}`);
            actionRef.current?.reload?.();
            loadStatistics();
        }
    }, [loadStatistics, success, uploadSingleWithProgress]);

    // 格式化文件大小
    const formatFileSize = useCallback((bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    // 上传大小提示
    const maxUploadSizeLabel = useMemo(() => formatFileSize(MAX_UPLOAD_BYTES), [formatFileSize]);

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

    // 获取文件图标
    const getFileIcon = useCallback((file: FileItem) => {
        if (file.isFolder) {
            return <FolderOutlined style={{ color: '#1890ff' }} />;
        }

        const ext = file.extension?.toLowerCase();
        switch (ext) {
            case 'pdf':
                return <FileOutlined style={{ color: '#ff4d4f' }} />;
            case 'doc':
            case 'docx':
                return <FileTextOutlined style={{ color: '#1890ff' }} />;
            case 'xls':
            case 'xlsx':
                return <FileOutlined style={{ color: '#52c41a' }} />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <FileOutlined style={{ color: '#722ed1' }} />;
            default:
                return <FileOutlined />;
        }
    }, []);

    // 表格列定义
    const columns = [
        {
            title: '名称',
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
            title: '大小',
            dataIndex: 'size',
            key: 'size',
            sorter: true,
            render: (size: number, record: FileItem) =>
                record.isFolder ? '-' : formatFileSize(size),
        },
        {
            title: '修改时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            sorter: true,
            render: (time: string) => formatDateTime(time),
        },
        {
            title: '创建者',
            dataIndex: 'createdByName',
            key: 'createdByName',
        },
        {
            title: '操作',
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
                        分享
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(record)}
                    >
                        下载
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleRename(record)}
                    >
                        重命名
                    </Button>
                    <Popconfirm
                        title="确认删除"
                        description={`确定要删除${record.isFolder ? '文件夹' : '文件'} "${record.name}" 吗？`}
                        onConfirm={() => handleDelete(record)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
                            批量删除 ({selectedRowKeys.length})
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
                        新建文件夹
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'file',
                                    label: '上传文件',
                                    icon: <FileOutlined />,
                                    onClick: () => {
                                        setUploadType('file');
                                        setUploadVisible(true);
                                    },
                                },
                                {
                                    key: 'folder',
                                    label: '上传文件夹',
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
                            上传 <MoreOutlined style={{ fontSize: 12 }} />
                        </Button>
                    </Dropdown>
                </Space>
            }
        >
            {/* 统计卡片区域 */}
            {statistics && (
                <Card style={{ marginBottom: 16, borderRadius: 12 }}>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <FileOutlined style={{ fontSize: 20, color: '#1890ff', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{statistics.totalFiles}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>文件数量</div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <FolderOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{statistics.totalFolders}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>文件夹数量</div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <CloudOutlined style={{ fontSize: 20, color: '#722ed1', marginRight: 12 }} />
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatFileSize(statistics.totalQuota)}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>总配额</div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                                <div style={{ fontSize: 20, color: '#fa8c16', marginRight: 12 }}>
                                    {statistics.totalQuota > 0 ? Math.round((statistics.usedQuota / statistics.totalQuota) * 100) : 0}%
                                </div>
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatFileSize(statistics.usedQuota)}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>已用空间</div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* 面包屑导航 */}
            <Card style={{ marginBottom: 16 }}>
                <Breadcrumb
                    items={pathHistory.map((item, index) => ({
                        key: index,
                        title: index === 0 ? (
                            <Space>
                                <HomeOutlined />
                                <a onClick={() => handleBreadcrumbClick(index)}>{item.name}</a>
                            </Space>
                        ) : (
                            <a onClick={() => handleBreadcrumbClick(index)}>{item.name}</a>
                        )
                    }))}
                />
            </Card>

            {/* 搜索表单 */}
            <Card style={{ marginBottom: 16 }}>
                <Form
                    form={searchForm}
                    layout={isMobile ? 'vertical' : 'inline'}
                    onFinish={handleSearch}
                >
                    <Form.Item name="keyword" label="关键词">
                        <Input
                            placeholder="搜索文件名"
                            style={isMobile ? { width: '100%' } : { width: 200 }}
                        />
                    </Form.Item>
                    <Form.Item name="fileType" label="文件类型">
                        <Select
                            placeholder="选择文件类型"
                            style={isMobile ? { width: '100%' } : { width: 120 }}
                            allowClear
                        >
                            <Select.Option value="image">图片</Select.Option>
                            <Select.Option value="document">文档</Select.Option>
                            <Select.Option value="video">视频</Select.Option>
                            <Select.Option value="audio">音频</Select.Option>
                            <Select.Option value="archive">压缩包</Select.Option>
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

            {/* 文件详情抽屉 */}
            <Drawer
                title="文件详情"
                placement="right"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                styles={{ wrapper: { width: isMobile ? '100%' : 600 } }}
            >
                <Spin spinning={!viewingFile}>
                    {viewingFile ? (
                        <>
                            <Card title="基本信息" style={{ marginBottom: 16 }}>
                                <Descriptions column={isMobile ? 1 : 2} size="small">
                                    <Descriptions.Item
                                        label={<Space><FileOutlined />名称</Space>}
                                        span={2}
                                    >
                                        {viewingFile.name}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><TagOutlined />类型</Space>}
                                    >
                                        {viewingFile.isFolder ? '文件夹' : (viewingFile.mimeType || '文件')}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CloudOutlined />大小</Space>}
                                    >
                                        {viewingFile.isFolder ? '-' : formatFileSize(viewingFile.size)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />创建时间</Space>}
                                    >
                                        {formatDateTime(viewingFile.createdAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><CalendarOutlined />修改时间</Space>}
                                    >
                                        {formatDateTime(viewingFile.updatedAt)}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />创建者</Space>}
                                    >
                                        {viewingFile.createdByName || viewingFile.createdByUsername || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label={<Space><UserOutlined />修改者</Space>}
                                    >
                                        {viewingFile.updatedByName || viewingFile.updatedByUsername || '-'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {viewingFile.description && (
                                <Card title="描述" style={{ marginBottom: 16 }}>
                                    <p>{viewingFile.description}</p>
                                </Card>
                            )}

                            {viewingFile.tags && viewingFile.tags.length > 0 && (
                                <Card title="标签" style={{ marginBottom: 16 }}>
                                    <Space wrap>
                                        {viewingFile.tags.map((tag, index) => (
                                            <Tag key={index}>{tag}</Tag>
                                        ))}
                                    </Space>
                                </Card>
                            )}

                            {!viewingFile.isFolder && (
                                <Card title="历史版本" style={{ marginBottom: 16 }}>
                                    <Spin spinning={versionLoading}>
                                        {versionList.length === 0 ? (
                                            <div style={{ color: '#999' }}>暂无历史版本</div>
                                        ) : (
                                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                                {versionList.map((record) => (
                                                    <div
                                                        key={record.id}
                                                        style={{
                                                            border: '1px solid #f0f0f0',
                                                            borderRadius: 8,
                                                            padding: 12,
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: 12,
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontWeight: 600 }}>版本 {record.versionNumber}</div>
                                                            <div style={{ color: '#666', fontSize: 12 }}>
                                                                {formatFileSize(record.size)} · {formatDateTime(record.createdAt)} · {record.createdByName || '-'}
                                                            </div>
                                                            {record.comment && (
                                                                <div style={{ marginTop: 4, color: '#555' }}>备注：{record.comment}</div>
                                                            )}
                                                        </div>
                                                        <Space size="small" wrap>
                                                            <Button
                                                                size="small"
                                                                onClick={() => downloadVersion(record.id, `${viewingFile.name}_v${record.versionNumber}`)}
                                                            >
                                                                下载
                                                            </Button>
                                                            <Popconfirm
                                                                title="确认恢复此版本？"
                                                                onConfirm={async () => {
                                                                    try {
                                                                        await restoreVersion({ versionId: record.id });
                                                                        success('已恢复到该版本');
                                                                        actionRef.current?.reload?.();
                                                                        handleView(viewingFile);
                                                                    } catch (e) {
                                                                        error('恢复失败');
                                                                    }
                                                                }}
                                                            >
                                                                <Button size="small" type="primary">恢复</Button>
                                                            </Popconfirm>
                                                        </Space>
                                                    </div>
                                                ))}
                                            </Space>
                                        )}
                                    </Spin>
                                </Card>
                            )}

                            {!viewingFile.isFolder && (
                                <Card title="预览" style={{ marginBottom: 16 }}>
                                    <Button
                                        type="primary"
                                        block
                                        icon={<EyeOutlined />}
                                        onClick={() => {
                                            const mimeType = viewingFile?.mimeType?.toLowerCase() || '';
                                            if (mimeType.startsWith('image/')) {
                                                setImagePreviewVisible(true);
                                            } else {
                                                setPreviewVisible(true);
                                            }
                                        }}
                                        disabled={!previewUrl && !previewLoading}
                                        loading={previewLoading}
                                    >
                                        立即预览
                                    </Button>
                                </Card>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            未加载数据
                        </div>
                    )}
                </Spin>
            </Drawer>

            {/* 创建分享弹窗 */}
            <Modal
                title="创建分享"
                open={shareVisible}
                onCancel={() => {
                    setShareVisible(false);
                    setSharingItem(null);
                    shareForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={shareForm}
                    layout="vertical"
                    onFinish={handleCreateShare}
                >
                    <Form.Item label="分享对象">
                        <Input
                            value={sharingItem ? `${sharingItem.isFolder ? '文件夹' : '文件'}：${sharingItem.name}` : ''}
                            disabled
                        />
                    </Form.Item>
                    <Form.Item
                        name="shareType"
                        label="分享类型"
                        rules={[{ required: true, message: '请选择分享类型' }]}
                    >
                        <Select placeholder="请选择分享类型">
                            <Select.Option value="internal">内部分享</Select.Option>
                            <Select.Option value="external">外部分享</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, next) => prev.shareType !== next.shareType}>
                        {({ getFieldValue }) =>
                            getFieldValue('shareType') === 'internal' ? (
                                <Form.Item
                                    name="allowedUserIds"
                                    label="选择可访问用户"
                                    rules={[{ required: true, message: '请选择内部分享的可访问用户' }]}
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="请选择可访问的用户"
                                        loading={userLoading}
                                        optionFilterProp="label"
                                        showSearch
                                    >
                                        {userOptions.map((user) => (
                                            <Select.Option key={user.id} value={user.id} label={user.name || user.username}>
                                                {user.name || user.username}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>
                    <Form.Item
                        name="accessType"
                        label="访问权限"
                        rules={[{ required: true, message: '请选择访问权限' }]}
                    >
                        <Select placeholder="请选择访问权限">
                            <Select.Option value="view">仅查看</Select.Option>
                            <Select.Option value="download">查看和下载</Select.Option>
                            <Select.Option value="edit">查看、下载和编辑</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="password" label="访问密码">
                        <Input.Password placeholder="设置访问密码（可选）" />
                    </Form.Item>
                    <Form.Item name="expiresAt" label="过期时间">
                        <DatePicker
                            showTime
                            placeholder="设置过期时间（可选）"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item name="maxDownloads" label="下载次数限制">
                        <Input
                            type="number"
                            placeholder="设置最大下载次数（可选）"
                            min={1}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" disabled={!sharingItem}>
                                创建分享
                            </Button>
                            <Button
                                onClick={() => {
                                    setShareVisible(false);
                                    setSharingItem(null);
                                    shareForm.resetFields();
                                }}
                            >
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 创建文件夹弹窗 */}
            <Modal
                title="新建文件夹"
                open={createFolderVisible}
                onCancel={() => {
                    setCreateFolderVisible(false);
                    createFolderForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={createFolderForm}
                    layout="vertical"
                    onFinish={handleCreateFolder}
                >
                    <Form.Item
                        name="name"
                        label="文件夹名称"
                        rules={[
                            { required: true, message: '请输入文件夹名称' },
                            { max: 100, message: '文件夹名称不能超过100个字符' },
                        ]}
                    >
                        <Input placeholder="请输入文件夹名称" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input.TextArea
                            placeholder="请输入描述（可选）"
                            rows={3}
                            maxLength={500}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                创建
                            </Button>
                            <Button
                                onClick={() => {
                                    setCreateFolderVisible(false);
                                    createFolderForm.resetFields();
                                }}
                            >
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 重命名弹窗 */}
            <Modal
                title="重命名"
                open={renameVisible}
                onCancel={() => {
                    setRenameVisible(false);
                    setRenamingItem(null);
                    renameForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={renameForm}
                    layout="vertical"
                    onFinish={handleRenameSubmit}
                >
                    <Form.Item
                        name="name"
                        label="新名称"
                        rules={[
                            { required: true, message: '请输入新名称' },
                            { max: 100, message: '名称不能超过100个字符' },
                        ]}
                    >
                        <Input placeholder="请输入新名称" />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                确定
                            </Button>
                            <Button
                                onClick={() => {
                                    setRenameVisible(false);
                                    setRenamingItem(null);
                                    renameForm.resetFields();
                                }}
                            >
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 上传弹窗 */}
            <Modal
                title={uploadType === 'folder' ? '上传文件夹' : '上传文件'}
                open={uploadVisible}
                onCancel={() => setUploadVisible(false)}
                footer={null}
                width={600}
            >
                <Dragger
                    name="file"
                    multiple
                    directory={uploadType === 'folder'}
                    showUploadList={false}
                    beforeUpload={(file, fileList) => {
                        // Antd 会对同一批次的每个文件逐个触发 beforeUpload，这里只在首个文件上触发自定义上传，避免重复提交
                        if (fileList && fileList[0] && file.uid !== fileList[0].uid) {
                            return false;
                        }

                        const list = fileList && fileList.length > 0 ? fileList : [file];
                        const hasDirectory = list.some((f) => (f as any).webkitRelativePath);

                        if (hasDirectory || list.length > 1) {
                            handleBatchUpload(list as File[]);
                        } else {
                            handleUpload(file as File);
                        }

                        return false; // 阻止默认上传行为
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                    <p className="ant-upload-hint">
                        支持单个文件、批量文件或整个文件夹上传，单文件最大 {maxUploadSizeLabel}
                    </p>
                </Dragger>

                {/* 上传进度 */}
                {Object.keys(uploadProgress).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <h4>上传进度</h4>
                        {Object.entries(uploadProgress).map(([uploadId, info]) => {
                            const { percent, label } = info;
                            return (
                                <div key={uploadId} style={{ marginBottom: 8 }}>
                                    <div>{label}</div>
                                    <Progress percent={percent} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </Modal>

            <Modal
                title={viewingFile?.name || '文件预览'}
                open={previewVisible}
                onCancel={() => {
                    // 只关闭窗口，不清空 previewUrl，这样可以再次打开预览
                    setPreviewVisible(false);
                    setOfficeContent(null);
                    setMarkdownContent(null);
                }}
                footer={[
                    <Button key="download" icon={<DownloadOutlined />} onClick={() => viewingFile && handleDownload(viewingFile)}>
                        下载文件
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setPreviewVisible(false)}>
                        关闭
                    </Button>
                ]}
                width={1000}
                centered
                destroyOnHidden
                styles={{ body: { padding: 0, backgroundColor: '#f5f5f5', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' } }}
            >
                {previewUrl ? (
                    (() => {
                        const mimeType = viewingFile?.mimeType?.toLowerCase() || '';
                        if (mimeType.startsWith('video/')) {
                            return <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '100%' }} autoPlay />;
                        }
                        if (mimeType.startsWith('audio/')) {
                            return <audio src={previewUrl} controls autoPlay />;
                        }
                        if (mimeType === 'application/pdf') {
                            return <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="pdf-preview" />;
                        }

                        // Office 文件预览
                        const isOfficeFile =
                            mimeType.includes('word') ||
                            mimeType.includes('excel') ||
                            mimeType.includes('powerpoint') ||
                            mimeType.includes('officedocument') ||
                            mimeType === 'application/vnd.ms-excel' ||
                            mimeType === 'application/vnd.ms-powerpoint' ||
                            mimeType === 'application/msword' ||
                            viewingFile?.name?.match(/\.(docx?|xlsx?|pptx?|doc|xls|ppt)$/i);

                        if (isOfficeFile && officeContent) {
                            // Excel 预览
                            if (officeContent.type === 'excel') {
                                const workbook = officeContent.content;
                                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                const htmlTable = XLSX.utils.sheet_to_html(firstSheet);

                                return (
                                    <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#fff', padding: 20 }}>
                                        <style>{`
                                            #excel-table table {
                                                border-collapse: collapse;
                                                width: 100%;
                                            }
                                            #excel-table td, #excel-table th {
                                                border: 1px solid #d9d9d9;
                                                padding: 8px;
                                                text-align: left;
                                            }
                                            #excel-table th {
                                                background-color: #fafafa;
                                                font-weight: 600;
                                            }
                                        `}</style>
                                        <div id="excel-table" dangerouslySetInnerHTML={{ __html: htmlTable }} />
                                    </div>
                                );
                            }
                            // Word 预览
                            else if (officeContent.type === 'word') {
                                return (
                                    <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '40px 20px' }}>
                                        <div
                                            style={{
                                                maxWidth: 800,
                                                margin: '0 auto',
                                                backgroundColor: '#fff',
                                                padding: '40px 60px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                minHeight: '100%',
                                                lineHeight: 1.6
                                            }}
                                            dangerouslySetInnerHTML={{ __html: officeContent.content }}
                                        />
                                    </div>
                                );
                            }
                        }

                        if (markdownContent !== null) {
                            return (
                                <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#fff', padding: '20px' }}>
                                    <style>{`
                                        .markdown-preview {
                                            line-height: 1.6;
                                            color: #333;
                                        }
                                        .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 {
                                            border-bottom: 1px solid #eee;
                                            padding-bottom: 0.3em;
                                            margin-top: 1.5em;
                                        }
                                        .markdown-preview code {
                                            background-color: #f6f8fa;
                                            padding: 0.2em 0.4em;
                                            border-radius: 3px;
                                            font-family: monospace;
                                        }
                                        .markdown-preview pre {
                                            background-color: #f6f8fa;
                                            padding: 16px;
                                            border-radius: 6px;
                                            overflow: auto;
                                        }
                                        .markdown-preview blockquote {
                                            border-left: 4px solid #dfe2e5;
                                            color: #6a737d;
                                            padding-left: 1em;
                                            margin-left: 0;
                                        }
                                        .markdown-preview img {
                                            max-width: 100%;
                                        }
                                    `}</style>
                                    <div
                                        className="markdown-preview"
                                        style={{
                                            maxWidth: 900,
                                            margin: '0 auto',
                                            padding: '20px 40px',
                                        }}
                                        dangerouslySetInnerHTML={{ __html: marked.parse(markdownContent) }}
                                    />
                                </div>
                            );
                        }

                        if (isOfficeFile) {
                            // 判断文件类型显示对应名称
                            let fileTypeName = 'Office  文档';

                            if (mimeType.includes('word') || viewingFile?.name?.match(/\.docx?$/i)) {
                                fileTypeName = 'Word 文档';
                            } else if (mimeType.includes('excel') || viewingFile?.name?.match(/\.xlsx?$/i)) {
                                fileTypeName = 'Excel 表格';
                            } else if (mimeType.includes('powerpoint') || viewingFile?.name?.match(/\.pptx?$/i)) {
                                fileTypeName = 'PowerPoint 演示文稿';
                            }

                            return (
                                <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                                    <div style={{ fontSize: 72, color: '#1890ff', marginBottom: 24 }}>
                                        <FileTextOutlined />
                                    </div>
                                    <h2 style={{ marginBottom: 16 }}>{fileTypeName}</h2>
                                    <p style={{ color: '#666', fontSize: 16, marginBottom: 8 }}>
                                        {viewingFile?.name}
                                    </p>
                                    <p style={{ color: '#999', marginBottom: 32 }}>
                                        文件大小：{formatFileSize(viewingFile?.size || 0)}
                                    </p>
                                    <div style={{
                                        backgroundColor: '#f0f5ff',
                                        padding: '16px 24px',
                                        borderRadius: 8,
                                        marginBottom: 32,
                                        maxWidth: 500,
                                        margin: '0 auto 32px'
                                    }}>
                                        <p style={{ margin: 0, color: '#666' }}>
                                            💡 <strong>提示</strong>
                                            <br />
                                            <span style={{ fontSize: 14 }}>
                                                Office 文件暂不支持在线预览，请下载到本地使用 Microsoft Office 或 WPS 打开查看
                                            </span>
                                        </p>
                                    </div>
                                    <Button
                                        type="primary"
                                        icon={<DownloadOutlined />}
                                        onClick={() => viewingFile && handleDownload(viewingFile)}
                                        size="large"
                                    >
                                        下载到本地
                                    </Button>
                                </div>
                            );
                        }

                        if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript')) {
                            return (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', padding: 20, overflow: 'auto' }}>
                                    <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="text-preview" />
                                </div>
                            );
                        }
                        return (
                            <div style={{ textAlign: 'center' }}>
                                <FileOutlined style={{ fontSize: 64, color: '#999', marginBottom: 16 }} />
                                <h3>该文件类型暂不支持直接预览</h3>
                                <p>请点击下方按钮下载后查看</p>
                            </div>
                        );
                    })()
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <Spin size="large" tip="正在加载预览..." />
                    </div>
                )}
            </Modal>

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
