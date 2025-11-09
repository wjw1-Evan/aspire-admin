/**
 * AI 能力相关类型定义
 */

import type { ChatMessage } from './chat';

export type AiSuggestionSource = 'smart-reply' | 'topic' | 'ice-breaker' | 'follow-up';

export interface AiSuggestion {
  id: string;
  content: string;
  source: AiSuggestionSource;
  confidence?: number;
  generatedAt: string;
  category?: string;
  style?: string;
  quickTip?: string;
  insight?: string;
  metadata?: Record<string, unknown>;
}

export interface AiSuggestionRequest {
  sessionId: string;
  userId: string;
  conversationContext?: string[];
  conversationMessages?: AiConversationMessage[];
  lastMessageId?: string;
  locale?: string;
}

export interface AiConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiSuggestionResponse {
  suggestions: AiSuggestion[];
  generatedAt: string;
  latencyMs?: number;
  notice?: string;
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

export type AssistantReplyStreamChunkType = 'delta' | 'complete' | 'error';

export interface AssistantReplyStreamChunk {
  type: AssistantReplyStreamChunkType;
  text?: string;
  message?: ChatMessage;
  error?: string;
  timestamp?: string;
}

export interface AssistantReplyStreamRequest {
  sessionId: string;
  triggerMessageId?: string;
  triggerClientMessageId?: string;
  clientMessageId: string;
  locale?: string;
}


