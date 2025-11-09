import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { HubConnectionState } from '@microsoft/signalr';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { ConversationHeader } from '@/components/chat/ConversationHeader';
import MessageList, { type MessageListHandle } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import AiSuggestionBar from '@/components/chat/AiSuggestionBar';
import AttachmentPicker from '@/components/chat/AttachmentPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatMessage } from '@/types/chat';
import type { AiConversationMessage } from '@/types/ai';
import { AI_ASSISTANT_ID } from '@/constants/ai';

const POLL_INTERVAL_MS = 5000;
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

  useEffect(() => {
    if (!sessionId || !session) {
      return;
    }
    loadMessages(sessionId).catch(error => console.error('Failed to load messages:', error));
  }, [loadMessages, sessionId, session]);

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

  useEffect(() => {
    if (!sessionId || !session) {
      return;
    }

    if (connectionState === HubConnectionState.Connected) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadMessages(sessionId).catch(error => console.error('Polling messages failed:', error));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [connectionState, loadMessages, session, sessionId]);

  const currentUserId = useMemo(() => user?.id ?? user?.username ?? '', [user]);

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

  const {
    suggestions,
    loading: suggestionLoading,
    notice: suggestionNotice,
    requestSuggestions,
  } = useAiAssistant(sessionId ?? '');
  const [suggestionCollapsed, setSuggestionCollapsed] = useState(false);
  const [suggestionRefreshNonce, setSuggestionRefreshNonce] = useState(0);

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

  const handleRefreshSuggestions = useCallback(() => {
    if (!sessionId) {
      return;
    }

    const nextNonce = suggestionRefreshNonce + 1;
    setSuggestionRefreshNonce(nextNonce);

    const refreshInstruction = `系统提示（刷新 #${nextNonce} 于 ${dayjs().format('HH:mm:ss')}）：请基于完整对话重新生成与此前不同的两条智能推荐。`;

    const instructionMessage: AiConversationMessage = {
      role: 'system',
      content: refreshInstruction,
    };

    const supplementalLines: string[] = [];
    if (remoteParticipants.length > 0) {
      supplementalLines.push(`系统: 参与者：${remoteParticipants.join('、')}`);
    }
    if (session?.topicTags?.length) {
      supplementalLines.push(`系统: 主题标签：${session.topicTags.join('、')}`);
    }

    const payload = {
      lines: [...supplementalLines, `系统: ${refreshInstruction}`],
      messages: [instructionMessage],
    };

    const lastMessage = sessionMessages[sessionMessages.length - 1];
    requestSuggestions(payload, {
      lastMessageId: lastMessage?.id,
      force: true,
    }).catch(error => console.error('手动刷新智能推荐失败:', error));
  }, [
    remoteParticipants,
    requestSuggestions,
    sessionId,
    sessionMessages,
    suggestionRefreshNonce,
    topicTagsKey,
  ]);

  const canRefreshSuggestions = useMemo(() => {
    if (!sessionId) {
      return false;
    }
    if (sessionMessages.length > 0) {
      return true;
    }
    if (remoteParticipants.length > 0) {
      return true;
    }
    return (session?.topicTags?.length ?? 0) > 0;
  }, [remoteParticipants.length, sessionId, sessionMessages.length, topicTagsKey]);

  const handleToggleSuggestionCollapse = useCallback(() => {
    setSuggestionCollapsed(prev => !prev);
  }, []);

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

  const previousMessageCountRef = useRef<number>(0);
  const previousLastMessageIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (sessionMessages.length === 0 || sessionMessages.length === previousMessageCountRef.current) {
      return;
    }

    previousMessageCountRef.current = sessionMessages.length;
    const lastMessage = sessionMessages[sessionMessages.length - 1];
    const lastMessageId = lastMessage?.id;

    if (!lastMessageId || lastMessageId === previousLastMessageIdRef.current) {
      return;
    }

    previousLastMessageIdRef.current = lastMessageId;

    if (lastMessage?.senderId === currentUserId) {
      return;
    }

    requestSuggestions([], {
      lastMessageId,
      force: true,
    }).catch(error => console.error('加载智能建议失败:', error));
  }, [currentUserId, requestSuggestions, sessionId, sessionMessages]);

  useEffect(() => {
    sessionRefreshAttemptedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || session || sessionsLoading || sessionRetrying) {
      return;
    }

    if (sessionRefreshAttemptedRef.current) {
      return;
    }

    sessionRefreshAttemptedRef.current = true;
    setSessionRetrying(true);
    loadSessions()
      .catch(error => console.error('Failed to refresh session info:', error))
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
        <AiSuggestionBar
          suggestions={suggestions}
          loading={suggestionLoading}
          notice={suggestionNotice}
          onRefresh={canRefreshSuggestions ? handleRefreshSuggestions : undefined}
          collapsed={suggestionCollapsed}
          onToggleCollapse={handleToggleSuggestionCollapse}
          onSelect={suggestion => handleSendText(suggestion.content)}
        />
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
            onRefresh={() => loadMessages(sessionId).catch(() => undefined)}
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

