import { useCallback, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';

const MIN_REQUEST_INTERVAL_MS = 3000;

export interface UseAiAssistantOptions {
  lastMessageId?: string;
  locale?: string;
  force?: boolean;
}

export const useAiAssistant = (sessionId: string) => {
  const { user } = useAuth();
  const { aiSuggestions, aiLoading, fetchAiSuggestions } = useChat();
  const lastRequestedAtRef = useRef<number>(0);

  const suggestions = useMemo(() => aiSuggestions[sessionId] ?? [], [aiSuggestions, sessionId]);
  const loading = useMemo(() => aiLoading[sessionId] ?? false, [aiLoading, sessionId]);

  const requestSuggestions = useCallback(
    async (conversationContext: string[], options: UseAiAssistantOptions = {}) => {
      if (!user?.id) {
        return;
      }

      const now = Date.now();
      if (!options.force && now - lastRequestedAtRef.current < MIN_REQUEST_INTERVAL_MS) {
        return;
      }

      lastRequestedAtRef.current = now;

      await fetchAiSuggestions(sessionId, {
        sessionId,
        userId: user.id,
        conversationContext,
        lastMessageId: options.lastMessageId,
        locale: options.locale,
      });
    },
    [fetchAiSuggestions, sessionId, user?.id]
  );

  return {
    suggestions,
    loading,
    requestSuggestions,
  };
};


