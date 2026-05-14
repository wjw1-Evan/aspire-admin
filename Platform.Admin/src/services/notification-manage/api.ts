import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

export enum NotificationCategory {
  System = 'System',
  Work = 'Work',
  Social = 'Social',
  Security = 'Security',
}

export enum NotificationLevel {
  Info = 'Info',
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
}

export interface AdminSendRequest {
  recipientIds: string[];
  title: string;
  content: string;
  category: NotificationCategory;
  level: NotificationLevel;
  actionUrl?: string;
}

export interface AdminBroadcastRequest {
  title: string;
  content: string;
  category: NotificationCategory;
  level: NotificationLevel;
  actionUrl?: string;
}

export interface NotificationSendRecordDto {
  id: string;
  title: string;
  content: string;
  category: string;
  level: string;
  actionUrl?: string;
  senderId: string;
  senderName: string;
  targetType: string;
  recipientCount: number;
  successCount: number;
  failCount: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
  recipientIds?: string[];
}

export interface NotificationSendDetailDto extends NotificationSendRecordDto {
  readCount: number;
  unreadCount: number;
  recipientStatus?: RecipientReadStatusDto[];
}

export interface NotificationManageStatistics {
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
  totalRecipients: number;
  totalBroadcasts: number;
}

export interface RecipientReadStatusDto {
  userId: string;
  userName: string;
  displayName?: string;
  isSent: boolean;
  isRead: boolean;
  readAt?: string;
  errorMessage?: string;
}

export const notificationManageApi = {
  send: (data: AdminSendRequest) =>
    request<ApiResponse<NotificationSendRecordDto>>('/apiservice/api/notification-manage/send', {
      method: 'POST',
      data,
    }),

  broadcast: (data: AdminBroadcastRequest) =>
    request<ApiResponse<NotificationSendRecordDto>>('/apiservice/api/notification-manage/broadcast', {
      method: 'POST',
      data,
    }),

  getHistory: (params: Record<string, any>) =>
    request<ApiResponse<PagedResult<NotificationSendRecordDto>>>('/apiservice/api/notification-manage/history', {
      params,
    }),

  getDetail: (id: string) =>
    request<ApiResponse<NotificationSendDetailDto>>(`/apiservice/api/notification-manage/history/${id}`),

  statistics: () =>
    request<ApiResponse<NotificationManageStatistics>>('/apiservice/api/notification-manage/statistics'),
};
