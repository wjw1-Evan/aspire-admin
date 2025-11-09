import { apiService } from './api';
import { API_ENDPOINTS } from './apiConfig';
import type { ApiResponse } from '@/types/unified-api';
import type {
  AttachmentMetadata,
  ChatMessage,
  MessageSendRequest,
  MessageTimelineResponse,
  SessionListResponse,
  UploadAttachmentResponse,
  ServerChatSession,
} from '@/types/chat';

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

interface PaginatedSessionApiResponse {
  data: ServerChatSession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export const chatService = {
  getSessions: async (params: SessionQueryParams = {}): Promise<SessionListResponse> => {
    const query = buildQueryString(params as Record<string, string | number | boolean | undefined>);
    const rawResponse = await apiService.get<ApiResponse<PaginatedSessionApiResponse>>(
      `${API_ENDPOINTS.chatSessions}${query}`
    );
    const response = ensureApiSuccess(rawResponse, '加载会话列表失败');
    const payload = response.data;

    return {
      items: payload?.data ?? [],
      total: payload?.total ?? 0,
      page: payload?.page ?? params.page ?? 1,
      pageSize: payload?.pageSize ?? params.pageSize ?? (payload?.data?.length ?? 0),
      totalPages: payload?.totalPages,
      hasPreviousPage: payload?.hasPreviousPage,
      hasNextPage: payload?.hasNextPage,
    };
  },

  getMessages: async (sessionId: string, params: MessageQueryParams = {}): Promise<MessageTimelineResponse> => {
    const query = buildQueryString(params as Record<string, string | number | boolean | undefined>);
    const rawResponse = await apiService.get<ApiResponse<MessageTimelineResponse>>(
      `${API_ENDPOINTS.chatMessages}/${encodeURIComponent(sessionId)}${query}`
    );
    const response = ensureApiSuccess(rawResponse, '加载消息失败');
    return (
      response.data ?? {
        items: [],
        hasMore: false,
      }
    );
  },

  sendMessage: async (payload: MessageSendRequest): Promise<ChatMessage> => {
    const rawResponse = await apiService.post<ApiResponse<ChatMessage>>(API_ENDPOINTS.chatMessages, payload);
    const response = ensureApiSuccess(rawResponse, '发送消息失败');
    if (!response.data) {
      throw new Error('发送消息失败：服务器未返回消息内容');
    }
    return response.data;
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
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as any);

    const response = await apiService.postForm<ApiResponse<UploadAttachmentResponse>>(
      `${API_ENDPOINTS.chatAttachments}/${encodeURIComponent(sessionId)}/attachments`,
      formData,
      { timeout: 30000 }
    );

    if (!response.success || !response.data?.attachment) {
      throw new Error(response.errorMessage || '上传附件失败');
    }

    return response.data.attachment;
  },
};

export type ChatService = typeof chatService;


