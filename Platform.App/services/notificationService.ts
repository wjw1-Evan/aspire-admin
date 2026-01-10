import { apiClient } from './api';
import { ApiResponse } from '../types/api';
import {
    UnifiedNotificationListResponse,
    UnreadCountStatistics,
} from '../types/notification';

export const notificationService = {
    /** 获取通知列表 */
    async getNotifications(
        page: number = 1,
        pageSize: number = 10,
        filterType: string = 'all',
        sortBy: string = 'datetime'
    ): Promise<ApiResponse<UnifiedNotificationListResponse>> {
        return await apiClient.get<any, ApiResponse<UnifiedNotificationListResponse>>(
            '/api/unified-notification/center',
            { params: { page, pageSize, filterType, sortBy } }
        );
    },

    /** 标记为已读 */
    async markAsRead(id: string): Promise<ApiResponse<string>> {
        return await apiClient.post<any, ApiResponse<string>>(
            `/api/unified-notification/${id}/mark-as-read`,
            {}
        );
    },

    /** 获取未读统计 */
    async getUnreadStatistics(): Promise<ApiResponse<UnreadCountStatistics>> {
        return await apiClient.get<any, ApiResponse<UnreadCountStatistics>>(
            '/api/unified-notification/unread-statistics'
        );
    },
};
