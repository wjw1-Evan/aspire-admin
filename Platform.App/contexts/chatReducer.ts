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
  | {
      type: 'CHAT_MARK_MESSAGES_READ';
      payload: { sessionId: string; lastMessageId: string; userId: string };
    }
  | { type: 'CHAT_RESET' };

const mergeSessions = (state: ChatState, sessions: ChatSession[]): ChatState => {
  const nextSessions = { ...state.sessions };
  const nextOrder = new Set(state.sessionOrder);

  sessions.forEach(session => {
    nextSessions[session.id] = session;
    nextOrder.add(session.id);
  });

  // 优化：预计算时间戳，避免在排序时重复创建 Date 对象
  const sortedOrder = Array.from(nextOrder).sort((a, b) => {
    const sessionA = nextSessions[a];
    const sessionB = nextSessions[b];

    const timestampA = sessionA?.updatedAt ?? sessionA?.lastMessageAt ?? sessionA?.createdAt;
    const timestampB = sessionB?.updatedAt ?? sessionB?.lastMessageAt ?? sessionB?.createdAt;

    // 直接比较时间戳字符串（ISO 8601 格式可以直接字符串比较），避免创建 Date 对象
    if (!timestampA && !timestampB) return 0;
    if (!timestampA) return 1;
    if (!timestampB) return -1;
    
    // ISO 8601 格式的字符串可以直接比较，性能更好
    return timestampB.localeCompare(timestampA);
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

  // 从 metadata 中读取已读状态
  // 优先级：message.status > metadata.isRead > 'sent'
  // 如果 message.status 已经存在且不为 'sending' 或 'failed'，优先使用它
  // 否则，如果 metadata.isRead 为 true，设置为 'read'
  const isRead = message.metadata?.['isRead'] === true;
  let status: ChatMessageStatus = message.status ?? 'sent';
  
  // 如果 status 不存在或者是默认值，检查 metadata.isRead
  if ((!message.status || message.status === 'sent') && isRead) {
    status = 'read';
  }
  
  // 保持 'sending' 和 'failed' 状态不变（这些状态不应该被覆盖）
  if (message.status === 'sending' || message.status === 'failed') {
    status = message.status;
  }

  return {
    ...message,
    status,
    clientMessageId: message.clientMessageId ?? metadataClientMessageId,
  };
};

// 优化：预计算时间戳，避免在排序时重复创建 Date 对象
const getMessageTimestamp = (message: ChatMessage): number => {
  return message.createdAt ? new Date(message.createdAt).getTime() : 0;
};

const appendMessage = (existing: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const normalized = normalizeMessage(message);
  const targetLocalId = normalized.clientMessageId ?? normalized.localId;

  // 先检查是否已存在相同的消息（通过 id 或 clientMessageId）
  const hasExistingById = existing.some(item => item.id === normalized.id);
  if (hasExistingById) {
    return existing
      .map(item => {
        if (item.id === normalized.id) {
          // 合并消息时，优先保留已有的 'read' 状态（避免状态降级）
          // 如果新消息是 'read' 或已有消息是 'read'，保留 'read'
          const mergedStatus: ChatMessageStatus =
            item.status === 'read' || normalized.status === 'read'
              ? 'read'
              : normalized.status ?? item.status ?? 'sent';
          
          return {
            ...item,
            ...normalized,
            status: mergedStatus,
          };
        }
        return item;
      })
      .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
  }

  // 如果有 clientMessageId，尝试替换本地消息
  if (targetLocalId) {
    let replaced = false;
    const next = existing.map(item => {
      // 匹配条件：localId 或 id 等于 targetLocalId，或者 clientMessageId 匹配
      const itemClientMessageId = item.clientMessageId ?? item.metadata?.['clientMessageId'];
      if (
        item.localId === targetLocalId ||
        item.id === targetLocalId ||
        itemClientMessageId === targetLocalId
      ) {
        replaced = true;
        // 合并消息时，优先保留已有的 'read' 状态（避免状态降级）
        // 如果新消息是 'read' 或已有消息是 'read'，保留 'read'
        const mergedStatus: ChatMessageStatus =
          item.status === 'read' || normalized.status === 'read'
            ? 'read'
            : normalized.status ?? item.status ?? 'sent';
        
        return {
          ...item,
          ...normalized,
          id: normalized.id,
          localId: undefined,
          isLocal: false,
          status: mergedStatus,
        };
      }
      return item;
    });

    if (replaced) {
      // 使用预计算的时间戳进行比较，避免重复创建 Date 对象
      return next.sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
    }
  }

  // 如果都没有匹配，追加新消息
  return [...existing, normalized].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
};

const replaceMessage = (
  existing: ChatMessage[],
  localId: string | undefined,
  message: ChatMessage
): ChatMessage[] => {
  const normalized = normalizeMessage(message);
  const targetLocalId = localId ?? normalized.clientMessageId ?? normalized.localId;

  // 先检查是否已存在相同的消息（通过 id）
  const hasExistingById = existing.some(item => item.id === normalized.id);
  if (hasExistingById) {
    // 如果已存在，合并更新（优先保留 'read' 状态）
    return existing
      .map(item => {
        if (item.id === normalized.id) {
          // 合并消息时，优先保留已有的 'read' 状态（避免状态降级）
          // 如果新消息是 'read' 或已有消息是 'read'，保留 'read'
          const mergedStatus: ChatMessageStatus =
            item.status === 'read' || normalized.status === 'read'
              ? 'read'
              : normalized.status ?? item.status ?? 'sent';
          
          return {
            ...item,
            ...normalized,
            status: mergedStatus,
          };
        }
        return item;
      })
      .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
  }

  // 如果没有 targetLocalId，使用 appendMessage 逻辑
  if (!targetLocalId) {
    return appendMessage(existing, normalized);
  }

  // 尝试替换本地消息（通过 localId、id 或 clientMessageId 匹配）
  let replaced = false;
  const next = existing.map(item => {
    const itemClientMessageId = item.clientMessageId ?? item.metadata?.['clientMessageId'];
    if (
      item.id === targetLocalId ||
      item.localId === targetLocalId ||
      itemClientMessageId === targetLocalId
    ) {
      replaced = true;
      // 合并消息时，优先保留已有的 'read' 状态（避免状态降级）
      // 如果新消息是 'read' 或已有消息是 'read'，保留 'read'
      const mergedStatus: ChatMessageStatus =
        item.status === 'read' || normalized.status === 'read'
          ? 'read'
          : normalized.status ?? item.status ?? 'sent';
      
      return {
        ...item,
        ...normalized,
        id: normalized.id,
        localId: undefined,
        isLocal: false,
        status: mergedStatus,
      };
    }
    return item;
  });

  // 如果没有匹配到，追加新消息
  if (!replaced) {
    next.push({ ...normalized, status: normalized.status ?? 'sent' });
  }

  // 使用预计算的时间戳进行比较，避免重复创建 Date 对象
  return next.sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
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
        : (() => {
            // 使用 Map 优化去重，避免 O(n²) 复杂度
            // 使用 id 作为主键
            const messageMap = new Map<string, ChatMessage>();
            // 使用 clientMessageId 建立索引，用于匹配和移除本地消息
            const clientMessageIdToLocalId = new Map<string, string>();
            
            // 先添加现有消息（包括本地消息）
            for (const msg of currentMessages) {
              if (msg.id) {
                // 真实消息：使用 id 作为键
                messageMap.set(msg.id, msg);
              }
              
              // 建立 clientMessageId 到 localId 的映射（用于匹配本地消息）
              const clientMsgId = msg.clientMessageId ?? msg.metadata?.['clientMessageId'];
              if (clientMsgId && !msg.id && msg.localId) {
                // 只索引本地消息（没有真实 id，但有 localId）
                clientMessageIdToLocalId.set(clientMsgId, msg.localId);
              }
            }
            
            // 合并新消息（新消息优先）
            const localIdsToRemove = new Set<string>();
            for (const msg of messages) {
              const normalized = normalizeMessage(msg);
              
              // 检查是否有匹配的本地消息（通过 clientMessageId）
              const clientMsgId = normalized.clientMessageId ?? normalized.metadata?.['clientMessageId'];
              if (clientMsgId && normalized.id) {
                const localId = clientMessageIdToLocalId.get(clientMsgId);
                if (localId) {
                  // 标记要移除的本地消息（因为服务器消息会替换它）
                  localIdsToRemove.add(localId);
                }
              }
              
              // 添加或更新消息（通过 id）
              if (normalized.id) {
                const existingMsg = messageMap.get(normalized.id);
                if (existingMsg) {
                  // 合并消息时，优先保留已有的 'read' 状态（避免状态降级）
                  // 如果新消息是 'read' 或已有消息是 'read'，保留 'read'
                  const mergedStatus: ChatMessageStatus =
                    existingMsg.status === 'read' || normalized.status === 'read'
                      ? 'read'
                      : normalized.status ?? existingMsg.status ?? 'sent';
                  
                  messageMap.set(normalized.id, {
                    ...existingMsg,
                    ...normalized,
                    status: mergedStatus,
                  });
                } else {
                  messageMap.set(normalized.id, normalized);
                }
              }
            }
            
            // 移除被替换的本地消息（如果有的话）
            if (localIdsToRemove.size > 0) {
              for (const [id, msg] of messageMap.entries()) {
                if (msg.localId && localIdsToRemove.has(msg.localId)) {
                  messageMap.delete(id);
                }
              }
            }
            
            // 转换为数组并排序（使用预计算的时间戳，避免重复创建 Date 对象）
            return Array.from(messageMap.values()).sort(
              (a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
            );
          })();

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
          [sessionId]: existing.map(message => {
            if (message.id === messageId) {
              // 合并更新时，优先保留已有的 'read' 状态（避免状态降级）
              // 如果更新中包含 'read' 状态或已有消息是 'read'，保留 'read'
              const mergedStatus: ChatMessageStatus | undefined =
                updates.status === 'read' || message.status === 'read'
                  ? 'read'
                  : updates.status ?? message.status;
              
              return {
                ...message,
                ...updates,
                ...(mergedStatus ? { status: mergedStatus } : {}),
              };
            }
            return message;
          }),
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
    case 'CHAT_MARK_MESSAGES_READ': {
      const { sessionId, lastMessageId, userId } = action.payload;
      const existing = state.messages[sessionId] ?? [];
      
      // 找到 lastMessageId 对应的消息，获取其时间戳
      const lastMessage = existing.find(msg => msg.id === lastMessageId);
      if (!lastMessage) {
        // 如果消息不在当前列表中（例如，消息还没有加载），不更新状态
        // 当消息加载时，后端会在 metadata 中包含已读状态，前端会自动处理
        // 或者等待后续的 SessionRead 事件
        return state;
      }
      
      const lastMessageTimestamp = new Date(lastMessage.createdAt).getTime();
      
      // 验证时间戳是否有效
      if (isNaN(lastMessageTimestamp)) {
        // 如果时间戳无效，跳过状态更新
        return state;
      }
      
      // 更新所有时间戳小于等于 lastMessage 的消息状态为 'read'
      // 只更新指定用户发送的消息（isOutgoing）
      const updatedMessages = existing.map(message => {
        // 只更新指定用户发送的消息
        if (message.senderId !== userId) {
          return message;
        }
        
        // 跳过发送中或失败的消息
        if (message.status === 'sending' || message.status === 'failed') {
          return message;
        }
        
        // 如果状态已经是 'read'，跳过更新（避免不必要的状态变化）
        if (message.status === 'read') {
          return message;
        }
        
        // 如果消息ID等于 lastMessageId 或时间戳更早，则标记为已读
        const messageTimestamp = new Date(message.createdAt).getTime();
        if (isNaN(messageTimestamp)) {
          // 如果消息时间戳无效，跳过该消息
          return message;
        }
        
        if (message.id === lastMessageId || messageTimestamp <= lastMessageTimestamp) {
          return { ...message, status: 'read' as const };
        }
        
        return message;
      });
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [sessionId]: updatedMessages,
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


