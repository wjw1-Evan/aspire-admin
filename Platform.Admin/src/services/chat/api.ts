import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';
import { AI_ASSISTANT_ID } from '@/constants/ai';

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
export interface SessionListResponse {
  data: ChatSession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

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
  const url = `/api/chat/sessions${query ? `?${query}` : ''}`;

  const response = await request<ApiResponse<SessionListResponse>>(url, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new Error(response.errorMessage || '获取会话列表失败');
  }

  return response.data;
}

/**
 * 获取或创建与小科的会话
 * 如果会话不存在，返回 null，由组件处理首次消息发送
 */
export async function getOrCreateAssistantSession(): Promise<ChatSession | null> {
  // 先尝试查找包含小科的会话
  const sessionsResponse = await getSessions({ page: 1, pageSize: 100 });
  const assistantSession = sessionsResponse.data.find(
    (session) =>
      session.participants.includes(AI_ASSISTANT_ID) &&
      session.participants.length === 2
  );

  return assistantSession || null;
}

/**
 * 发送消息
 * 如果会话不存在，会先创建会话（通过后端自动处理）
 */
export async function sendMessage(
  messageRequest: SendMessageRequest
): Promise<ChatMessage> {
  const response = await request<ApiResponse<ChatMessage>>('/api/chat/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: messageRequest,
  });

  if (!response.success || !response.data) {
    throw new Error(response.errorMessage || '发送消息失败');
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
  const url = `/api/chat/messages/${encodeURIComponent(sessionId)}${
    query ? `?${query}` : ''
  }`;

  const response = await request<ApiResponse<MessageTimelineResponse>>(url, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new Error(response.errorMessage || '获取消息列表失败');
  }

  return response.data;
}


