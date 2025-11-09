import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { HubConnectionState } from '@microsoft/signalr';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ConversationHeader } from '@/components/chat/ConversationHeader';
import MessageList from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import AiSuggestionBar from '@/components/chat/AiSuggestionBar';
import AttachmentPicker from '@/components/chat/AttachmentPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { useThemeColor } from '@/hooks/useThemeColor';

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
    uploadAttachment,
    setActiveSession,
    connectionState,
  } = useChat();

  const session = sessionId ? sessions[sessionId] : undefined;
  const screenBackground = useThemeColor({ light: '#e5e5e5', dark: '#0b1120' }, 'background');
  const conversationSurface = useThemeColor({ light: '#f8fafc', dark: '#0f172a' }, 'card');

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
    streamingText,
    requestSuggestions,
  } = useAiAssistant(sessionId ?? '');

  const handleSendText = useCallback(async (content: string) => {
    if (!sessionId || !session) {
      return;
    }

    await sendMessage({
      sessionId,
      type: 'text',
      content,
      metadata: {},
    });

    requestSuggestions([content]).catch(error => console.error('AI suggestion error:', error));
  }, [requestSuggestions, sendMessage, session, sessionId]);

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

  const timelineState = sessionId ? messageState[sessionId] : undefined;
  const sessionMessages = useMemo(
    () => (sessionId ? messages[sessionId] ?? [] : []),
    [messages, sessionId]
  );

  const previousMessageCountRef = useRef<number>(0);
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (sessionMessages.length === 0 || sessionMessages.length === previousMessageCountRef.current) {
      return;
    }

    previousMessageCountRef.current = sessionMessages.length;

    const recentTexts = sessionMessages
      .slice(-5)
      .map(message => message.content)
      .filter((content): content is string => typeof content === 'string' && content.length > 0);

    if (recentTexts.length > 0) {
      requestSuggestions(recentTexts, {
        lastMessageId: sessionMessages[sessionMessages.length - 1].id,
      }).catch(error => console.error('加载智能建议失败:', error));
    }
  }, [requestSuggestions, sessionId, sessionMessages]);

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
          <ActivityIndicator />
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
          streamingText={streamingText}
          onSelect={suggestion => handleSendText(suggestion.content)}
        />
        {timelineState?.loading && sessionMessages.length === 0 ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <MessageList
            sessionId={sessionId}
            messages={sessionMessages}
            currentUserId={currentUserId}
            loading={timelineState?.loading ?? false}
            hasMore={timelineState?.hasMore ?? false}
            participantNames={session.participantNames}
            participants={session.participants}
            onLoadMore={() => {
              if (timelineState?.hasMore && !timelineState.loading && timelineState.nextCursor) {
                loadMessages(sessionId, { cursor: timelineState.nextCursor }).catch(error =>
                  console.error('加载更多消息失败:', error)
                );
              }
            }}
            onRefresh={() => loadMessages(sessionId).catch(() => undefined)}
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

