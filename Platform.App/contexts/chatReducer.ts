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
  aiStreamText: Record<string, string>;
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
  aiStreamText: {},
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
  | { type: 'CHAT_SET_NEARBY_USERS'; payload: NearbyUser[] }
  | { type: 'CHAT_SET_NEARBY_LOADING'; payload: boolean }
  | { type: 'CHAT_SET_AI_SUGGESTIONS'; payload: { sessionId: string; suggestions: AiSuggestion[] } }
  | { type: 'CHAT_SET_AI_LOADING'; payload: { sessionId: string; loading: boolean } }
  | { type: 'CHAT_SET_AI_STREAM_TEXT'; payload: { sessionId: string; text: string } }
  | { type: 'CHAT_APPEND_AI_STREAM_TEXT'; payload: { sessionId: string; text: string } }
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

const appendMessage = (existing: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const hasExisting = existing.some(item => item.id === message.id);
  if (hasExisting) {
    return existing
      .map(item => (item.id === message.id ? { ...item, ...message } : item))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return [...existing, message].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
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
        aiStreamText: {
          ...state.aiStreamText,
          [action.payload.sessionId]: '',
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
    case 'CHAT_SET_AI_STREAM_TEXT':
      return {
        ...state,
        aiStreamText: {
          ...state.aiStreamText,
          [action.payload.sessionId]: action.payload.text,
        },
      };
    case 'CHAT_APPEND_AI_STREAM_TEXT': {
      const currentText = state.aiStreamText[action.payload.sessionId] ?? '';
      return {
        ...state,
        aiStreamText: {
          ...state.aiStreamText,
          [action.payload.sessionId]: `${currentText}${action.payload.text}`,
        },
      };
    }
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


