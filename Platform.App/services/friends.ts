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

export const friendService = {
  async getFriends(): Promise<FriendSummary[]> {
    const response = await apiService.get<ApiResponse<FriendSummary[]>>(`${FRIENDS_ENDPOINT}`);
    if (!response.success) {
      throw new Error(response.errorMessage ?? '获取好友列表失败');
    }
    return response.data ?? [];
  },

  async searchByPhone(phoneNumber: string): Promise<FriendSearchResult[]> {
    const query = new URLSearchParams({ phone: phoneNumber }).toString();
    const endpoint = `${FRIENDS_ENDPOINT}/search${query ? `?${query}` : ''}`;
    const response = await apiService.get<ApiResponse<FriendSearchResult[]>>(endpoint);
    if (!response.success) {
      throw new Error(response.errorMessage ?? '搜索用户失败');
    }
    return response.data ?? [];
  },

  async sendFriendRequest(payload: CreateFriendRequestPayload): Promise<FriendRequestItem> {
    const response = await apiService.post<ApiResponse<FriendRequestItem>>(
      `${FRIENDS_ENDPOINT}/requests`,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.errorMessage ?? '发送好友请求失败');
    }
    return response.data;
  },

  async getFriendRequests(direction: FriendRequestDirection = 'Incoming'): Promise<FriendRequestItem[]> {
    const query = new URLSearchParams({ direction }).toString();
    const response = await apiService.get<ApiResponse<FriendRequestItem[]>>(
      `${API_ENDPOINTS.friendRequests}?${query}`
    );
    if (!response.success) {
      throw new Error(response.errorMessage ?? '获取好友请求失败');
    }
    return response.data ?? [];
  },

  async approveRequest(requestId: string): Promise<FriendRequestItem> {
    const response = await apiService.post<ApiResponse<FriendRequestItem>>(
      `${FRIENDS_ENDPOINT}/requests/${requestId}/approve`
    );
    if (!response.success || !response.data) {
      throw new Error(response.errorMessage ?? '接受好友请求失败');
    }
    return response.data;
  },

  async rejectRequest(requestId: string): Promise<FriendRequestItem> {
    const response = await apiService.post<ApiResponse<FriendRequestItem>>(
      `${FRIENDS_ENDPOINT}/requests/${requestId}/reject`
    );
    if (!response.success || !response.data) {
      throw new Error(response.errorMessage ?? '拒绝好友请求失败');
    }
    return response.data;
  },

  async ensureSession(friendUserId: string): Promise<FriendSessionResponse> {
    const response = await apiService.post<ApiResponse<FriendSessionResponse>>(
      `${FRIENDS_ENDPOINT}/${friendUserId}/session`
    );
    if (!response.success || !response.data) {
      throw new Error(response.errorMessage ?? '打开聊天失败');
    }
    return response.data;
  },
};

