import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { HubConnectionState } from '@microsoft/signalr';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ConversationHeader from '@/components/chat/ConversationHeader';
import MessageList from '@/components/chat/MessageList';
import MessageComposer from '@/components/chat/MessageComposer';
import AiSuggestionBar from '@/components/chat/AiSuggestionBar';
import AttachmentPicker from '@/components/chat/AttachmentPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useAiAssistant } from '@/hooks/useAiAssistant';

const POLL_INTERVAL_MS = 5000;

export default function ChatSessionScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;
  const { user } = useAuth();
  const {
    sessions,
    messages,
    messageState,
    loadMessages,
    sendMessage,
    uploadAttachment,
    setActiveSession,
    connectionState,
  } = useChat();

  const session = sessionId ? sessions[sessionId] : undefined;

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    loadMessages(sessionId).catch(error => console.error('Failed to load messages:', error));
  }, [loadMessages, sessionId]);

  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId);
      return () => setActiveSession(undefined);
    }
    return undefined;
  }, [sessionId, setActiveSession]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (connectionState === HubConnectionState.Connected) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadMessages(sessionId).catch(error => console.error('Polling messages failed:', error));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [connectionState, loadMessages, sessionId]);

  const currentUserId = useMemo(() => user?.id ?? user?.username ?? '', [user?.id, user?.username]);

  const { suggestions, loading: suggestionLoading, requestSuggestions } = useAiAssistant(sessionId ?? '');

  const handleSendText = useCallback(async (content: string) => {
    if (!sessionId) {
      return;
    }

    await sendMessage({
      sessionId,
      type: 'text',
      content,
      metadata: {},
    });

      requestSuggestions([content]).catch(error => console.error('AI suggestion error:', error));
  }, [requestSuggestions, sendMessage, sessionId]);

  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);

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
  const sessionMessages = sessionId ? messages[sessionId] ?? [] : [];

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

  if (!sessionId || !session) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>找不到会话</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ConversationHeader
        session={session}
        connectionState={connectionState}
        onBack={() => router.back()}
        title={session.topicTags?.[0]}
      />
      <View style={styles.content}>
        <AiSuggestionBar
          suggestions={suggestions}
          loading={suggestionLoading}
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
  },
  loader: {
    marginTop: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

