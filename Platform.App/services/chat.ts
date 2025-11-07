import { apiService } from './api';
import { API_ENDPOINTS } from './apiConfig';
import type {
  AttachmentMetadata,
  ChatMessage,
  MessageSendRequest,
  MessageTimelineResponse,
  SessionListResponse,
} from '@/types/chat';
import { getApiBaseUrl } from '@/constants/apiConfig';

export interface SessionQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  includeInactive?: boolean;
}

export interface MessageQueryParams {
  cursor?: string;
  limit?: number;
}

const buildQueryString = (params: Record<string, string | number | boolean | undefined>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const chatService = {
  getSessions: async (params: SessionQueryParams = {}): Promise<SessionListResponse> => {
    const query = buildQueryString(params);
    return apiService.get<SessionListResponse>(`${API_ENDPOINTS.chatSessions}${query}`);
  },

  getMessages: async (sessionId: string, params: MessageQueryParams = {}): Promise<MessageTimelineResponse> => {
    const query = buildQueryString(params);
    return apiService.get<MessageTimelineResponse>(
      `${API_ENDPOINTS.chatMessages}/${encodeURIComponent(sessionId)}${query}`
    );
  },

  sendMessage: async (payload: MessageSendRequest): Promise<ChatMessage> => {
    return apiService.post<ChatMessage>(API_ENDPOINTS.chatMessages, payload);
  },

  markSessionRead: async (sessionId: string, lastReadMessageId: string): Promise<void> => {
    await apiService.post<void>(`${API_ENDPOINTS.chatMessages}/${encodeURIComponent(sessionId)}/read`, {
      lastReadMessageId,
    });
  },

  deleteMessage: async (sessionId: string, messageId: string): Promise<void> => {
    await apiService.delete<void>(
      `${API_ENDPOINTS.chatMessages}/${encodeURIComponent(sessionId)}/${encodeURIComponent(messageId)}`
    );
  },

  uploadAttachment: async (
    sessionId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<AttachmentMetadata> => {
    const token = await apiService.getToken();
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as any);

    const response = await fetch(
      `${getApiBaseUrl()}${API_ENDPOINTS.chatAttachments}/${encodeURIComponent(sessionId)}/attachments`,
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || '上传附件失败');
    }

    const data = (await response.json()) as AttachmentMetadata;
    return data;
  },
};

export type ChatService = typeof chatService;


