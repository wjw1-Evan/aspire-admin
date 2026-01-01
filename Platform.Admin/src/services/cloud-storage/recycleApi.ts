import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';
import type { FileItem } from './api';

// 回收站相关类型
export interface RecycleItem extends FileItem {
    deletedAt: string;
    deletedBy: string;
    deletedByName: string;
    originalPath: string;
    daysUntilPermanentDelete: number;
}

export interface RecycleListRequest {
    keyword?: string;
    fileType?: string;
    deletedBy?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface RecycleListResponse {
    data: RecycleItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface RestoreItemRequest {
    itemId: string;
    targetParentId?: string;
    newName?: string;
}

export interface BatchRestoreRequest {
    ids?: string[];
    /** 兼容旧字段，内部会转换为 ids */
    itemIds?: string[];
    targetParentId?: string;
}

export interface BatchPermanentDeleteRequest {
    ids?: string[];
    /** 兼容旧字段，内部会转换为 ids */
    itemIds?: string[];
}

export interface RecycleStatistics {
    totalItems: number;
    totalSize: number;
    fileCount: number;
    folderCount: number;
    oldestItem: string;
    newestItem: string;
    itemsByType: Array<{
        type: string;
        count: number;
        size: number;
    }>;
    itemsByDate: Array<{
        date: string;
        count: number;
        size: number;
    }>;
}

// 回收站管理 API

/**
 * 获取回收站文件列表
 */
export async function getRecycleList(params: RecycleListRequest) {
    return request<ApiResponse<RecycleListResponse>>('/api/cloud-storage/recycle', {
        method: 'GET',
        params,
    });
}

/**
 * 获取回收站文件详情
 */
export async function getRecycleItemDetail(id: string) {
    return request<ApiResponse<RecycleItem>>(`/api/cloud-storage/recycle/${id}`, {
        method: 'GET',
    });
}

/**
 * 恢复文件或文件夹
 */
export async function restoreItem(data: RestoreItemRequest) {
    return request<ApiResponse<FileItem>>('/api/cloud-storage/recycle/restore', {
        method: 'POST',
        data,
    });
}

/**
 * 批量恢复文件或文件夹
 */
export async function batchRestoreItems(data: BatchRestoreRequest) {
    const payload = {
        ids: data.ids ?? data.itemIds ?? [],
        targetParentId: data.targetParentId,
    };

    return request<ApiResponse<{ successCount: number; failedCount: number; errors?: string[] }>>('/api/cloud-storage/recycle/batch-restore', {
        method: 'POST',
        data: payload,
    });
}

/**
 * 永久删除文件或文件夹
 */
export async function permanentDeleteItem(id: string) {
    return request<ApiResponse<void>>(`/api/cloud-storage/recycle/${id}/permanent-delete`, {
        method: 'DELETE',
    });
}

/**
 * 批量永久删除文件或文件夹
 */
export async function batchPermanentDeleteItems(data: BatchPermanentDeleteRequest) {
    const payload = {
        ids: data.ids ?? data.itemIds ?? [],
    };

    return request<ApiResponse<{ successCount: number; failedCount: number; errors?: string[] }>>('/api/cloud-storage/recycle/batch-permanent-delete', {
        method: 'POST',
        data: payload,
    });
}

/**
 * 清空回收站
 */
export async function emptyRecycleBin() {
    return request<ApiResponse<{ deletedCount: number; freedSpace: number }>>('/api/cloud-storage/recycle/empty', {
        method: 'DELETE',
    });
}

/**
 * 获取回收站统计信息
 */
export async function getRecycleStatistics() {
    return request<ApiResponse<RecycleStatistics>>('/api/cloud-storage/recycle/statistics', {
        method: 'GET',
    });
}

/**
 * 自动清理过期文件
 */
export async function autoCleanupExpiredItems() {
    return request<ApiResponse<{ deletedCount: number; freedSpace: number }>>('/api/cloud-storage/recycle/auto-cleanup', {
        method: 'POST',
    });
}

/**
 * 预览回收站文件（如果支持）
 */
export async function previewRecycleItem(id: string) {
    return request<ApiResponse<{ previewUrl: string; thumbnailUrl?: string }>>(`/api/cloud-storage/recycle/${id}/preview`, {
        method: 'GET',
    });
}

/**
 * 下载回收站文件
 */
export async function downloadRecycleItem(id: string, filename?: string) {
    const response = await request<Blob>(`/api/cloud-storage/recycle/${id}/download`, {
        method: 'GET',
        responseType: 'blob',
        getResponse: true,
    });

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 尝试从响应头获取文件名
    const contentDisposition = response.response.headers.get('content-disposition');
    let downloadFilename = filename || 'download';
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            downloadFilename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
