import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

// 存储配额相关类型
export interface StorageQuota {
    id: string;
    userId: string;
    username: string;
    userDisplayName: string;
    totalQuota: number;
    usedQuota: number;
    fileCount: number;
    warningThreshold: number;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SetQuotaRequest {
    userId: string;
    totalQuota: number;
    warningThreshold?: number;
    isEnabled?: boolean;
}

export interface UpdateQuotaRequest {
    totalQuota?: number;
    warningThreshold?: number;
    isEnabled?: boolean;
}

export interface QuotaListRequest {
    username?: string;
    isEnabled?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface QuotaListResponse {
    data: StorageQuota[];
    total: number;
    page: number;
    pageSize: number;
}

export interface QuotaUsageStats {
    totalUsers: number;
    totalQuota: number;
    totalUsed: number;
    averageUsage: number;
    usageDistribution: Array<{
        range: string;
        count: number;
        percentage: number;
    }>;
    topUsers: Array<{
        userId: string;
        username: string;
        userDisplayName: string;
        usedQuota: number;
        usagePercentage: number;
    }>;
}

export interface QuotaWarning {
    id: string;
    userId: string;
    username: string;
    userDisplayName: string;
    usedQuota: number;
    totalQuota: number;
    usagePercentage: number;
    warningType: 'approaching' | 'exceeded';
    createdAt: string;
}

export interface QuotaWarningListResponse {
    data: QuotaWarning[];
    total: number;
}

// 存储配额管理 API

/**
 * 设置用户存储配额
 */
export async function setUserQuota(data: SetQuotaRequest) {
    return request<ApiResponse<StorageQuota>>('/api/storage-quota', {
        method: 'POST',
        data,
    });
}

/**
 * 更新用户存储配额
 */
export async function updateUserQuota(userId: string, data: UpdateQuotaRequest) {
    return request<ApiResponse<StorageQuota>>(`/api/storage-quota/user/${userId}`, {
        method: 'PUT',
        data,
    });
}

/**
 * 获取用户存储配额详情
 */
export async function getUserQuota(userId: string) {
    return request<ApiResponse<StorageQuota>>(`/api/storage-quota/user/${userId}`, {
        method: 'GET',
    });
}

/**
 * 获取当前用户的存储配额
 */
export async function getMyQuota() {
    return request<ApiResponse<StorageQuota>>('/api/storage-quota/my-quota', {
        method: 'GET',
    });
}

/**
 * 获取存储配额列表
 */
export async function getQuotaList(params: QuotaListRequest) {
    return request<ApiResponse<QuotaListResponse>>('/api/storage-quota/list', {
        method: 'GET',
        params,
    });
}

/**
 * 删除用户存储配额（恢复为默认配额）
 */
export async function deleteUserQuota(userId: string) {
    return request<ApiResponse<void>>(`/api/storage-quota/user/${userId}`, {
        method: 'DELETE',
    });
}

/**
 * 批量设置存储配额
 */
export async function batchSetQuota(data: { userIds: string[]; totalQuota: number; warningThreshold?: number }) {
    return request<ApiResponse<{ successCount: number; failedCount: number }>>('/api/storage-quota/batch-set', {
        method: 'POST',
        data,
    });
}

/**
 * 获取存储使用统计
 */
export async function getQuotaUsageStats() {
    return request<ApiResponse<QuotaUsageStats>>('/api/storage-quota/usage-stats', {
        method: 'GET',
    });
}

/**
 * 获取配额警告列表
 */
export async function getQuotaWarnings() {
    return request<ApiResponse<QuotaWarningListResponse>>('/api/storage-quota/warnings', {
        method: 'GET',
    });
}

/**
 * 刷新用户存储使用量
 */
export async function refreshUserQuotaUsage(userId: string) {
    return request<ApiResponse<StorageQuota>>(`/api/storage-quota/user/${userId}/recalculate`, {
        method: 'POST',
    });
}

/**
 * 刷新所有用户存储使用量
 */
export async function refreshAllQuotaUsage() {
    return request<ApiResponse<{ processedCount: number }>>('/api/storage-quota/refresh-all', {
        method: 'POST',
    });
}

/**
 * 获取存储配额设置建议
 */
export async function getQuotaRecommendations() {
    return request<ApiResponse<{
        defaultQuota: number;
        recommendedQuota: number;
        reasoning: string;
        factors: Array<{
            factor: string;
            impact: string;
            weight: number;
        }>;
    }>>('/api/storage-quota/recommendations', {
        method: 'GET',
    });
}