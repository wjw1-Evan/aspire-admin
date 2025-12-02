import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

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
  // 后端返回为字符串枚举：Notification | Message | Event | Task | System
  type: string;
  read: boolean;
  clickClose: boolean;

  // 任务相关字段
  taskId?: string;
  taskPriority?: number;
  taskStatus?: number;

  // 系统消息相关字段
  isSystemMessage?: boolean;
  messagePriority?: number;

  // 其他字段
  actionType?: string;
  relatedUserIds?: string[];
}

/**
 * 统一通知列表响应
 */
export interface UnifiedNotificationListResponse {
  items: UnifiedNotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
  success: boolean;
}

/**
 * 未读通知统计（已简化）
 */
export interface UnreadCountStatistics {
  total: number;
}

/** 获取统一的通知列表（仅使用 all + datetime） */
export async function getUnifiedNotifications(
  page: number = 1,
  pageSize: number = 10,
  filterType: string = 'all',
  sortBy: string = 'datetime',
) {
  return request<ApiResponse<UnifiedNotificationListResponse>>(
    '/api/unified-notification/center',
    {
      method: 'GET',
      params: { page, pageSize, filterType, sortBy },
    },
  );
}

/** 标记通知为已读 */
export async function markAsRead(id: string) {
  return request<ApiResponse<string>>(`/api/unified-notification/${id}/mark-as-read`, {
    method: 'POST',
  });
}

/** 获取未读通知数量 */
export async function getUnreadCount() {
  return request<ApiResponse<{ unreadCount: number }>>(
    '/api/unified-notification/unread-count',
    {
      method: 'GET',
    },
  );
}

/** 获取未读通知数量统计（已简化，仅 total 使用） */
export async function getUnreadStatistics() {
  return request<ApiResponse<UnreadCountStatistics>>(
    '/api/unified-notification/unread-statistics',
    {
      method: 'GET',
    },
  );
}
