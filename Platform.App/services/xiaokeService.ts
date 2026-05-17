import { apiClient } from './api';
import { ApiResponse } from '../types/api';
import {
  ChatSession,
  ChatMessage,
  ChatMessageTimelineResponse,
  SendChatMessageRequest,
} from '../types/xiaoke';

export const xiaokeService = {
  async getAssistantSession(): Promise<ApiResponse<ChatSession>> {
    return await apiClient.get<any, ApiResponse<ChatSession>>(
      '/api/chat/sessions/assistant',
    );
  },

  async createNewAssistantSession(): Promise<ApiResponse<ChatSession>> {
    return await apiClient.post<any, ApiResponse<ChatSession>>(
      '/api/chat/sessions/assistant/new',
    );
  },

  async getMessages(
    sessionId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<ApiResponse<ChatMessageTimelineResponse>> {
    return await apiClient.get<any, ApiResponse<ChatMessageTimelineResponse>>(
      `/api/chat/messages/${sessionId}`,
      { params },
    );
  },

  async sendMessage(
    data: SendChatMessageRequest,
  ): Promise<ApiResponse<ChatMessage>> {
    return await apiClient.post<any, ApiResponse<ChatMessage>>(
      '/api/chat/messages',
      data,
    );
  },
};
