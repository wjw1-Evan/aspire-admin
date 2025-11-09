/**
 * AI 能力相关类型定义
 */

export type AiSuggestionSource = 'smart-reply' | 'topic' | 'ice-breaker' | 'follow-up';

export interface AiSuggestion {
  id: string;
  content: string;
  source: AiSuggestionSource;
  confidence?: number;
  generatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AiSuggestionRequest {
  sessionId: string;
  userId: string;
  conversationContext?: string[];
  lastMessageId?: string;
  locale?: string;
}

export type AiSuggestionStreamChunkType = 'delta' | 'complete' | 'fallback' | 'error';

export interface AiSuggestionStreamChunk {
  type: AiSuggestionStreamChunkType;
  text?: string;
  suggestions?: AiSuggestion[];
  latencyMs?: number;
  timestamp?: string;
  error?: string;
}

export interface MatchSuggestion {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  sharedInterests?: string[];
  matchScore: number;
  bio?: string;
  locationTagline?: string;
  sessionId?: string;
}

export interface MatchSuggestionRequest {
  userId: string;
  latitude?: number;
  longitude?: number;
  interests?: string[];
  limit?: number;
}

export interface MatchSuggestionResponse {
  items: MatchSuggestion[];
  generatedAt: string;
}

export interface AiTopicGuide {
  topic: string;
  prompt: string;
  followUps?: string[];
}

export interface AiTopicGuideResponse {
  guides: AiTopicGuide[];
}


