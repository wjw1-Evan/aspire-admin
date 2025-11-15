import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { HubConnectionState } from '@microsoft/signalr';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { ConversationHeader } from '@/components/chat/ConversationHeader';
import MessageList, { type MessageListHandle } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import AttachmentPicker from '@/components/chat/AttachmentPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatMessage } from '@/types/chat';
import { AI_ASSISTANT_ID } from '@/constants/ai';

// 轮询间隔：SignalR 未连接时使用（增加到 15 秒，减少服务器压力）
const POLL_INTERVAL_MS = 15000;
export default function ChatSessionScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;
  const { user } = useAuth();
  const {
    sessions,
    sessionsLoading,
    messages,
    messageState,
    loadMessages,
    loadSessions,
    sendMessage,
    streamAssistantReply,
    uploadAttachment,
    setActiveSession,
    connectionState,
  } = useChat();

  const session = sessionId ? sessions[sessionId] : undefined;
  const { theme } = useTheme();
  const screenBackground = theme.colors.background;
  const conversationSurface = theme.colors.listBackground;
  const messageListRef = useRef<MessageListHandle>(null);
  const initialScrollRequestedRef = useRef(false);
  const previousMessageCountRef = useRef<number>(0);
  const previousLastMessageIdRef = useRef<string | undefined>(undefined);

  // 消息加载时间戳，避免重复加载
  const lastLoadTimeRef = useRef<number>(0);
  const LOAD_COOLDOWN_MS = 2000; // 2秒内不重复加载

  useEffect(() => {
    if (!sessionId || !session) {
      return;
    }
    
    const now = Date.now();
    // 避免频繁加载：如果距离上次加载不足 2 秒，跳过
    if (now - lastLoadTimeRef.current < LOAD_COOLDOWN_MS) {
      return;
    }
    
    lastLoadTimeRef.current = now;
    loadMessages(sessionId).catch(error => {
      if (__DEV__) {
        console.error('Failed to load messages:', error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMessages, sessionId]); // 移除 session 依赖，避免 session 对象引用变化导致重复执行

  // 注意：标记已读现在由后端自动处理（在获取消息时自动标记）
  // 不再需要前端手动调用 markSessionRead

  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId);
      return () => setActiveSession(undefined);
    }
    return undefined;
  }, [sessionId, setActiveSession]);

  useEffect(() => {
    initialScrollRequestedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    previousMessageCountRef.current = 0;
    previousLastMessageIdRef.current = undefined;
  }, [sessionId]);

  // 轮询消息（仅在 SignalR 未连接时，且页面可见时）
  useEffect(() => {
    if (!sessionId || !session) {
      return;
    }

    // SignalR 已连接，不需要轮询
    if (connectionState === HubConnectionState.Connected) {
      return undefined;
    }

    // 使用更长的轮询间隔，减少服务器压力
    const intervalId = setInterval(() => {
      // 只在 SignalR 未连接时轮询
      if (connectionState !== HubConnectionState.Connected) {
        loadMessages(sessionId).catch(error => {
          if (__DEV__) {
            console.error('Polling messages failed:', error);
          }
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, loadMessages, sessionId]);

  const currentUserId = useMemo(() => user?.id ?? user?.username ?? undefined, [user?.id, user?.username]);

  const remoteParticipants = useMemo(() => {
    if (!session) {
      return [];
    }
    return session.participants
      .filter(participant => participant !== currentUserId)
      .map(participant => session.participantNames?.[participant] ?? participant)
      .filter((name, index, array): name is string => Boolean(name) && array.indexOf(name) === index);
  }, [currentUserId, session]);

  const headerTitle = useMemo(() => {
    if (remoteParticipants.length === 0) {
      return session?.topicTags?.[0] ?? session?.id?.slice(0, 6) ?? '';
    }
    if (remoteParticipants.length === 1) {
      return remoteParticipants[0];
    }
    if (remoteParticipants.length <= 3) {
      return remoteParticipants.join('、');
    }
    return `${remoteParticipants.slice(0, 3).join('、')} 等${remoteParticipants.length}人`;
  }, [remoteParticipants, session?.id, session?.topicTags]);

  const headerSubtitle = useMemo(() => {
    if (remoteParticipants.length === 0) {
      return undefined;
    }
    return `参与者：${remoteParticipants.join('、')}`;
  }, [remoteParticipants]);

  const sessionMessages = useMemo(
    () => (sessionId ? messages[sessionId] ?? [] : []),
    [messages, sessionId]
  );

  const topicTagsKey = useMemo(
    () => (session?.topicTags ?? []).join('|'),
    [session?.topicTags]
  );

  const timelineState = useMemo(
    () => (sessionId ? messageState[sessionId] : undefined),
    [messageState, sessionId]
  );

  useFocusEffect(
    useCallback(() => {
      initialScrollRequestedRef.current = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      if (!timelineState?.loading && sessionMessages.length > 0) {
        timer = setTimeout(() => {
          messageListRef.current?.scrollToBottom({ animated: false, attempts: 3 });
          initialScrollRequestedRef.current = true;
        }, 80);
      }

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }, [sessionMessages.length, timelineState?.loading])
  );

  useEffect(() => {
    if (initialScrollRequestedRef.current) {
      return;
    }

    if (!timelineState?.loading && sessionMessages.length > 0) {
      messageListRef.current?.scrollToBottom({ animated: false, attempts: 3 });
      initialScrollRequestedRef.current = true;
    }
  }, [sessionMessages.length, timelineState?.loading]);

  const handleSendText = useCallback(async (content: string) => {
    if (!sessionId || !session) {
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const hasAssistant = session.participants.includes(AI_ASSISTANT_ID);

    const payload = {
      sessionId,
      type: 'text',
      content: trimmedContent,
      metadata: hasAssistant ? { assistantStreaming: true } : undefined,
    } as const;

    const sendResult = await sendMessage(payload);

    if (hasAssistant && sendResult?.id) {
      const assistantClientMessageId = `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      void streamAssistantReply({
        sessionId,
        triggerMessageId: sendResult.id,
        triggerClientMessageId: sendResult.clientMessageId,
        clientMessageId: assistantClientMessageId,
      });
    }
  }, [sendMessage, session, sessionId, streamAssistantReply]);

  const handleResendMessage = useCallback(
    async (message: ChatMessage) => {
      if (!sessionId) {
        return;
      }

      const localId = message.localId ?? message.id;
      try {
        await sendMessage(
          {
            sessionId,
            type: message.type,
            content: message.content,
            attachmentId: message.attachment?.id,
            metadata: message.metadata ? { ...message.metadata } : undefined,
            recipientId: message.recipientId,
          },
          { localId, reuseLocal: true }
        );
      } catch (error) {
        console.error('消息重发失败:', error);
      }
    },
    [sendMessage, sessionId]
  );

  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [sessionRetrying, setSessionRetrying] = useState(false);
  const sessionRefreshAttemptedRef = useRef(false);

  const toggleAttachmentPicker = useCallback(() => {
    setShowAttachmentPicker(prev => !prev);
  }, []);

  const handleAttachmentSelected = useCallback(
    async (file: { uri: string; name: string; type: string; size: number }) => {
      if (!sessionId) {
        return;
      }

      try {
        const metadata = await uploadAttachment(sessionId, {
          uri: file.uri,
          name: file.name,
          type: file.type,
        });

        await sendMessage({
          sessionId,
          type: metadata.mimeType?.startsWith('image/') ? 'image' : 'file',
          attachmentId: metadata.id,
        });

        setShowAttachmentPicker(false);
      } catch (error) {
        Alert.alert('发送失败', error instanceof Error ? error.message : '附件发送失败');
      }
    },
    [sendMessage, sessionId, uploadAttachment]
  );

  useEffect(() => {
    sessionRefreshAttemptedRef.current = false;
  }, [sessionId]);

  // 会话刷新时间戳，避免频繁刷新
  const lastSessionRefreshTimeRef = useRef<number>(0);
  const SESSION_REFRESH_COOLDOWN_MS = 3000; // 3秒内不重复刷新

  useEffect(() => {
    if (!sessionId || session || sessionsLoading || sessionRetrying) {
      return;
    }

    if (sessionRefreshAttemptedRef.current) {
      return;
    }

    const now = Date.now();
    // 避免频繁刷新会话信息
    if (now - lastSessionRefreshTimeRef.current < SESSION_REFRESH_COOLDOWN_MS) {
      return;
    }

    lastSessionRefreshTimeRef.current = now;
    sessionRefreshAttemptedRef.current = true;
    setSessionRetrying(true);
    loadSessions()
      .catch(error => {
        if (__DEV__) {
          console.error('Failed to refresh session info:', error);
        }
      })
      .finally(() => setSessionRetrying(false));
  }, [loadSessions, session, sessionId, sessionRetrying, sessionsLoading]);

  if (!sessionId || !session) {
    if (sessionsLoading || sessionRetrying) {
      return (
        <ThemedView style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
          <ThemedText style={styles.centeredText}>正在加载会话信息…</ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.centered}>
        <ThemedText>找不到会话</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: screenBackground }]}>
      <ConversationHeader
        session={session}
        connectionState={connectionState}
        onBack={() => router.back()}
        title={headerTitle}
        subtitle={headerSubtitle}
      />
      <View style={[styles.content, { backgroundColor: conversationSurface }]}>
        {timelineState?.loading && sessionMessages.length === 0 ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.accent} />
        ) : (
          <MessageList
            ref={messageListRef}
            sessionId={sessionId}
            messages={sessionMessages}
            currentUserId={currentUserId}
            loading={timelineState?.loading ?? false}
            hasMore={timelineState?.hasMore ?? false}
            participantNames={session.participantNames}
            participants={session.participants}
            participantAvatars={session.participantAvatars}
            onLoadMore={() => {
              if (timelineState?.hasMore && !timelineState.loading && timelineState.nextCursor) {
                loadMessages(sessionId, { cursor: timelineState.nextCursor }).catch(error =>
                  console.error('加载更多消息失败:', error)
                );
              }
            }}
            onRefresh={() => {
              // 手动刷新时重置时间戳，允许立即刷新
              lastLoadTimeRef.current = 0;
              loadMessages(sessionId).catch(() => undefined);
            }}
            onResendMessage={handleResendMessage}
          />
        )}
      </View>
      {showAttachmentPicker && (
        <AttachmentPicker onAttachmentSelected={handleAttachmentSelected} />
      )}
      <MessageComposer
        onSend={handleSendText}
        onPickAttachment={toggleAttachmentPicker}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  loader: {
    marginTop: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    marginTop: 12,
  },
});

