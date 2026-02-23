import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';
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
export interface SessionListResponse {
  list: ChatSession[];
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
    throw new Error(response.message || '获取会话列表失败');
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
  const assistantSession = sessionsResponse.list.find(
    (session) =>
      session.participants.includes(AI_ASSISTANT_ID) &&
      session.participants.length === 2
  );

  return assistantSession || null;
}

/**
 * 发送消息并流式接收 AI 回复（统一接口）
 * @param messageRequest 消息请求
 * @param callbacks 回调函数集合
 */
export async function sendMessageWithStreaming(
  messageRequest: SendMessageRequest,
  callbacks: {
    onUserMessage?: (message: ChatMessage) => void;
    onAssistantStart?: (message: ChatMessage) => void;
    onAssistantChunk?: (sessionId: string, messageId: string, delta: string) => void;
    onAssistantComplete?: (message: ChatMessage) => void;
    onError?: (error: string) => void;
  }
): Promise<void> {
  const token = tokenUtils.getToken();
  if (!token) {
    throw new Error('未找到认证令牌');
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/chat/messages?stream=true`;

  try {
    // 使用 fetch API 发送 POST 请求并读取 SSE 流
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(messageRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('无法读取响应流');
    }

    let buffer = '';
    let currentEventType = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEventType = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();
          if (!data || data === 'null') continue;

          try {
            const payload = JSON.parse(data);

            // 根据事件类型调用相应的回调
            switch (currentEventType) {
              case 'UserMessage':
                if (payload.message) {
                  callbacks.onUserMessage?.(payload.message);
                }
                break;
              case 'AssistantMessageStart':
                if (payload.message) {
                  callbacks.onAssistantStart?.(payload.message);
                }
                break;
              case 'AssistantMessageChunk':
                if (payload.sessionId && payload.messageId && payload.delta) {
                  console.log('[sendMessageWithStreaming] 收到 AssistantMessageChunk:', {
                    sessionId: payload.sessionId,
                    messageId: payload.messageId,
                    delta: payload.delta,
                    deltaLength: payload.delta.length,
                  });
                  callbacks.onAssistantChunk?.(payload.sessionId, payload.messageId, payload.delta);
                } else {
                  console.warn('[sendMessageWithStreaming] AssistantMessageChunk 数据不完整:', payload);
                }
                break;
              case 'AssistantMessageComplete':
                if (payload.message) {
                  callbacks.onAssistantComplete?.(payload.message);
                }
                break;
              case 'Error':
                if (payload.error) {
                  callbacks.onError?.(payload.error);
                }
                break;
            }
          } catch (e) {
            console.error('解析 SSE 数据失败:', e, data);
          }
        } else if (line.trim() === '') {
          // 空行表示事件结束，重置事件类型
          currentEventType = '';
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : '发送消息失败');
    throw error;
  }
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
  const url = `/api/chat/messages/${encodeURIComponent(sessionId)}${query ? `?${query}` : ''
    }`;

  const response = await request<ApiResponse<MessageTimelineResponse>>(url, {
    method: 'GET',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取消息列表失败');
  }

  return response.data;
}


