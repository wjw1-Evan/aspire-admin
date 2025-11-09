import { apiService } from './api';
import { API_ENDPOINTS } from './apiConfig';
import type {
  FriendRequestDirection,
  FriendRequestItem,
  FriendSearchResult,
  FriendSessionResponse,
  FriendSummary,
} from '@/types/friends';
import type { ApiResponse } from '@/types/unified-api';

const FRIENDS_ENDPOINT = API_ENDPOINTS.friends;

export interface CreateFriendRequestPayload {
  targetUserId: string;
  message?: string;
}

const ensureApiSuccess = <T>(
  response: ApiResponse<T> | undefined,
  fallbackMessage: string
): ApiResponse<T> => {
  if (!response) {
    throw new Error(fallbackMessage);
  }

  if (!response.success) {
    throw new Error(response.errorMessage ?? fallbackMessage);
  }

  return response;
};

export const friendService = {
  async getFriends(): Promise<FriendSummary[]> {
    const rawResponse = await apiService.get<ApiResponse<FriendSummary[]>>(`${FRIENDS_ENDPOINT}`);
    const response = ensureApiSuccess(rawResponse, '获取好友列表失败');
    return response.data ?? [];
  },

  async search(params: { phone?: string; keyword?: string }): Promise<FriendSearchResult[]> {
    const searchParams = new URLSearchParams();
    if (params.phone?.trim()) {
      searchParams.append('phone', params.phone.trim());
    }
    if (params.keyword?.trim()) {
      searchParams.append('keyword', params.keyword.trim());
    }

    const query = searchParams.toString();
    const endpoint = `${FRIENDS_ENDPOINT}/search${query ? `?${query}` : ''}`;
    const rawResponse = await apiService.get<ApiResponse<FriendSearchResult[]>>(endpoint);
    const response = ensureApiSuccess(rawResponse, '搜索用户失败');
    return response.data ?? [];
  },

  async searchByPhone(phoneNumber: string): Promise<FriendSearchResult[]> {
    return this.search({ phone: phoneNumber });
  },

  async searchByKeyword(keyword: string): Promise<FriendSearchResult[]> {
    return this.search({ keyword });
  },

  async searchByQuery(query: string): Promise<FriendSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const normalizedPhone = trimmed.replace(/[\s-]/g, '');
    const digitsOnly = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
    const isPhoneCandidate = /^\d{5,}$/.test(digitsOnly);

    const searchTasks: Array<Promise<FriendSearchResult[]>> = [];
    searchTasks.push(this.search({ keyword: trimmed }));

    if (isPhoneCandidate) {
      searchTasks.push(this.search({ phone: normalizedPhone }));
    }

    const resultSets = await Promise.all(searchTasks);
    const merged: FriendSearchResult[] = [];
    const seen = new Set<string>();

    for (const results of resultSets) {
      for (const item of results) {
        if (!seen.has(item.userId)) {
          seen.add(item.userId);
          merged.push(item);
        }
      }
    }

    return merged;
  },

  async sendFriendRequest(payload: CreateFriendRequestPayload): Promise<FriendRequestItem> {
    const rawResponse = await apiService.post<ApiResponse<FriendRequestItem>>(
      `${FRIENDS_ENDPOINT}/requests`,
      payload
    );
    const response = ensureApiSuccess(rawResponse, '发送好友请求失败');
    if (!response.data) {
      throw new Error('发送好友请求失败：服务器未返回数据');
    }
    return response.data;
  },

  async getFriendRequests(direction: FriendRequestDirection = 'Incoming'): Promise<FriendRequestItem[]> {
    const query = new URLSearchParams({ direction: direction.toLowerCase() }).toString();
    const rawResponse = await apiService.get<ApiResponse<FriendRequestItem[]>>(
      `${API_ENDPOINTS.friendRequests}?${query}`
    );
    const response = ensureApiSuccess(rawResponse, '获取好友请求失败');
    return response.data ?? [];
  },

  async approveRequest(requestId: string): Promise<FriendRequestItem> {
    const rawResponse = await apiService.post<ApiResponse<FriendRequestItem>>(
      `${FRIENDS_ENDPOINT}/requests/${requestId}/approve`
    );
    const response = ensureApiSuccess(rawResponse, '接受好友请求失败');
    if (!response.data) {
      throw new Error('接受好友请求失败：服务器未返回数据');
    }
    return response.data;
  },

  async rejectRequest(requestId: string): Promise<FriendRequestItem> {
    const rawResponse = await apiService.post<ApiResponse<FriendRequestItem>>(
      `${FRIENDS_ENDPOINT}/requests/${requestId}/reject`
    );
    const response = ensureApiSuccess(rawResponse, '拒绝好友请求失败');
    if (!response.data) {
      throw new Error('拒绝好友请求失败：服务器未返回数据');
    }
    return response.data;
  },

  async ensureSession(friendUserId: string): Promise<FriendSessionResponse> {
    const rawResponse = await apiService.post<ApiResponse<FriendSessionResponse>>(
      `${FRIENDS_ENDPOINT}/${friendUserId}/session`
    );
    const response = ensureApiSuccess(rawResponse, '打开聊天失败');
    if (!response.data) {
      throw new Error('打开聊天失败：服务器未返回会话数据');
    }
    return response.data;
  },
};

