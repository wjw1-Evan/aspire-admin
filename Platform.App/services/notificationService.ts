import { apiClient } from './api';
import { ApiResponse, PagedResult } from '../types/api';
import {
    AppNotification,
    NotificationStatistics,
} from '../types/notification';

export const notificationService = {
    /** 获取通知列表 */
    async getNotifications(
        page: number = 1,
        pageSize: number = 10,
        filterType: string = 'all'
    ): Promise<ApiResponse<PagedResult<AppNotification>>> {
        return await apiClient.get<any, ApiResponse<PagedResult<AppNotification>>>(
            '/api/notifications',
            { params: { page, pageSize, filterType } }
        );
    },

    /** 获取统计信息 */
    async getStatistics(): Promise<ApiResponse<NotificationStatistics>> {
        return await apiClient.get<any, ApiResponse<NotificationStatistics>>(
            '/api/notifications/statistics'
        );
    },

    /** 标记为已读 */
    async markAsRead(id: string): Promise<ApiResponse<void>> {
        return await apiClient.put<any, ApiResponse<void>>(
            `/api/notifications/${id}/read`,
            {}
        );
    },
};
