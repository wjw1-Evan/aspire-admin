import type { Dispatch } from 'react';

import { AI_ASSISTANT_ID } from '@/constants/ai';
import { aiService } from '@/services/ai';
import { chatService, type MessageQueryParams, type SessionQueryParams } from '@/services/chat';
import { fetchNearbyUsers, getCurrentPosition, type LocationUpdatePayload, updateLocationBeacon } from '@/services/location';
import type { AiSuggestionRequest } from '@/types/ai';
import type {
  ChatMessage,
  ChatSession,
  MessageSendRequest,
  NearbySearchRequest,
  NearbyUser,
  ServerChatSession,
} from '@/types/chat';

import type { ChatAction } from './chatReducer';

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
};

const aiRequestControllers = new Map<string, AbortController>();

export const loadSessionsAction = async (
  dispatch: Dispatch<ChatAction>,
  params: SessionQueryParams = {},
  options?: {
    transform?: (sessions: ServerChatSession[]) => ChatSession[];
  }
): Promise<void> => {
  dispatch({ type: 'CHAT_SESSIONS_LOADING' });
  try {
    const response = await chatService.getSessions(params);
    const sessions = options?.transform
      ? options.transform(response.items)
      : (response.items as unknown as ChatSession[]);
    dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions } });
  } catch (error) {
    dispatch({ type: 'CHAT_SESSIONS_FAILURE', payload: toErrorMessage(error, '加载会话列表失败') });
  }
};

export const loadMessagesAction = async (
  dispatch: Dispatch<ChatAction>,
  sessionId: string,
  params: MessageQueryParams = {}
): Promise<void> => {
  dispatch({ type: 'CHAT_MESSAGES_LOADING', payload: { sessionId } });
  try {
    const response = await chatService.getMessages(sessionId, params);
    dispatch({
      type: 'CHAT_MESSAGES_SUCCESS',
      payload: {
        sessionId,
        messages: response.items,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
        replace: params.cursor === undefined,
      },
    });
  } catch (error) {
    dispatch({
      type: 'CHAT_MESSAGES_FAILURE',
      payload: {
        sessionId,
        error: toErrorMessage(error, '加载消息失败'),
      },
    });
  }
};

export const sendMessageAction = async (
  dispatch: Dispatch<ChatAction>,
  payload: MessageSendRequest,
  options: { localId?: string } = {}
): Promise<ChatMessage | undefined> => {
  try {
    const message = await chatService.sendMessage(payload);
    // 注意：不要硬编码 status 为 'sent'，让 normalizeMessage 从 metadata.isRead 读取
    // 这样可以正确处理后端返回的已读状态（虽然发送消息通常不会立即已读）
    dispatch({
      type: 'CHAT_REPLACE_MESSAGE',
      payload: {
        sessionId: payload.sessionId,
        localId: options.localId,
        message, // 不设置 status，让 normalizeMessage 处理
      },
    });
    return message;
  } catch (error) {
    if (options.localId) {
      dispatch({
        type: 'CHAT_UPDATE_MESSAGE',
        payload: {
          sessionId: payload.sessionId,
          messageId: options.localId,
          updates: { status: 'failed' },
        },
      });
    }
    dispatch({ type: 'CHAT_SET_ERROR', payload: toErrorMessage(error, '发送消息失败') });
    return undefined;
  }
};

export const receiveMessageAction = (
  dispatch: Dispatch<ChatAction>,
  sessionId: string,
  message: ChatMessage
): void => {
  const metadataClientMessageId = (() => {
    const raw = message.metadata?.['clientMessageId'];
    return typeof raw === 'string' ? raw : undefined;
  })();

  // 注意：不要硬编码 status 为 'sent'，让 normalizeMessage 从 metadata.isRead 读取
  // 这样可以正确处理后端返回的已读状态
  if (message.clientMessageId || metadataClientMessageId) {
    dispatch({
      type: 'CHAT_REPLACE_MESSAGE',
      payload: {
        sessionId,
        localId: message.clientMessageId ?? metadataClientMessageId,
        message, // 不设置 status，让 normalizeMessage 处理
      },
    });
    return;
  }

  dispatch({
    type: 'CHAT_APPEND_MESSAGE',
    payload: { sessionId, message }, // 不设置 status，让 normalizeMessage 处理
  });
};

export const updateMessageAction = (
  dispatch: Dispatch<ChatAction>,
  sessionId: string,
  messageId: string,
  updates: Partial<ChatMessage>
): void => {
  dispatch({ type: 'CHAT_UPDATE_MESSAGE', payload: { sessionId, messageId, updates } });
};

export const setActiveSessionAction = (
  dispatch: Dispatch<ChatAction>,
  sessionId: string | undefined
): void => {
  dispatch({ type: 'CHAT_SET_ACTIVE_SESSION', payload: sessionId });
};

export const updateNearbyUsersAction = async (
  dispatch: Dispatch<ChatAction>,
  request?: NearbySearchRequest
): Promise<NearbyUser[] | undefined> => {
  dispatch({ type: 'CHAT_SET_NEARBY_LOADING', payload: true });
  try {
    const searchRequest = request ?? {
      center: await getCurrentPosition(),
    };
    const response = await fetchNearbyUsers(searchRequest);
    const items = Array.isArray(response.items) ? response.items : [];
    dispatch({ type: 'CHAT_SET_NEARBY_USERS', payload: items });
    return items;
  } catch (error) {
    dispatch({ type: 'CHAT_SET_NEARBY_LOADING', payload: false });
    dispatch({ type: 'CHAT_SET_ERROR', payload: toErrorMessage(error, '获取附近的人失败') });
    return undefined;
  }
};

export const updateLocationBeaconAction = async (
  _: Dispatch<ChatAction>,
  payload: LocationUpdatePayload
): Promise<void> => {
  await updateLocationBeacon(payload);
};

export const fetchAiSuggestionsAction = async (
  dispatch: Dispatch<ChatAction>,
  sessionId: string,
  request: AiSuggestionRequest
): Promise<void> => {
  const previousController = aiRequestControllers.get(sessionId);
  if (previousController) {
    previousController.abort();
  }

  const controller = new AbortController();
  aiRequestControllers.set(sessionId, controller);

  dispatch({ type: 'CHAT_SET_AI_LOADING', payload: { sessionId, loading: true } });
  dispatch({ type: 'CHAT_SET_AI_NOTICE', payload: { sessionId, notice: undefined } });

  try {
    const result = await aiService.getSmartReplies(request, { signal: controller.signal });
    if (controller.signal.aborted) {
      return;
    }

    dispatch({
      type: 'CHAT_SET_AI_SUGGESTIONS',
      payload: { sessionId, suggestions: result.suggestions ?? [] },
    });

    dispatch({
      type: 'CHAT_SET_AI_NOTICE',
      payload: { sessionId, notice: result.notice },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    const message = toErrorMessage(error, '获取智能回复失败');
    dispatch({ type: 'CHAT_SET_ERROR', payload: message });
    dispatch({
      type: 'CHAT_SET_AI_NOTICE',
      payload: { sessionId, notice: message },
    });
  } finally {
    const activeController = aiRequestControllers.get(sessionId);
    if (activeController === controller) {
      aiRequestControllers.delete(sessionId);
      dispatch({ type: 'CHAT_SET_AI_LOADING', payload: { sessionId, loading: false } });
    }
  }
};


export const clearChatErrorAction = (dispatch: Dispatch<ChatAction>): void => {
  dispatch({ type: 'CHAT_CLEAR_ERROR' });
};

export const resetChatAction = (dispatch: Dispatch<ChatAction>): void => {
  dispatch({ type: 'CHAT_RESET' });
};


