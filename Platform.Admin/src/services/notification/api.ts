import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

/**
 * 通知分类
 */
export enum NotificationCategory {
  System = 'System',
  Work = 'Work',
  Social = 'Social',
  Security = 'Security',
}

/**
 * 通知级别
 */
export enum NotificationLevel {
  Info = 'Info',
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
}

/**
 * 通知状态
 */
export enum NotificationStatus {
  Unread = 0,
  Read = 1,
  Archived = 2,
}

/**
 * 通知实体
 */
export interface AppNotification {
  id: string;
  senderId: string;
  recipientId: string;
  category: NotificationCategory;
  level: NotificationLevel;
  title: string;
  content?: string;
  actionUrl?: string;
  status: NotificationStatus;
  metadata: Record<string, string>;
  datetime: string;
  readAt?: string;
}

/**
 * 分类统计
 */
export interface NotificationStatistics {
  System: number;
  Work: number;
  Social: number;
  Security: number;
  Total: number;
}

/**
 * 获取通知列表
 */
export async function getNotifications(params: any): Promise<ApiResponse<PagedResult<AppNotification>>> {
  return request('/apiservice/api/notifications', {
    method: 'GET',
    params,
  });
}

/**
 * 获取未读统计
 */
export async function getNotificationStatistics(): Promise<ApiResponse<NotificationStatistics>> {
  return request('/apiservice/api/notifications/statistics', {
    method: 'GET',
  });
}

/**
 * 标记为已读
 */
export async function markAsRead(id: string): Promise<ApiResponse<void>> {
  return request(`/apiservice/api/notifications/${id}/read`, {
    method: 'PUT',
  });
}

/**
 * 全部标记为已读
 */
export async function markAllAsRead(category?: NotificationCategory): Promise<ApiResponse<number>> {
  return request('/apiservice/api/notifications/read-all', {
    method: 'PUT',
    params: { category },
  });
}

/**
 * 测试发布通知
 */
export async function testPublishNotification(data: {
  title: string;
  content?: string;
  category: NotificationCategory;
  level: NotificationLevel;
  actionUrl?: string;
}): Promise<ApiResponse<void>> {
  return request('/apiservice/api/notifications/test-publish', {
    method: 'POST',
    data,
  });
}
