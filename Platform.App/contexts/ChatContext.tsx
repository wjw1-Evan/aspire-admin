import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';

import type { AiSuggestionRequest } from '@/types/ai';
import type {
  AttachmentMetadata,
  ChatMessage,
  ChatMessageDeletedPayload,
  ChatMessageRealtimePayload,
  ChatSession,
  ChatSessionReadPayload,
  ChatSessionRealtimePayload,
  MessageSendRequest,
  NearbySearchRequest,
  ServerChatSession,
} from '@/types/chat';
import type { MessageQueryParams, SessionQueryParams } from '@/services/chat';
import {
  clearChatErrorAction,
  fetchAiSuggestionsAction,
  loadMessagesAction,
  loadSessionsAction,
  receiveMessageAction,
  updateMessageAction,
  resetChatAction,
  sendMessageAction,
  setActiveSessionAction,
  updateNearbyUsersAction,
  updateLocationBeaconAction,
} from './chatActions';
import { chatService } from '@/services/chat';
import { apiService } from '@/services/api';
import { getApiBaseUrl } from '@/constants/apiConfig';
import { chatReducer, initialChatState, type ChatState } from './chatReducer';
import { useAuth } from './AuthContext';

interface ChatContextValue extends ChatState {
  loadSessions: (params?: SessionQueryParams) => Promise<void>;
  loadMessages: (sessionId: string, params?: MessageQueryParams) => Promise<void>;
  sendMessage: (payload: MessageSendRequest) => Promise<ChatMessage | undefined>;
  receiveMessage: (sessionId: string, message: ChatMessage) => void;
  setActiveSession: (sessionId: string | undefined) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  uploadAttachment: (sessionId: string, file: { uri: string; name: string; type: string }) => Promise<AttachmentMetadata>;
  refreshNearbyUsers: (request?: NearbySearchRequest) => Promise<void>;
  updateLocationBeacon: (payload: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  fetchAiSuggestions: (sessionId: string, request: AiSuggestionRequest) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
  connectionState: HubConnectionState;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  readonly children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const { isAuthenticated, user } = useAuth();
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected);
  const connectionRef = useRef<HubConnection | null>(null);
  const activeSessionRef = useRef<string | undefined>(undefined);
  const sessionsRef = useRef(state.sessions);

  useEffect(() => {
    sessionsRef.current = state.sessions;
  }, [state.sessions]);

  const currentUserId = useMemo(() => user?.id ?? user?.username ?? undefined, [user?.id, user?.username]);

  const normalizeSession = useCallback(
    (session: ServerChatSession | ChatSession): ChatSession => {
      const unreadCounts = session.unreadCounts ?? {};
      const unreadCount = currentUserId ? unreadCounts[currentUserId] ?? 0 : 0;

      const updatedAt = session.updatedAt ?? session.lastMessageAt ?? session.createdAt;

      return {
        ...session,
        unreadCounts,
        unreadCount,
        updatedAt,
      };
    },
    [currentUserId]
  );

  const resetChat = useCallback(() => {
    resetChatAction(dispatch);
    activeSessionRef.current = undefined;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      resetChat();
    }
  }, [isAuthenticated, resetChat]);

  const loadSessions = useCallback(
    async (params: SessionQueryParams = {}) => {
      await loadSessionsAction(dispatch, params, {
        transform: rawSessions => rawSessions.map(normalizeSession),
      });
    },
    [normalizeSession]
  );

  const loadMessages = useCallback(
    async (sessionId: string, params?: MessageQueryParams) => {
      await loadMessagesAction(dispatch, sessionId, params);
    },
    []
  );

  const sendMessage = useCallback(
    async (payload: MessageSendRequest) => {
      const connection = connectionRef.current;

      if (connection?.state === HubConnectionState.Connected) {
        try {
          await connection.invoke('SendMessageAsync', payload);
          return undefined;
        } catch (error) {
          console.warn('通过 SignalR 发送消息失败，回退到 REST 调用:', error);
        }
      }

      return sendMessageAction(dispatch, payload);
    },
    []
  );

  const receiveMessage = useCallback(
    (sessionId: string, message: ChatMessage) => {
      receiveMessageAction(dispatch, sessionId, message);
    },
    []
  );

  const setActiveSession = useCallback((sessionId: string | undefined) => {
    const connection = connectionRef.current;
    const previousSessionId = activeSessionRef.current;

    activeSessionRef.current = sessionId ?? undefined;

    if (connection?.state === HubConnectionState.Connected) {
      if (previousSessionId && previousSessionId !== sessionId) {
        connection.invoke('LeaveSessionAsync', previousSessionId).catch(error => {
          console.warn('离开会话失败:', error);
        });
      }

      if (sessionId) {
        connection.invoke('JoinSessionAsync', sessionId).catch(error => {
          console.warn('加入会话失败:', error);
        });
      }
    }

    setActiveSessionAction(dispatch, sessionId);
  }, []);

  const updateMessage = useCallback(
    (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => {
      updateMessageAction(dispatch, sessionId, messageId, updates);
    },
    []
  );

  const uploadAttachment = useCallback(
    async (sessionId: string, file: { uri: string; name: string; type: string }) => {
      return chatService.uploadAttachment(sessionId, file);
    },
    []
  );

  const refreshNearbyUsers = useCallback(async (request?: NearbySearchRequest) => {
    await updateNearbyUsersAction(dispatch, request);
  }, []);

  const updateLocationBeacon = useCallback(async (payload: { latitude: number; longitude: number; accuracy?: number }) => {
    await updateLocationBeaconAction(dispatch, payload);
  }, []);

  const fetchAiSuggestions = useCallback(
    async (sessionId: string, request: AiSuggestionRequest) => {
      await fetchAiSuggestionsAction(dispatch, sessionId, request);
    },
    []
  );

  const handleRealtimeMessage = useCallback(
    (payload: ChatMessageRealtimePayload) => {
      if (!payload?.sessionId || !payload.message) {
        return;
      }
      receiveMessage(payload.sessionId, payload.message);
    },
    [receiveMessage]
  );

  const handleSessionUpdate = useCallback(
    (payload: ChatSessionRealtimePayload) => {
      if (!payload?.session) {
        return;
      }

      const normalized = normalizeSession(payload.session);
      dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions: [normalized] } });
    },
    [normalizeSession]
  );

  const handleMessageDeleted = useCallback(
    (payload: ChatMessageDeletedPayload) => {
      if (!payload?.sessionId || !payload.messageId) {
        return;
      }

      updateMessage(payload.sessionId, payload.messageId, {
        metadata: { isDeleted: true, deletedAt: payload.deletedAtUtc },
        content: '消息已撤回',
        type: 'system',
      });
    },
    [updateMessage]
  );

  const handleSessionRead = useCallback(
    (payload: ChatSessionReadPayload) => {
      if (!payload?.sessionId || !payload.userId) {
        return;
      }

      const existing = sessionsRef.current[payload.sessionId];
      if (!existing) {
        return;
      }

      const unreadCounts = { ...(existing.unreadCounts ?? {}) };
      unreadCounts[payload.userId] = 0;

      const normalized = normalizeSession({ ...existing, unreadCounts });
      dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions: [normalized] } });
    },
    [normalizeSession]
  );

  const clearError = useCallback(() => {
    clearChatErrorAction(dispatch);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const stopExistingConnection = async () => {
      const existing = connectionRef.current;
      if (existing) {
        connectionRef.current = null;
        try {
          await existing.stop();
        } catch (error) {
          console.warn('停止聊天实时连接失败:', error);
        }
      }
    };

    const startConnection = async () => {
      if (!isAuthenticated) {
        await stopExistingConnection();
        setConnectionState(HubConnectionState.Disconnected);
        return;
      }

      const existing = connectionRef.current;
      if (
        existing &&
        (existing.state === HubConnectionState.Connected ||
          existing.state === HubConnectionState.Connecting ||
          existing.state === HubConnectionState.Reconnecting)
      ) {
        return;
      }

      if (existing) {
        await stopExistingConnection();
      }

      const connection = new HubConnectionBuilder()
        .withUrl(`${getApiBaseUrl()}/hubs/chat`, {
          accessTokenFactory: async () => (await apiService.getToken()) ?? '',
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .configureLogging(__DEV__ ? LogLevel.Information : LogLevel.Warning)
        .build();

      connection.on('ReceiveMessage', handleRealtimeMessage);
      connection.on('SessionUpdated', handleSessionUpdate);
      connection.on('MessageDeleted', handleMessageDeleted);
      connection.on('SessionRead', handleSessionRead);

      connection.onreconnecting(() => {
        setConnectionState(HubConnectionState.Reconnecting);
      });

      connection.onreconnected(async () => {
        setConnectionState(connection.state);
        const sessionId = activeSessionRef.current;
        if (sessionId) {
          try {
            await connection.invoke('JoinSessionAsync', sessionId);
          } catch (error) {
            console.warn('重新加入会话失败:', error);
          }
        }
      });

      connection.onclose(error => {
        setConnectionState(HubConnectionState.Disconnected);
        if (error) {
          console.warn('聊天实时连接已关闭:', error);
        }
      });

      connectionRef.current = connection;
      setConnectionState(connection.state);

      try {
        await connection.start();
        if (cancelled) {
          await connection.stop().catch(() => undefined);
          return;
        }
        setConnectionState(connection.state);

        const activeSessionId = activeSessionRef.current;
        if (activeSessionId) {
          await connection.invoke('JoinSessionAsync', activeSessionId).catch(error => {
            console.warn('加入会话失败:', error);
          });
        }
      } catch (error) {
        console.error('建立聊天实时连接失败:', error);
        setConnectionState(HubConnectionState.Disconnected);
      }
    };

    void startConnection();

    return () => {
      cancelled = true;
    };
  }, [handleMessageDeleted, handleRealtimeMessage, handleSessionRead, handleSessionUpdate, isAuthenticated]);

  useEffect(() => () => {
    const existing = connectionRef.current;
    if (existing) {
      connectionRef.current = null;
      existing.stop().catch(() => undefined);
    }
  }, []);

  const value = useMemo<ChatContextValue>(() => ({
    ...state,
    loadSessions,
    loadMessages,
    sendMessage,
    receiveMessage,
    setActiveSession,
    updateMessage,
    uploadAttachment,
    refreshNearbyUsers,
    updateLocationBeacon,
    fetchAiSuggestions,
    clearError,
    resetChat,
    connectionState,
  }), [
    state,
    loadSessions,
    loadMessages,
    sendMessage,
    receiveMessage,
    setActiveSession,
    updateMessage,
    uploadAttachment,
    refreshNearbyUsers,
    updateLocationBeacon,
    fetchAiSuggestions,
    clearError,
    resetChat,
    connectionState,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};


