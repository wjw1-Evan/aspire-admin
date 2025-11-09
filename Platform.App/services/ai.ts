import { apiService } from './api';
import { API_ENDPOINTS } from './apiConfig';
import { getApiBaseUrl } from '@/constants/apiConfig';
import type {
  AiSuggestion,
  AiSuggestionRequest,
  AiSuggestionStreamChunk,
  MatchSuggestionRequest,
  MatchSuggestionResponse,
  AiTopicGuideResponse,
} from '@/types/ai';

type SmartReplyStreamHandlers = {
  onDelta?: (text: string) => void;
  onComplete?: (suggestions: AiSuggestion[], chunk: AiSuggestionStreamChunk) => void;
  onFallback?: (suggestions: AiSuggestion[], chunk: AiSuggestionStreamChunk) => void;
  onError?: (message: string) => void;
};

interface SmartReplyStreamOptions {
  signal?: AbortSignal;
}

const parseStreamEvent = (rawEvent: string): AiSuggestionStreamChunk | null => {
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
    return JSON.parse(jsonPayload) as AiSuggestionStreamChunk;
  } catch {
    return null;
  }
};

const handleStreamChunk = (
  chunk: AiSuggestionStreamChunk,
  handlers: SmartReplyStreamHandlers
): boolean => {
  switch (chunk.type) {
    case 'delta':
      if (chunk.text) {
        handlers.onDelta?.(chunk.text);
      }
      return false;
    case 'complete':
      handlers.onComplete?.(chunk.suggestions ?? [], chunk);
      return true;
    case 'fallback':
      handlers.onFallback?.(chunk.suggestions ?? [], chunk);
      return true;
    case 'error':
      handlers.onError?.(chunk.error ?? '智能回复生成失败');
      return true;
    default:
      return false;
  }
};

const drainSseBuffer = (
  buffer: string,
  handlers: SmartReplyStreamHandlers
): { buffer: string; completed: boolean } => {
  let remaining = buffer;
  let completed = false;
  let boundaryIndex = remaining.indexOf('\n\n');

  while (!completed && boundaryIndex !== -1) {
    const rawEvent = remaining.slice(0, boundaryIndex);
    remaining = remaining.slice(boundaryIndex + 2);
    boundaryIndex = remaining.indexOf('\n\n');

    const chunk = parseStreamEvent(rawEvent);
    if (chunk) {
      completed = handleStreamChunk(chunk, handlers);
    }
  }

  return { buffer: remaining, completed };
};

const fetchSmartReplyResponse = async (
  url: string,
  payload: AiSuggestionRequest,
  signal: AbortSignal
): Promise<Response> => {
  const token = await apiService.getToken();
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
    await apiService.clearAllTokens();
    throw new Error('登录已过期，请重新登录后重试');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const message = errorText || `获取智能回复失败 (${response.status})`;
    throw new Error(message);
  }

  return response;
};

const consumeSmartReplyStream = async (
  response: Response,
  handlers: SmartReplyStreamHandlers,
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
    const drained = drainSseBuffer(buffer, handlers);
    buffer = drained.buffer;

    if (drained.completed) {
      completed = true;
      abortController.abort();
    }
  }

  if (!completed && buffer.trim().length > 0) {
    const trailingChunk = parseStreamEvent(buffer.trim());
    if (trailingChunk) {
      handleStreamChunk(trailingChunk, handlers);
    }
  }
};

export const aiService = {
  async streamSmartReplies(
    payload: AiSuggestionRequest,
    handlers: SmartReplyStreamHandlers = {},
    options: SmartReplyStreamOptions = {}
  ): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${API_ENDPOINTS.aiSmartRepliesStream}`;
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
      const response = await fetchSmartReplyResponse(url, payload, abortController.signal);
      await consumeSmartReplyStream(response, handlers, abortController);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      if (error instanceof Error) {
        handlers.onError?.(error.message);
        throw error;
      }

      handlers.onError?.('智能回复请求失败');
      throw error;
    } finally {
      if (options.signal && externalAbortHandler) {
        options.signal.removeEventListener('abort', externalAbortHandler);
      }
    }
  },

  getMatchSuggestions: async (payload: MatchSuggestionRequest): Promise<MatchSuggestionResponse> => {
    return apiService.post<MatchSuggestionResponse>(API_ENDPOINTS.aiMatchSuggestions, payload, {
      timeout: 20000,
    });
  },

  getTopicGuides: async (sessionId: string): Promise<AiTopicGuideResponse> => {
    return apiService.get<AiTopicGuideResponse>(`${API_ENDPOINTS.aiTopicGuides}/${encodeURIComponent(sessionId)}`);
  },
};

export type AiService = typeof aiService;
