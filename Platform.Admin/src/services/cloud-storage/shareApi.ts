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
    const fileItemId = data.fileId || (data as any).fileItemId;
    if (!fileItemId) {
        throw new Error('fileId 不能为空');
    }

    // 后端期望路由参数 fileItemId，并使用枚举字段
    const mapShareType = (shareType: CreateShareRequest['shareType']) => {
        // internal -> Internal(1); external -> Public(2) 默认生成可公开访问的链接
        return shareType === 'internal' ? 1 : 2;
    };

    const mapPermission = (accessType: CreateShareRequest['accessType']) => {
        switch (accessType) {
            case 'download':
                return 1; // SharePermission.Download
            case 'edit':
                return 2; // SharePermission.Edit
            case 'view':
            default:
                return 0; // SharePermission.View
        }
    };

    const payload = {
        type: mapShareType(data.shareType),
        permission: mapPermission(data.accessType),
        expiresAt: data.expiresAt,
        password: data.password,
        allowedUserIds: data.allowedUserIds || [],
        settings: data.maxDownloads ? { maxDownloads: data.maxDownloads } : {},
    };

    return request<ApiResponse<FileShare>>(`/api/file-share/${encodeURIComponent(fileItemId)}`, {
        method: 'POST',
        data: payload,
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
    const { shareToken, password } = data;
    if (!shareToken) throw new Error('shareToken 不能为空');
    return request<ApiResponse<ShareAccessResponse>>(`/api/file-share/public/${encodeURIComponent(shareToken)}`, {
        method: 'GET',
        params: password ? { password } : {},
    });
}

/**
 * 通过分享链接下载文件（公开接口，无需认证）
 */
export async function downloadSharedFile(shareToken: string, password?: string, fallbackName?: string) {
    const qs = password ? `?password=${encodeURIComponent(password)}` : '';
    try {
        const response = await request<Blob>(`/api/file-share/public/${encodeURIComponent(shareToken)}/download${qs}`, {
            method: 'GET',
            responseType: 'blob',
            getResponse: true,
        });

        const blob = response?.data;
        if (!blob) throw new Error('未获取到文件数据');

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // 尝试从响应头获取文件名
        const contentDisposition = response?.response?.headers?.get?.('content-disposition');
        let filename = fallbackName || 'download';
        if (contentDisposition) {
            // 优先解析 RFC 5987 的 filename*
            const fnameStar = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i);
            if (fnameStar && fnameStar[1]) {
                const starValue = fnameStar[1].trim().replace(/^UTF-8''/i, '');
                try {
                    filename = decodeURIComponent(starValue);
                } catch {
                    filename = starValue;
                }
            } else {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
        }

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err: any) {
        // 处理 @umijs/request 的错误结构，提取更友好的消息
        const status = err?.response?.status;
        const msg = err?.data?.message || err?.data?.msg || err?.message;
        const friendly = status === 403
            ? '无权下载：分享可能仅允许查看或已过期/受密码保护'
            : status === 404
                ? '分享文件不存在或链接已失效'
                : msg || '下载失败';
        throw new Error(friendly);
    }
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
