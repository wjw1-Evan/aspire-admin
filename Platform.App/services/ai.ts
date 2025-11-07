import { apiService } from './api';
import { API_ENDPOINTS } from './apiConfig';
import type {
  AiSuggestionRequest,
  AiSuggestionResponse,
  MatchSuggestionRequest,
  MatchSuggestionResponse,
  AiTopicGuideResponse,
} from '@/types/ai';

export const aiService = {
  getSmartReplies: async (payload: AiSuggestionRequest): Promise<AiSuggestionResponse> => {
    return apiService.post<AiSuggestionResponse>(API_ENDPOINTS.aiSmartReplies, payload, {
      timeout: 15000,
    });
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


