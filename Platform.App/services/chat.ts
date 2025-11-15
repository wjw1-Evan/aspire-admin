import { apiService } from './api';
import { tokenManager } from './tokenManager';
import { API_ENDPOINTS } from './apiConfig';
import { getApiBaseUrl } from '@/constants/apiConfig';
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
import type { AssistantReplyStreamChunk, AssistantReplyStreamRequest } from '@/types/ai';

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

type AssistantReplyStreamHandlers = {
  onDelta?: (text: string) => void;
  onComplete?: (chunk: AssistantReplyStreamChunk) => void;
  onError?: (message: string) => void;
};

interface AssistantReplyStreamOptions {
  signal?: AbortSignal;
}

const parseAssistantStreamEvent = (rawEvent: string): AssistantReplyStreamChunk | null => {
  if (!rawEvent) {
    return null;
  }

  const dataLines = rawEvent
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim());

  if (dataLines.length === 0) {
    return null;
  }

  const jsonPayload = dataLines.join('');
  if (!jsonPayload) {
    return null;
  }

  try {
    return JSON.parse(jsonPayload) as AssistantReplyStreamChunk;
  } catch {
    return null;
  }
};

const handleAssistantStreamChunk = (
  chunk: AssistantReplyStreamChunk,
  handlers: AssistantReplyStreamHandlers
): boolean => {
  switch (chunk.type) {
    case 'delta':
      if (chunk.text) {
        handlers.onDelta?.(chunk.text);
      }
      return false;
    case 'complete':
      handlers.onComplete?.(chunk);
      return true;
    case 'error':
      handlers.onError?.(chunk.error ?? '助手回复失败');
      return true;
    default:
      return false;
  }
};

const drainAssistantSseBuffer = (
  buffer: string,
  handlers: AssistantReplyStreamHandlers
): { buffer: string; completed: boolean } => {
  let remaining = buffer;
  let completed = false;
  let boundaryIndex = remaining.indexOf('\n\n');

  while (!completed && boundaryIndex !== -1) {
    const rawEvent = remaining.slice(0, boundaryIndex);
    remaining = remaining.slice(boundaryIndex + 2);
    boundaryIndex = remaining.indexOf('\n\n');

    const chunk = parseAssistantStreamEvent(rawEvent);
    if (chunk) {
      completed = handleAssistantStreamChunk(chunk, handlers);
    }
  }

  return { buffer: remaining, completed };
};

const fetchAssistantReplyResponse = async (
  url: string,
  payload: AssistantReplyStreamRequest,
  signal: AbortSignal
): Promise<Response> => {
  const token = await tokenManager.getToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    // 非阻塞方式清除 token，避免阻塞流式响应
    void tokenManager.clearAllTokens();
    throw new Error('登录已过期，请重新登录后重试');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `助手回复请求失败 (${response.status})`);
  }

  return response;
};

const consumeAssistantReplyStream = async (
  response: Response,
  handlers: AssistantReplyStreamHandlers,
  abortController: AbortController
): Promise<void> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('当前环境不支持流式响应');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let completed = false;

  while (!completed) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const drained = drainAssistantSseBuffer(buffer, handlers);
    buffer = drained.buffer;

    if (drained.completed) {
      completed = true;
      abortController.abort();
    }
  }

  if (!completed && buffer.trim().length > 0) {
    const trailingChunk = parseAssistantStreamEvent(buffer.trim());
    if (trailingChunk) {
      handleAssistantStreamChunk(trailingChunk, handlers);
    }
  }
};

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
    if (!lastReadMessageId || !lastReadMessageId.trim()) {
      throw new Error('消息ID不能为空');
    }

    // 使用后端期望的参数名 LastMessageId（虽然 .NET 模型绑定大小写不敏感，但保持一致更好）
    await apiService.post<void>(`${API_ENDPOINTS.chatMessages}/${encodeURIComponent(sessionId)}/read`, {
      LastMessageId: lastReadMessageId.trim(),
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

  async streamAssistantReply(
    payload: AssistantReplyStreamRequest,
    handlers: AssistantReplyStreamHandlers = {},
    options: AssistantReplyStreamOptions = {}
  ): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${API_ENDPOINTS.aiAssistantReplyStream}`;
    const abortController = new AbortController();
    let externalAbortHandler: (() => void) | undefined;

    if (options.signal) {
      if (options.signal.aborted) {
        abortController.abort(options.signal.reason);
      } else {
        externalAbortHandler = () => abortController.abort(options.signal?.reason);
        options.signal.addEventListener('abort', externalAbortHandler);
      }
    }

    try {
      const response = await fetchAssistantReplyResponse(url, payload, abortController.signal);
      await consumeAssistantReplyStream(response, handlers, abortController);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      const message = error instanceof Error ? error.message : '助手回复失败';
      handlers.onError?.(message);
      throw error;
    } finally {
      if (options.signal && externalAbortHandler) {
        options.signal.removeEventListener('abort', externalAbortHandler);
      }
    }
  },
};

export type ChatService = typeof chatService;


