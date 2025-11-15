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

import type { AiSuggestionRequest, AssistantReplyStreamRequest } from '@/types/ai';
import type {
  AttachmentMetadata,
  ChatMessage,
  ChatMessageDeletedPayload,
  ChatMessageRealtimePayload,
  ChatSession,
  ChatSessionReadPayload,
  ChatSessionRealtimePayload,
  MessageSendRequest,
  NearbyUser,
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
  streamAssistantReplyAction,
} from './chatActions';
import { chatService } from '@/services/chat';
import { apiService } from '@/services/api';
import { getApiGatewayUrlDynamic } from '@/constants/apiConfig';
import { chatReducer, initialChatState, type ChatState } from './chatReducer';
import { useAuth } from './AuthContext';

interface ChatContextValue extends ChatState {
  loadSessions: (params?: SessionQueryParams) => Promise<void>;
  loadMessages: (sessionId: string, params?: MessageQueryParams) => Promise<void>;
  sendMessage: (payload: MessageSendRequest, options?: SendMessageOptions) => Promise<ChatMessage | undefined>;
  receiveMessage: (sessionId: string, message: ChatMessage) => void;
  setActiveSession: (sessionId: string | undefined) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  uploadAttachment: (sessionId: string, file: { uri: string; name: string; type: string }) => Promise<AttachmentMetadata>;
  refreshNearbyUsers: (request?: NearbySearchRequest) => Promise<NearbyUser[] | undefined>;
  updateLocationBeacon: (payload: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
  fetchAiSuggestions: (sessionId: string, request: AiSuggestionRequest) => Promise<void>;
  streamAssistantReply: (request: AssistantReplyStreamRequest) => Promise<void>;
  markSessionRead: (sessionId: string, lastReadMessageId: string) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
  connectionState: HubConnectionState;
  upsertSession: (session: ServerChatSession | ChatSession) => void;
}

interface SendMessageOptions {
  localId?: string;
  reuseLocal?: boolean;
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
  const connectionStartPromiseRef = useRef<Promise<void> | null>(null);
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
    async (payload: MessageSendRequest, options: SendMessageOptions = {}) => {
      if (!currentUserId) {
        throw new Error('未找到当前用户信息，无法发送消息');
      }

      const connection = connectionRef.current;
      const assistantStreaming =
        (payload.metadata as { assistantStreaming?: unknown } | undefined)?.assistantStreaming;
      const preferHttp = assistantStreaming === true;

      const localId = options.localId ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();

      if (!options.reuseLocal) {
        const optimisticMessage: ChatMessage = {
          id: localId,
          localId,
          sessionId: payload.sessionId,
          senderId: currentUserId,
          recipientId: payload.recipientId,
          type: payload.type,
          content: payload.content,
          createdAt,
          updatedAt: createdAt,
          metadata: { ...payload.metadata, clientMessageId: localId },
          status: 'sending',
          isLocal: true,
        };

        dispatch({
          type: 'CHAT_APPEND_MESSAGE',
          payload: { sessionId: payload.sessionId, message: optimisticMessage },
        });
      } else if (options.localId) {
        dispatch({
          type: 'CHAT_UPDATE_MESSAGE',
          payload: {
            sessionId: payload.sessionId,
            messageId: options.localId,
            updates: { status: 'sending', isLocal: true },
          },
        });
      }

      const sendPayload: MessageSendRequest = {
        ...payload,
        clientMessageId: localId,
        metadata: { ...payload.metadata, clientMessageId: localId },
      };

      if (connection?.state === HubConnectionState.Connected && !preferHttp) {
        try {
          await connection.invoke('SendMessageAsync', sendPayload);
          dispatch({
            type: 'CHAT_UPDATE_MESSAGE',
            payload: {
              sessionId: payload.sessionId,
              messageId: localId,
              updates: { status: 'sent', isLocal: false },
            },
          });
          return undefined;
        } catch (error) {
          console.warn('通过 SignalR 发送消息失败，回退到 REST 调用:', error);
        }
      }

      return sendMessageAction(dispatch, sendPayload, { localId });
    },
    [currentUserId, dispatch]
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

  const refreshNearbyUsers = useCallback(
    (request?: NearbySearchRequest) => updateNearbyUsersAction(dispatch, request),
    []
  );

  const updateLocationBeacon = useCallback(async (payload: { latitude: number; longitude: number; accuracy?: number }) => {
    await updateLocationBeaconAction(dispatch, payload);
  }, []);

  const fetchAiSuggestions = useCallback(
    async (sessionId: string, request: AiSuggestionRequest) => {
      await fetchAiSuggestionsAction(dispatch, sessionId, request);
    },
    [dispatch]
  );

  const streamAssistantReply = useCallback(
    async (request: AssistantReplyStreamRequest) => {
      await streamAssistantReplyAction(dispatch, request);
    },
    [dispatch]
  );

  const upsertSession = useCallback(
    (session: ServerChatSession | ChatSession) => {
      const normalized = normalizeSession(session);
      dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions: [normalized] } });
    },
    [normalizeSession]
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

  const markSessionRead = useCallback(
    async (sessionId: string, lastReadMessageId: string): Promise<void> => {
      if (!currentUserId) {
        return;
      }

      try {
        // 调用 API 标记已读
        await chatService.markSessionRead(sessionId, lastReadMessageId);

        // 立即更新本地状态，清除未读徽章
        const existing = sessionsRef.current[sessionId];
        if (existing) {
          const unreadCounts = { ...(existing.unreadCounts ?? {}) };
          unreadCounts[currentUserId] = 0;

          const normalized = normalizeSession({ ...existing, unreadCounts });
          dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions: [normalized] } });
        }
      } catch (error) {
        console.error('标记会话已读失败:', error);
        // 即使 API 调用失败，也尝试更新本地状态（乐观更新）
        const existing = sessionsRef.current[sessionId];
        if (existing) {
          const unreadCounts = { ...(existing.unreadCounts ?? {}) };
          unreadCounts[currentUserId] = 0;

          const normalized = normalizeSession({ ...existing, unreadCounts });
          dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions: [normalized] } });
        }
      }
    },
    [currentUserId, normalizeSession]
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
        const startPromise = connectionStartPromiseRef.current;
        if (startPromise) {
          try {
            await startPromise;
          } catch {
            // ignore
          }
          if (connectionRef.current && connectionRef.current !== existing) {
            // 已被新连接替换，交由新连接处理
            return;
          }
        }
        connectionStartPromiseRef.current = null;
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
        .withUrl(`${getApiGatewayUrlDynamic()}/apiservice/hubs/chat`, {
          accessTokenFactory: async () => {
            const { tokenManager } = await import('@/services/tokenManager');
            return (await tokenManager.getToken()) ?? '';
          },
          transport: HttpTransportType.WebSockets,
          skipNegotiation: true,
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
        const startPromise = connection.start();
        connectionStartPromiseRef.current = startPromise;
        await startPromise;
        if (connectionRef.current !== connection) {
          return;
        }
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
      } finally {
        if (connectionRef.current === connection) {
          connectionStartPromiseRef.current = null;
        }
      }
    };

    void startConnection();

    return () => {
      cancelled = true;
      void stopExistingConnection();
    };
  }, [handleMessageDeleted, handleRealtimeMessage, handleSessionRead, handleSessionUpdate, isAuthenticated]);

  useEffect(() => () => {
    const existing = connectionRef.current;
    if (existing) {
      connectionRef.current = null;
      const startPromise = connectionStartPromiseRef.current;
      connectionStartPromiseRef.current = null;
      if (startPromise) {
        startPromise
          .catch(() => undefined)
          .finally(() => existing.stop().catch(() => undefined));
      } else {
        existing.stop().catch(() => undefined);
      }
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
    streamAssistantReply,
    markSessionRead,
    clearError,
    resetChat,
    connectionState,
    upsertSession,
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
    streamAssistantReply,
    markSessionRead,
    clearError,
    resetChat,
    connectionState,
    upsertSession,
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


