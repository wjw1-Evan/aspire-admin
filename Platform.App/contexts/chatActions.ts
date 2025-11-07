import type { Dispatch } from 'react';

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
  payload: MessageSendRequest
): Promise<ChatMessage | undefined> => {
  try {
    const message = await chatService.sendMessage(payload);
    dispatch({ type: 'CHAT_APPEND_MESSAGE', payload: { sessionId: payload.sessionId, message } });
    return message;
  } catch (error) {
    dispatch({ type: 'CHAT_SET_ERROR', payload: toErrorMessage(error, '发送消息失败') });
    return undefined;
  }
};

export const receiveMessageAction = (
  dispatch: Dispatch<ChatAction>,
  sessionId: string,
  message: ChatMessage
): void => {
  dispatch({ type: 'CHAT_APPEND_MESSAGE', payload: { sessionId, message } });
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
    dispatch({ type: 'CHAT_SET_NEARBY_USERS', payload: response.items });
    return response.items;
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
  dispatch({ type: 'CHAT_SET_AI_LOADING', payload: { sessionId, loading: true } });
  try {
    const response = await aiService.getSmartReplies(request);
    dispatch({
      type: 'CHAT_SET_AI_SUGGESTIONS',
      payload: { sessionId, suggestions: response.suggestions },
    });
  } catch (error) {
    dispatch({ type: 'CHAT_SET_AI_LOADING', payload: { sessionId, loading: false } });
    dispatch({ type: 'CHAT_SET_ERROR', payload: toErrorMessage(error, '获取智能回复失败') });
  }
};

export const clearChatErrorAction = (dispatch: Dispatch<ChatAction>): void => {
  dispatch({ type: 'CHAT_CLEAR_ERROR' });
};

export const resetChatAction = (dispatch: Dispatch<ChatAction>): void => {
  dispatch({ type: 'CHAT_RESET' });
};


