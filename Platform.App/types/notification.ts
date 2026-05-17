import { ApiResponse, PagedResult } from './api';

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
  status: string; // "unread" | "read" | "archived"
  metadata: Record<string, string>;
  createdAt: string;
  datetime?: string;
  readAt?: string;
}

export interface NotificationStatistics {
  System: number;
  Work: number;
  Social: number;
  Security: number;
  UnreadTotal: number;
  Total: number;
}

export type NotificationListResult = ApiResponse<PagedResult<AppNotification>>;
export type NotificationStatisticsResult = ApiResponse<NotificationStatistics>;
