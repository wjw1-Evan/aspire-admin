import type { Dispatch } from 'react';

import { AI_ASSISTANT_ID } from '@/constants/ai';
import { aiService } from '@/services/ai';
import { chatService, type MessageQueryParams, type SessionQueryParams } from '@/services/chat';
import { fetchNearbyUsers, getCurrentPosition, type LocationUpdatePayload, updateLocationBeacon } from '@/services/location';
import type { AiSuggestionRequest, AssistantReplyStreamChunk, AssistantReplyStreamRequest } from '@/types/ai';
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
const assistantStreamControllers = new Map<string, AbortController>();

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
    dispatch({
      type: 'CHAT_REPLACE_MESSAGE',
      payload: {
        sessionId: payload.sessionId,
        localId: options.localId,
        message: { ...message, status: 'sent' },
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

  if (message.clientMessageId || metadataClientMessageId) {
    dispatch({
      type: 'CHAT_REPLACE_MESSAGE',
      payload: {
        sessionId,
        localId: message.clientMessageId ?? metadataClientMessageId,
        message: { ...message, status: 'sent' },
      },
    });
    return;
  }

  dispatch({
    type: 'CHAT_APPEND_MESSAGE',
    payload: { sessionId, message: { ...message, status: 'sent' } },
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

export const streamAssistantReplyAction = async (
  dispatch: Dispatch<ChatAction>,
  request: AssistantReplyStreamRequest
): Promise<void> => {
  const previousController = assistantStreamControllers.get(request.sessionId);
  if (previousController) {
    previousController.abort();
  }

  const controller = new AbortController();
  assistantStreamControllers.set(request.sessionId, controller);

  const createdAt = new Date().toISOString();
  const baseMetadata: Record<string, unknown> = {
    isAssistant: true,
    streaming: true,
    clientMessageId: request.clientMessageId,
  };

  const placeholder: ChatMessage = {
    id: request.clientMessageId,
    sessionId: request.sessionId,
    senderId: AI_ASSISTANT_ID,
    type: 'text',
    content: '',
    createdAt,
    updatedAt: createdAt,
    status: 'sending',
    metadata: baseMetadata,
    localId: request.clientMessageId,
    isLocal: true,
  };

  dispatch({
    type: 'CHAT_APPEND_MESSAGE',
    payload: { sessionId: request.sessionId, message: placeholder },
  });

  let aggregated = '';
  let handledStreamError = false;

  try {
    await chatService.streamAssistantReply(
      request,
      {
        onDelta: text => {
          aggregated += text;
          dispatch({
            type: 'CHAT_UPDATE_MESSAGE',
            payload: {
              sessionId: request.sessionId,
              messageId: request.clientMessageId,
              updates: {
                content: aggregated,
                updatedAt: new Date().toISOString(),
                metadata: {
                  ...baseMetadata,
                  streaming: true,
                  streamLength: aggregated.length,
                },
              },
            },
          });
        },
        onComplete: chunk => {
          const finalContent = chunk.message?.content ?? aggregated;
          dispatch({
            type: 'CHAT_UPDATE_MESSAGE',
            payload: {
              sessionId: request.sessionId,
              messageId: request.clientMessageId,
              updates: {
                content: finalContent,
                status: 'sent',
                isLocal: false,
                metadata: {
                  ...baseMetadata,
                  streaming: false,
                },
              },
            },
          });

          if (chunk.message) {
            receiveMessageAction(dispatch, request.sessionId, chunk.message);
          }
        },
        onError: message => {
          handledStreamError = true;
          dispatch({
            type: 'CHAT_UPDATE_MESSAGE',
            payload: {
              sessionId: request.sessionId,
              messageId: request.clientMessageId,
              updates: {
                status: 'failed',
                metadata: {
                  ...baseMetadata,
                  streaming: false,
                  streamError: message,
                },
              },
            },
          });
          dispatch({ type: 'CHAT_SET_ERROR', payload: message });
        },
      },
      { signal: controller.signal }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      dispatch({
        type: 'CHAT_UPDATE_MESSAGE',
        payload: {
          sessionId: request.sessionId,
          messageId: request.clientMessageId,
          updates: {
            status: 'failed',
            metadata: {
              ...baseMetadata,
              streaming: false,
              streamError: '助手回复已取消',
            },
          },
        },
      });
    } else if (!handledStreamError) {
      const message = toErrorMessage(error, '助手回复失败');
      dispatch({
        type: 'CHAT_UPDATE_MESSAGE',
        payload: {
          sessionId: request.sessionId,
          messageId: request.clientMessageId,
          updates: {
            status: 'failed',
            metadata: {
              ...baseMetadata,
              streaming: false,
              streamError: message,
            },
          },
        },
      });
      dispatch({ type: 'CHAT_SET_ERROR', payload: message });
    }
  } finally {
    const activeController = assistantStreamControllers.get(request.sessionId);
    if (activeController === controller) {
      assistantStreamControllers.delete(request.sessionId);
    }
  }
};

export const clearChatErrorAction = (dispatch: Dispatch<ChatAction>): void => {
  dispatch({ type: 'CHAT_CLEAR_ERROR' });
};

export const resetChatAction = (dispatch: Dispatch<ChatAction>): void => {
  dispatch({ type: 'CHAT_RESET' });
};


