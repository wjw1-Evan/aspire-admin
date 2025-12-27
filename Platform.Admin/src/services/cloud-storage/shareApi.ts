import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

// 文件分享相关类型
export interface FileShare {
    id: string;
    fileId: string;
    fileName: string;
    shareToken: string;
    shareType: 'internal' | 'external';
    accessType: 'view' | 'download' | 'edit';
    password?: string;
    expiresAt?: string;
    maxDownloads?: number;
    downloadCount: number;
    accessCount: number;
    isEnabled: boolean;
    createdAt: string;
    createdBy: string;
    createdByName: string;
}

export interface CreateShareRequest {
    fileId: string;
    shareType: 'internal' | 'external';
    accessType: 'view' | 'download' | 'edit';
    password?: string;
    expiresAt?: string;
    maxDownloads?: number;
    allowedUserIds?: string[];
}

export interface UpdateShareRequest {
    accessType?: 'view' | 'download' | 'edit';
    password?: string;
    expiresAt?: string;
    maxDownloads?: number;
    isEnabled?: boolean;
    allowedUserIds?: string[];
}

export interface ShareListRequest {
    fileId?: string;
    shareType?: 'internal' | 'external';
    isEnabled?: boolean;
    page?: number;
    pageSize?: number;
}

export interface ShareListResponse {
    data: FileShare[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ShareAccessRequest {
    shareToken: string;
    password?: string;
}

export interface ShareAccessResponse {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string;
    accessType: 'view' | 'download' | 'edit';
    canDownload: boolean;
    canView: boolean;
    previewUrl?: string;
    downloadUrl?: string;
}

export interface ShareNotificationRequest {
    shareId: string;
    userIds: string[];
    message?: string;
}

// 文件分享管理 API

/**
 * 创建分享链接
 */
export async function createShare(data: CreateShareRequest) {
    return request<ApiResponse<FileShare>>('/api/file-share', {
        method: 'POST',
        data,
    });
}

/**
 * 更新分享设置
 */
export async function updateShare(id: string, data: UpdateShareRequest) {
    return request<ApiResponse<FileShare>>(`/api/file-share/${id}`, {
        method: 'PUT',
        data,
    });
}

/**
 * 获取分享详情
 */
export async function getShareDetail(id: string) {
    return request<ApiResponse<FileShare>>(`/api/file-share/${id}`, {
        method: 'GET',
    });
}

/**
 * 获取分享列表
 */
export async function getShareList(params: ShareListRequest) {
    return request<ApiResponse<ShareListResponse>>('/api/file-share', {
        method: 'GET',
        params,
    });
}

/**
 * 删除分享
 */
export async function deleteShare(id: string) {
    return request<ApiResponse<void>>(`/api/file-share/${id}`, {
        method: 'DELETE',
    });
}

/**
 * 启用/禁用分享
 */
export async function toggleShare(id: string, enabled: boolean) {
    return request<ApiResponse<FileShare>>(`/api/file-share/${id}/toggle`, {
        method: 'PUT',
        data: { enabled },
    });
}

/**
 * 访问分享链接（公开接口，无需认证）
 */
export async function accessShare(data: ShareAccessRequest) {
    return request<ApiResponse<ShareAccessResponse>>('/api/file-share/access', {
        method: 'POST',
        data,
    });
}

/**
 * 通过分享链接下载文件（公开接口，无需认证）
 */
export async function downloadSharedFile(shareToken: string, password?: string) {
    const params = new URLSearchParams({ shareToken });
    if (password) {
        params.append('password', password);
    }

    const response = await request<Blob>(`/api/file-share/download?${params.toString()}`, {
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
    let filename = 'download';
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * 发送分享通知
 */
export async function sendShareNotification(data: ShareNotificationRequest) {
    return request<ApiResponse<void>>('/api/file-share/notify', {
        method: 'POST',
        data,
    });
}

/**
 * 获取我的分享列表
 */
export async function getMyShares(params?: { page?: number; pageSize?: number }) {
    return request<ApiResponse<ShareListResponse>>('/api/file-share/my-shares', {
        method: 'GET',
        params,
    });
}

/**
 * 获取分享给我的文件列表
 */
export async function getSharedWithMe(params?: { page?: number; pageSize?: number }) {
    return request<ApiResponse<ShareListResponse>>('/api/file-share/shared-with-me', {
        method: 'GET',
        params,
    });
}