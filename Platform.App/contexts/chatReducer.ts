import type { ChatMessage, ChatSession, NearbyUser } from '@/types/chat';
import type { AiSuggestion } from '@/types/ai';

export interface MessageTimelineState {
  loading: boolean;
  error?: string;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ChatState {
  sessions: Record<string, ChatSession>;
  sessionOrder: string[];
  sessionsLoading: boolean;
  sessionsError?: string;
  activeSessionId?: string;
  messages: Record<string, ChatMessage[]>;
  messageState: Record<string, MessageTimelineState>;
  nearbyUsers: NearbyUser[];
  nearbyLoading: boolean;
  aiSuggestions: Record<string, AiSuggestion[]>;
  aiLoading: Record<string, boolean>;
  aiSuggestionNotice: Record<string, string | undefined>;
  error?: string;
}

export const initialChatState: ChatState = {
  sessions: {},
  sessionOrder: [],
  sessionsLoading: false,
  messages: {},
  messageState: {},
  nearbyUsers: [],
  nearbyLoading: false,
  aiSuggestions: {},
  aiLoading: {},
  aiSuggestionNotice: {},
};

type ChatReducerAction =
  | { type: 'CHAT_SESSIONS_LOADING' }
  | { type: 'CHAT_SESSIONS_SUCCESS'; payload: { sessions: ChatSession[] } }
  | { type: 'CHAT_SESSIONS_FAILURE'; payload: string }
  | { type: 'CHAT_SET_ACTIVE_SESSION'; payload: string | undefined }
  | { type: 'CHAT_MESSAGES_LOADING'; payload: { sessionId: string } }
  | {
      type: 'CHAT_MESSAGES_SUCCESS';
      payload: {
        sessionId: string;
        messages: ChatMessage[];
        hasMore: boolean;
        nextCursor?: string;
        replace?: boolean;
      };
    }
  | { type: 'CHAT_MESSAGES_FAILURE'; payload: { sessionId: string; error: string } }
  | { type: 'CHAT_APPEND_MESSAGE'; payload: { sessionId: string; message: ChatMessage } }
  | {
      type: 'CHAT_UPDATE_MESSAGE';
      payload: { sessionId: string; messageId: string; updates: Partial<ChatMessage> };
    }
  | {
      type: 'CHAT_REPLACE_MESSAGE';
      payload: { sessionId: string; localId?: string; message: ChatMessage };
    }
  | { type: 'CHAT_SET_NEARBY_USERS'; payload: NearbyUser[] }
  | { type: 'CHAT_SET_NEARBY_LOADING'; payload: boolean }
  | { type: 'CHAT_SET_AI_SUGGESTIONS'; payload: { sessionId: string; suggestions: AiSuggestion[] } }
  | { type: 'CHAT_SET_AI_LOADING'; payload: { sessionId: string; loading: boolean } }
  | { type: 'CHAT_SET_AI_NOTICE'; payload: { sessionId: string; notice?: string } }
  | { type: 'CHAT_SET_ERROR'; payload: string }
  | { type: 'CHAT_CLEAR_ERROR' }
  | { type: 'CHAT_RESET' };

const mergeSessions = (state: ChatState, sessions: ChatSession[]): ChatState => {
  const nextSessions = { ...state.sessions };
  const nextOrder = new Set(state.sessionOrder);

  sessions.forEach(session => {
    nextSessions[session.id] = session;
    nextOrder.add(session.id);
  });

  const sortedOrder = Array.from(nextOrder).sort((a, b) => {
    const sessionA = nextSessions[a];
    const sessionB = nextSessions[b];

    const timestampA = sessionA?.updatedAt ?? sessionA?.lastMessageAt ?? sessionA?.createdAt;
    const timestampB = sessionB?.updatedAt ?? sessionB?.lastMessageAt ?? sessionB?.createdAt;

    const timeA = timestampA ? new Date(timestampA).getTime() : 0;
    const timeB = timestampB ? new Date(timestampB).getTime() : 0;

    return timeB - timeA;
  });

  return {
    ...state,
    sessions: nextSessions,
    sessionOrder: sortedOrder,
    sessionsLoading: false,
    sessionsError: undefined,
  };
};

const normalizeMessage = (message: ChatMessage): ChatMessage => {
  const metadataClientMessageId = (() => {
    const raw = message.metadata?.['clientMessageId'];
    return typeof raw === 'string' ? raw : undefined;
  })();

  return {
    ...message,
    status: message.status ?? 'sent',
    clientMessageId: message.clientMessageId ?? metadataClientMessageId,
  };
};

const appendMessage = (existing: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const normalized = normalizeMessage(message);
  const targetLocalId = normalized.clientMessageId ?? normalized.localId;

  if (targetLocalId) {
    let replaced = false;
    const next = existing.map(item => {
      if (item.localId === targetLocalId || item.id === targetLocalId) {
        replaced = true;
        return {
          ...item,
          ...normalized,
          id: normalized.id,
          localId: undefined,
          isLocal: false,
          status: normalized.status ?? 'sent',
        };
      }
      return item;
    });

    if (replaced) {
      return next.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
  }

  const hasExisting = existing.some(item => item.id === normalized.id);
  if (hasExisting) {
    return existing
      .map(item => (item.id === normalized.id ? { ...item, ...normalized } : item))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return [...existing, normalized].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

const replaceMessage = (
  existing: ChatMessage[],
  localId: string | undefined,
  message: ChatMessage
): ChatMessage[] => {
  const normalized = normalizeMessage(message);
  const targetLocalId = localId ?? normalized.clientMessageId ?? normalized.localId;

  if (!targetLocalId) {
    return appendMessage(existing, normalized);
  }

  let replaced = false;
  const next = existing.map(item => {
    if (item.id === targetLocalId || item.localId === targetLocalId) {
      replaced = true;
      return {
        ...item,
        ...normalized,
        id: normalized.id,
        localId: undefined,
        isLocal: false,
        status: normalized.status ?? 'sent',
      };
    }
    return item;
  });

  if (!replaced) {
    next.push({ ...normalized, status: normalized.status ?? 'sent' });
  }

  return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export function chatReducer(state: ChatState, action: ChatReducerAction): ChatState {
  switch (action.type) {
    case 'CHAT_SESSIONS_LOADING':
      return {
        ...state,
        sessionsLoading: true,
        sessionsError: undefined,
      };
    case 'CHAT_SESSIONS_SUCCESS':
      return mergeSessions(state, action.payload.sessions);
    case 'CHAT_SESSIONS_FAILURE':
      return {
        ...state,
        sessionsLoading: false,
        sessionsError: action.payload,
      };
    case 'CHAT_SET_ACTIVE_SESSION':
      return {
        ...state,
        activeSessionId: action.payload,
      };
    case 'CHAT_MESSAGES_LOADING':
      return {
        ...state,
        messageState: {
          ...state.messageState,
          [action.payload.sessionId]: {
            ...(state.messageState[action.payload.sessionId] ?? { hasMore: true }),
            loading: true,
            error: undefined,
          },
        },
      };
    case 'CHAT_MESSAGES_SUCCESS': {
      const { sessionId, messages, hasMore, nextCursor, replace } = action.payload;
      const currentMessages = state.messages[sessionId] ?? [];
      const nextMessages = replace
        ? messages
        : [...currentMessages, ...messages].reduce<ChatMessage[]>((result, item) => {
            const exists = result.find(existing => existing.id === item.id);
            if (exists) {
              Object.assign(exists, item);
            } else {
              result.push(item);
            }
            return result;
          }, []).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionId]: nextMessages,
        },
        messageState: {
          ...state.messageState,
          [sessionId]: {
            loading: false,
            error: undefined,
            hasMore,
            nextCursor,
          },
        },
      };
    }
    case 'CHAT_MESSAGES_FAILURE':
      return {
        ...state,
        messageState: {
          ...state.messageState,
          [action.payload.sessionId]: {
            ...(state.messageState[action.payload.sessionId] ?? { hasMore: true }),
            loading: false,
            error: action.payload.error,
          },
        },
      };
    case 'CHAT_APPEND_MESSAGE': {
      const { sessionId, message } = action.payload;
      const existing = state.messages[sessionId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionId]: appendMessage(existing, message),
        },
      };
    }
    case 'CHAT_UPDATE_MESSAGE': {
      const { sessionId, messageId, updates } = action.payload;
      const existing = state.messages[sessionId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionId]: existing.map(message =>
            message.id === messageId ? { ...message, ...updates } : message
          ),
        },
      };
    }
    case 'CHAT_REPLACE_MESSAGE': {
      const { sessionId, localId, message } = action.payload;
      const existing = state.messages[sessionId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionId]: replaceMessage(existing, localId, message),
        },
      };
    }
    case 'CHAT_SET_NEARBY_USERS':
      return {
        ...state,
        nearbyUsers: action.payload,
        nearbyLoading: false,
      };
    case 'CHAT_SET_NEARBY_LOADING':
      return {
        ...state,
        nearbyLoading: action.payload,
      };
    case 'CHAT_SET_AI_SUGGESTIONS':
      return {
        ...state,
        aiSuggestions: {
          ...state.aiSuggestions,
          [action.payload.sessionId]: action.payload.suggestions,
        },
        aiLoading: {
          ...state.aiLoading,
          [action.payload.sessionId]: false,
        },
      };
    case 'CHAT_SET_AI_LOADING':
      return {
        ...state,
        aiLoading: {
          ...state.aiLoading,
          [action.payload.sessionId]: action.payload.loading,
        },
      };
    case 'CHAT_SET_AI_NOTICE':
      return {
        ...state,
        aiSuggestionNotice: {
          ...state.aiSuggestionNotice,
          [action.payload.sessionId]: action.payload.notice,
        },
      };
    case 'CHAT_SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CHAT_CLEAR_ERROR':
      return {
        ...state,
        error: undefined,
      };
    case 'CHAT_RESET':
      return {
        ...initialChatState,
      };
    default:
      return state;
  }
}

export type ChatAction = ChatReducerAction;


