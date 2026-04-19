import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';
import { AI_ASSISTANT_ID } from '@/constants/ai';
import { tokenUtils } from '@/utils/token';
import { getApiBaseUrl } from '@/utils/request';

/**
 * 聊天消息类型
 */
export type ChatMessageType = 'Text' | 'Image' | 'File' | 'System';

/**
 * 聊天会话
 */
export interface ChatSession {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessageId?: string;
  lastMessageExcerpt?: string;
  lastMessageAt?: string;
  unreadCounts?: Record<string, number>;
  topicTags?: string[];
  isMuted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName?: string;
  recipientId?: string;
  type: ChatMessageType;
  content?: string;
  attachment?: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    url: string;
    thumbnailUrl?: string;
    uploadedAt?: string;
  };
  metadata?: Record<string, unknown>;
  isRecalled?: boolean;
  clientMessageId?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 会话列表响应
 */
export type SessionListResponse = PagedResult<ChatSession>;

/**
 * 消息时间线响应
 */
export interface MessageTimelineResponse {
  items: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * 发送消息请求
 */
export interface SendMessageRequest {
  sessionId: string;
  type: ChatMessageType;
  content?: string;
  attachmentId?: string;
  recipientId?: string;
  clientMessageId?: string;
  metadata?: Record<string, unknown>;
  assistantStreaming?: boolean;
}

/**
 * 会话查询参数
 */
export interface SessionQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

/**
 * 消息查询参数
 */
export interface MessageQueryParams {
  cursor?: string;
  limit?: number;
}

/**
 * 获取会话列表
 */
export async function getSessions(
  params: SessionQueryParams = {}
): Promise<SessionListResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params.keyword) queryParams.append('keyword', params.keyword);

  const query = queryParams.toString();
  const url = `/apiservice/api/chat/sessions${query ? `?${query}` : ''}`;

  const response = await request<ApiResponse<SessionListResponse>>(url, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取会话列表失败');
  }

  return response.data;
}

/**
 * 获取或创建与小科的会话
 */
export async function getOrCreateAssistantSession(): Promise<ChatSession | null> {
  try {
    const response = await request<ApiResponse<ChatSession>>('/apiservice/api/chat/sessions/assistant', {
      method: 'GET',
    });
    return response.success && response.data ? response.data : null;
  } catch (error) {
    console.error('获取小科会话失败:', error);
    return null;
  }
}

/**
 * 发送消息（通过 SSE 连接接收 AI 回复）
 * @param messageRequest 消息请求
 * @returns 发送的消息
 */
export async function sendMessage(
  messageRequest: SendMessageRequest
): Promise<ChatMessage> {
  const token = tokenUtils.getToken();
  if (!token) {
    throw new Error('未找到认证令牌');
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/apiservice/api/chat/messages`;

  const response = await request<ApiResponse<ChatMessage>>(url, {
    method: 'POST',
    data: messageRequest,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '发送消息失败');
  }

  return response.data;
}

/**
 * 获取会话消息列表
 */
export async function getMessages(
  sessionId: string,
  params: MessageQueryParams = {}
): Promise<MessageTimelineResponse> {
  const queryParams = new URLSearchParams();
  if (params.cursor) queryParams.append('cursor', params.cursor);
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  const url = `/apiservice/api/chat/messages/${encodeURIComponent(sessionId)}${query ? `?${query}` : ''
    }`;

  const response = await request<ApiResponse<MessageTimelineResponse>>(url, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取消息列表失败');
  }

  return response.data;
}


