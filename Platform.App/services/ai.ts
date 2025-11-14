import { apiService } from './api';
import { API_ENDPOINTS } from './apiConfig';
import { getApiBaseUrl } from '@/constants/apiConfig';
import type {
  AiSuggestionRequest,
  AiSuggestionResponse,
  MatchSuggestionRequest,
  MatchSuggestionResponse,
  AiTopicGuideResponse,
} from '@/types/ai';

interface RequestOptions {
  signal?: AbortSignal;
}

const getSmartReplies = async (
  payload: AiSuggestionRequest,
  options: RequestOptions = {}
): Promise<AiSuggestionResponse> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${API_ENDPOINTS.aiSmartReplies}`;
  const token = await apiService.getToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (response.status === 401 || response.status === 403) {
    // 非阻塞方式清除 token，避免阻塞请求处理
    void apiService.clearAllTokens();
    throw new Error('登录已过期，请重新登录后重试');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const message = errorText || `获取智能回复失败 (${response.status})`;
    throw new Error(message);
  }

  return (await response.json()) as AiSuggestionResponse;
};

export const aiService = {
  getSmartReplies,
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
