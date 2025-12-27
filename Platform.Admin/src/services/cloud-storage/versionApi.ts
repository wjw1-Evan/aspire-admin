import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

// 文件版本相关类型
export interface FileVersion {
    id: string;
    fileId: string;
    versionNumber: number;
    size: number;
    checksum: string;
    comment?: string;
    createdAt: string;
    createdBy: string;
    createdByName: string;
}

export interface CreateVersionRequest {
    fileId: string;
    file: File;
    comment?: string;
}

export interface VersionListRequest {
    fileId: string;
    page?: number;
    pageSize?: number;
}

export interface VersionListResponse {
    data: FileVersion[];
    total: number;
    page: number;
    pageSize: number;
}

export interface RestoreVersionRequest {
    versionId: string;
    comment?: string;
}

export interface VersionComparisonRequest {
    fileId: string;
    version1: number;
    version2: number;
}

export interface VersionComparisonResponse {
    version1: FileVersion;
    version2: FileVersion;
    differences: Array<{
        type: 'added' | 'removed' | 'modified';
        line: number;
        content: string;
    }>;
    summary: {
        addedLines: number;
        removedLines: number;
        modifiedLines: number;
    };
}

// 文件版本控制 API

/**
 * 创建新版本
 */
export async function createVersion(data: CreateVersionRequest, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('fileId', data.fileId);
    if (data.comment) {
        formData.append('comment', data.comment);
    }

    return request<ApiResponse<FileVersion>>('/api/file-version', {
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
 * 获取文件版本列表
 */
export async function getVersionList(params: VersionListRequest) {
    return request<ApiResponse<VersionListResponse>>('/api/file-version/list', {
        method: 'GET',
        params,
    });
}

/**
 * 获取版本详情
 */
export async function getVersionDetail(id: string) {
    return request<ApiResponse<FileVersion>>(`/api/file-version/${id}`, {
        method: 'GET',
    });
}

/**
 * 恢复到指定版本
 */
export async function restoreVersion(data: RestoreVersionRequest) {
    return request<ApiResponse<FileVersion>>('/api/file-version/restore', {
        method: 'POST',
        data,
    });
}

/**
 * 删除版本
 */
export async function deleteVersion(id: string) {
    return request<ApiResponse<void>>(`/api/file-version/${id}`, {
        method: 'DELETE',
    });
}

/**
 * 下载指定版本
 */
export async function downloadVersion(id: string, filename?: string) {
    const response = await request<Blob>(`/api/file-version/${id}/download`, {
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

/**
 * 比较两个版本
 */
export async function compareVersions(data: VersionComparisonRequest) {
    return request<ApiResponse<VersionComparisonResponse>>('/api/file-version/compare', {
        method: 'POST',
        data,
    });
}

/**
 * 获取版本预览URL
 */
export async function getVersionPreviewUrl(id: string) {
    return request<ApiResponse<{ previewUrl: string; thumbnailUrl?: string }>>(`/api/file-version/${id}/preview`, {
        method: 'GET',
    });
}

/**
 * 清理旧版本（保留最新的N个版本）
 */
export async function cleanupVersions(fileId: string, keepCount: number) {
    return request<ApiResponse<{ deletedCount: number }>>('/api/file-version/cleanup', {
        method: 'POST',
        data: { fileId, keepCount },
    });
}