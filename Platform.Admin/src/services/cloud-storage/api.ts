import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

// 文件和文件夹相关类型
export interface FileItem {
    id: string;
    name: string;
    path: string;
    parentId?: string;
    // 前端使用 isFolder，后端返回 type (可能为 "folder" | "file" 或 0 | 1)
    isFolder: boolean;
    type?: string | number; // 后端原始字段，保留以兼容
    size: number;
    mimeType?: string;
    extension?: string;
    tags: string[];
    description?: string;
    isPublic?: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    createdByName: string;
    createdByUsername?: string; // 后端可能返回此字段，转换为 createdByName
    updatedBy?: string;
    updatedByName: string;
    updatedByUsername?: string; // 后端可能返回此字段，转换为 updatedByName
}

export interface CreateFolderRequest {
    name: string;
    parentId?: string;
    description?: string;
}

export interface RenameItemRequest {
    name: string;
}

export interface MoveItemRequest {
    targetParentId?: string;
}

export interface CopyItemRequest {
    targetParentId?: string;
    newName?: string;
}

export interface FileUploadRequest {
    file: File;
    parentId?: string;
    description?: string;
    tags?: string[];
}

export interface BatchUploadRequest {
    files: File[];
    parentId?: string;
}

export interface BatchOperationRequest {
    /** 后端期望的文件项 ID 列表字段 */
    ids?: string[];
    /** 兼容旧字段，内部会转为 ids */
    itemIds?: string[];
    targetParentId?: string;
}

export interface FileSearchRequest {
    keyword?: string;
    fileType?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
    minSize?: number;
    maxSize?: number;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FileListRequest {
    parentId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FileListResponse {
    list?: FileItem[]; // 后端可能返回 list 字段
    data?: FileItem[]; // 或 data 字段（兼容）
    total: number;
    page: number;
    pageSize: number;
    totalPages?: number; // 后端可能返回总页数
}

export interface StorageStatistics {
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
    usedQuota: number;
    totalQuota: number;
    fileTypeStats: Array<{
        type: string;
        count: number;
        size: number;
    }>;
}

// 文件和文件夹管理 API

/**
 * 获取文件列表
 */
export async function getFileList(params: FileListRequest) {
    return request<ApiResponse<FileListResponse>>('/api/cloud-storage/files', {
        method: 'GET',
        params,
    });
}

/**
 * 获取文件详情
 */
export async function getFileDetail(id: string) {
    return request<ApiResponse<FileItem>>(`/api/cloud-storage/files/${id}`, {
        method: 'GET',
    });
}

/**
 * 创建文件夹
 */
export async function createFolder(data: CreateFolderRequest) {
    return request<ApiResponse<FileItem>>('/api/cloud-storage/folders', {
        method: 'POST',
        data,
    });
}

/**
 * 重命名文件或文件夹
 */
export async function renameItem(id: string, data: RenameItemRequest) {
    return request<ApiResponse<FileItem>>(`/api/cloud-storage/items/${id}/rename`, {
        method: 'PUT',
        data,
    });
}

/**
 * 移动文件或文件夹
 */
export async function moveItem(id: string, data: MoveItemRequest) {
    return request<ApiResponse<FileItem>>(`/api/cloud-storage/items/${id}/move`, {
        method: 'PUT',
        data,
    });
}

/**
 * 复制文件或文件夹
 */
export async function copyItem(id: string, data: CopyItemRequest) {
    return request<ApiResponse<FileItem>>(`/api/cloud-storage/items/${id}/copy`, {
        method: 'POST',
        data,
    });
}

/**
 * 删除文件或文件夹（移到回收站）
 */
export async function deleteItem(id: string) {
    return request<ApiResponse<void>>(`/api/cloud-storage/items/${id}`, {
        method: 'DELETE',
    });
}

/**
 * 批量删除文件或文件夹
 */
export async function batchDeleteItems(data: BatchOperationRequest) {
    const payload = {
        ids: data.ids ?? data.itemIds ?? [],
    };

    return request<ApiResponse<void>>('/api/cloud-storage/items/batch-delete', {
        method: 'POST',
        data: payload,
    });
}

/**
 * 批量移动文件或文件夹
 */
export async function batchMoveItems(data: BatchOperationRequest) {
    const payload = {
        ids: data.ids ?? data.itemIds ?? [],
        targetParentId: data.targetParentId,
    };

    return request<ApiResponse<void>>('/api/cloud-storage/items/batch-move', {
        method: 'POST',
        data: payload,
    });
}

/**
 * 上传文件
 */
export async function uploadFile(data: FileUploadRequest, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.parentId) {
        formData.append('parentId', data.parentId);
    }
    if (data.description) {
        formData.append('description', data.description);
    }
    if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
    }

    return request<ApiResponse<FileItem>>('/api/cloud-storage/upload', {
        method: 'POST',
        data: formData,
        requestType: 'form',
        onUploadProgress: (event) => {
            if (onProgress && event.total) {
                const percent = Math.round((event.loaded * 100) / event.total);
                onProgress(percent);
            }
        },
    });
}

/**
 * 批量上传文件
 */
export async function batchUploadFiles(data: BatchUploadRequest, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    data.files.forEach((file) => {
        const filename = (file as any).webkitRelativePath || file.name;
        formData.append('files', file, filename);
    });
    if (data.parentId) {
        formData.append('parentId', data.parentId);
    }

    return request<ApiResponse<FileItem[]>>('/api/cloud-storage/batch-upload', {
        method: 'POST',
        data: formData,
        requestType: 'form',
        onUploadProgress: (event) => {
            if (onProgress && event.total) {
                const percent = Math.round((event.loaded * 100) / event.total);
                onProgress(percent);
            }
        },
    });
}

/**
 * 下载文件
 */
export async function downloadFile(id: string, filename?: string) {
    const response = await request<Blob>(`/api/cloud-storage/files/${id}/download`, {
        method: 'GET',
        responseType: 'blob',
        getResponse: true,
    });

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * 获取文件预览URL
 */
export async function getFilePreviewUrl(id: string) {
    return request<ApiResponse<{ previewUrl: string; thumbnailUrl?: string }>>(`/api/cloud-storage/files/${id}/preview`, {
        method: 'GET',
    });
}

/**
 * 搜索文件
 */
export async function searchFiles(params: FileSearchRequest) {
    return request<ApiResponse<FileListResponse>>('/api/cloud-storage/search', {
        method: 'GET',
        params,
    });
}

/**
 * 获取存储统计信息
 */
export async function getStorageStatistics() {
    return request<ApiResponse<StorageStatistics>>('/api/cloud-storage/statistics', {
        method: 'GET',
    });
}

/**
 * 下载文件夹（ZIP格式）
 */
export async function downloadFolder(id: string, folderName?: string) {
    const response = await request<Blob>(`/api/cloud-storage/folders/${id}/download`, {
        method: 'GET',
        responseType: 'blob',
        getResponse: true,
    });

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName || 'folder'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
