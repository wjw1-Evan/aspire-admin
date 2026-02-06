/**
 * Cloud Storage Files - Shared Types
 */

import type { FileItem, FileVersion, StorageStatistics } from '@/services/cloud-storage';
import type { AppUser } from '@/services/user/api';

// 搜索参数类型
export interface SearchParams {
    keyword?: string;
    fileType?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
    minSize?: number;
    maxSize?: number;
}

// 路径历史项
export interface PathHistoryItem {
    id?: string;
    name: string;
    path: string;
}

// 上传进度项
export interface UploadProgressItem {
    percent: number;
    label: string;
}

// Office 文件内容
export interface OfficeContent {
    type: 'word' | 'excel' | 'ppt';
    content: any;
}

// 文件预览 Modal Props
export interface FilePreviewModalProps {
    open: boolean;
    onClose: () => void;
    file: FileItem | null;
    previewUrl: string;
    previewLoading: boolean;
    officeContent: OfficeContent | null;
    markdownContent: string | null;
    onDownload: (file: FileItem) => void;
    formatFileSize: (bytes: number) => string;
}

// 上传 Modal Props
export interface UploadModalProps {
    open: boolean;
    onClose: () => void;
    uploadType: 'file' | 'folder';
    uploadProgress: Record<string, UploadProgressItem>;
    maxUploadSizeLabel: string;
    onUpload: (file: File) => void;
    onBatchUpload: (files: File[]) => void;
}

// 分享 Modal Props
export interface ShareModalProps {
    open: boolean;
    onClose: () => void;
    file: FileItem | null;
    userOptions: AppUser[];
    userLoading: boolean;
    onSubmit: (values: any) => void;
}

// 创建文件夹 Modal Props
export interface CreateFolderModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: { name: string; description?: string }) => void;
}

// 重命名 Modal Props
export interface RenameModalProps {
    open: boolean;
    onClose: () => void;
    file: FileItem | null;
    onSubmit: (values: { name: string }) => void;
}

// 文件详情 Drawer Props
export interface FileDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    file: FileItem | null;
    versionList: FileVersion[];
    versionLoading: boolean;
    previewUrl: string;
    previewLoading: boolean;
    isMobile: boolean;
    formatFileSize: (bytes: number) => string;
    formatDateTime: (dateTime: string | null | undefined) => string;
    onPreview: () => void;
    onDownloadVersion: (versionId: string, fileName: string) => void;
    onRestoreVersion: (versionId: string) => void;
}

// 重导出服务类型
export type { FileItem, FileVersion, StorageStatistics, AppUser };
