import { request } from '@umijs/max';

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

export interface NoticeResponse {
  data: NoticeIconItem[];
  total: number;
  success: boolean;
}

/** 获取所有通知 */
export async function getNotices() {
  return request<NoticeResponse>('/api/notices', {
    method: 'GET',
  });
}

/** 标记为已读 */
export async function markNoticeAsRead(id: string) {
  return request(`/api/notices/${id}`, {
    method: 'PUT',
    data: { read: true },
  });
}

/** 批量标记已读 */
export async function markAllAsRead(ids: string[]) {
  return Promise.all(ids.map(id => markNoticeAsRead(id)));
}

/** 删除通知 */
export async function deleteNotice(id: string) {
  return request(`/api/notices/${id}`, {
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
  const readIds = response?.data?.filter(n => n.read).map(n => n.id) || [];
  return batchDeleteNotices(readIds);
}

