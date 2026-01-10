import { ApiResponse } from './api';

export interface UnifiedNotificationItem {
    id: string;
    title: string;
    description?: string;
    avatar?: string;
    extra?: string;
    status?: string;
    datetime: string;
    type: string; // Notification | Message | Event | Task | System
    read: boolean;
    clickClose: boolean;
    taskId?: string;
    taskPriority?: number;
    taskStatus?: number;
    isSystemMessage?: boolean;
    messagePriority?: number;
    actionType?: string;
    relatedUserIds?: string[];
}

export interface UnifiedNotificationListResponse {
    items: UnifiedNotificationItem[];
    total: number;
    page: number;
    pageSize: number;
    unreadCount: number;
    success: boolean;
}

export interface UnreadCountStatistics {
    total: number;
}

export type UnifiedNotificationListResult = ApiResponse<UnifiedNotificationListResponse>;
export type MarkAsReadResult = ApiResponse<string>;
export type UnreadStatisticsResult = ApiResponse<UnreadCountStatistics>;
