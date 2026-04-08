import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

/**
 * 通知中心数据项
 */
export interface UnifiedNotificationItem {
  id: string;
  title: string;
  description?: string;
  avatar?: string;
  extra?: string;
  status?: string;
  datetime: string;
  type: string;
  read: boolean;
  clickClose: boolean;
  taskId?: string;
  taskPriority?: number;
  taskStatus?: number;
  isSystemMessage?: boolean;
  messagePriority?: number;
  actionType?: string;
  relatedUserIds?: string[];
  isTodo?: boolean;
  todoPriority?: number;
  todoDueDate?: string;
}

/**
 * 未读通知数量统计
 */
export interface UnreadCountStatistics {
  total: number;
  systemMessages: number;
  notifications: number;
  messages: number;
  todos: number;
  taskNotifications: number;
}

/** 获取统一的通知列表（使用 PagedResult 格式） */
export async function getUnifiedNotifications(
  page: number = 1,
  pageSize: number = 10,
  filterType: string = 'all',
  sortBy: string = 'datetime',
) {
  return request<ApiResponse<PagedResult<UnifiedNotificationItem>>>(
    '/apiservice/api/unified-notification/center',
    {
      method: 'GET',
      params: { page, pageSize, filterType, sortBy },
    },
  );
}

/** 标记通知为已读 */
export async function markAsRead(id: string) {
  return request<ApiResponse<string>>(`/apiservice/api/unified-notification/${id}/mark-as-read`, {
    method: 'POST',
    data: {},
  });
}

/** 获取未读通知数量 */
export async function getUnreadCount() {
  return request<ApiResponse<{ unreadCount: number }>>(
    '/apiservice/api/unified-notification/unread-count',
    {
      method: 'GET',
    },
  );
}

/** 获取未读通知数量统计 */
export async function getUnreadStatistics() {
  return request<ApiResponse<UnreadCountStatistics>>(
    '/apiservice/api/unified-notification/unread-statistics',
    {
      method: 'GET',
    },
  );
}
