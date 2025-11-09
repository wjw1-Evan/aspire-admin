import { useCallback, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import type { AiConversationMessage } from '@/types/ai';

const MIN_REQUEST_INTERVAL_MS = 3000;

type ConversationPayload =
  | string[]
  | {
      lines: string[];
      messages: AiConversationMessage[];
    };

export interface UseAiAssistantOptions {
  lastMessageId?: string;
  locale?: string;
  force?: boolean;
}

export const useAiAssistant = (sessionId: string) => {
  const { user } = useAuth();
  const { aiSuggestions, aiLoading, aiSuggestionNotice, fetchAiSuggestions } = useChat();
  const lastRequestedAtRef = useRef<number>(0);

  const suggestions = useMemo(() => aiSuggestions[sessionId] ?? [], [aiSuggestions, sessionId]);
  const loading = useMemo(() => aiLoading[sessionId] ?? false, [aiLoading, sessionId]);

  const notice = useMemo(() => aiSuggestionNotice[sessionId], [aiSuggestionNotice, sessionId]);

  const requestSuggestions = useCallback(
    async (conversation: ConversationPayload, options: UseAiAssistantOptions = {}) => {
      if (!user?.id) {
        return;
      }

      const now = Date.now();
      if (!options.force && now - lastRequestedAtRef.current < MIN_REQUEST_INTERVAL_MS) {
        return;
      }

      lastRequestedAtRef.current = now;

      const lines = Array.isArray(conversation)
        ? conversation
        : conversation.lines;

      const messages = Array.isArray(conversation)
        ? []
        : conversation.messages;

      if (lines.length === 0 && messages.length === 0 && !options.lastMessageId) {
        return;
      }

      await fetchAiSuggestions(sessionId, {
        sessionId,
        userId: user.id,
        conversationContext: lines,
        conversationMessages: messages,
        lastMessageId: options.lastMessageId,
        locale: options.locale,
      });
    },
    [fetchAiSuggestions, sessionId, user?.id]
  );

  return {
    suggestions,
    loading,
    notice,
    requestSuggestions,
  };
};


