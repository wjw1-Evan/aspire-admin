import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export interface NoticeIconItem {
  id: string;
  title: string;
  description?: string;
  avatar?: string;
  extra?: string;
  status?: string;
  datetime: string;
  type: 'notification' | 'message' | 'event';
  read: boolean;
  clickClose: boolean;
}

// 统一响应格式改造：使用 ApiResponse<NoticeIconItem[]>

/** 获取所有通知 */
export async function getNotices() {
  return request<ApiResponse<NoticeIconItem[]>>('/api/notice', {
    method: 'GET',
  });
}

/** 标记为已读 */
export async function markNoticeAsRead(id: string) {
  return request<ApiResponse<boolean>>(`/api/notice/${id}`, {
    method: 'PUT',
    data: { read: true },
  });
}

/** 标记为未读 */
export async function markNoticeAsUnread(id: string) {
  return request<ApiResponse<boolean>>(`/api/notice/${id}`, {
    method: 'PUT',
    data: { read: false },
  });
}

/** 批量标记已读 */
export async function markAllAsRead(ids: string[]) {
  return Promise.all(ids.map(id => markNoticeAsRead(id)));
}

/** 批量标记未读 */
export async function markAllAsUnread(ids: string[]) {
  return Promise.all(ids.map(id => markNoticeAsUnread(id)));
}

/** 删除通知 */
export async function deleteNotice(id: string) {
  return request<ApiResponse<boolean>>(`/api/notice/${id}`, {
    method: 'DELETE',
  });
}

/** 批量删除 */
export async function batchDeleteNotices(ids: string[]) {
  return Promise.all(ids.map(id => deleteNotice(id)));
}

/** 清空已读消息 */
export async function clearReadNotices() {
  const response = await getNotices();
  const notices = response?.data || [];
  const readIds = notices.filter(n => n.read).map(n => n.id);
  return batchDeleteNotices(readIds);
}

