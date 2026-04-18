import { ApiResponse } from './api';

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

export interface AppNotification {
  id: string;
  senderId: string;
  recipientId: string;
  category: NotificationCategory;
  level: NotificationLevel;
  title: string;
  content?: string;
  actionUrl?: string;
  status: number; // 0=Unread, 1=Read
  metadata: Record<string, string>;
  datetime: string;
  readAt?: string;
}

export interface NotificationStatistics {
  System: number;
  Work: number;
  Social: number;
  Security: number;
  Total: number;
}

export interface PagedResult<T> {
  queryable: T[];
  rowCount: number;
  currentPage: number;
  pageSize: number;
  pageCount: number;
}

export type NotificationListResult = ApiResponse<PagedResult<AppNotification>>;
export type NotificationStatisticsResult = ApiResponse<NotificationStatistics>;
