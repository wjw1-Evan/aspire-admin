import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ChatMessage } from '@/types/chat';
import { useThemeColor } from '@/hooks/useThemeColor';

import AttachmentPreview from './AttachmentPreview';

interface MessageListProps {
  readonly messages: ChatMessage[];
  readonly sessionId: string;
  readonly currentUserId?: string;
  readonly loading: boolean;
  readonly onLoadMore?: () => void;
  readonly onRefresh?: () => void;
  readonly hasMore?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  sessionId,
  currentUserId,
  loading,
  onLoadMore,
  onRefresh,
  hasMore,
}) => {
  const outgoingBackground = useThemeColor({ light: '#DCF8C6', dark: '#1f4d88' }, 'tint');
  const incomingBackground = useThemeColor({ light: '#ffffff', dark: '#1f2937' }, 'card');
  const borderColor = useThemeColor({}, 'border');

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isOutgoing = item.senderId === currentUserId;

    return (
      <View style={[styles.messageRow, isOutgoing ? styles.outgoingRow : styles.incomingRow]}>
        <ThemedView
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOutgoing ? outgoingBackground : incomingBackground,
              borderColor,
              alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {item.content && (
            <ThemedText style={styles.messageText}>{item.content}</ThemedText>
          )}
          {item.attachment && (
            <AttachmentPreview
              attachment={item.attachment}
            />
          )}
          <ThemedText style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString()}
          </ThemedText>
        </ThemedView>
      </View>
    );
  }, [borderColor, currentUserId, incomingBackground, outgoingBackground]);

  const keyExtractor = useCallback((item: ChatMessage, index: number) => `${sessionId}-${item.id}-${index}`, [sessionId]);

  const memoizedMessages = useMemo(() => messages, [messages]);

  return (
    <FlatList
      data={memoizedMessages}
      keyExtractor={keyExtractor}
      renderItem={renderMessage}
      contentContainerStyle={styles.contentContainer}
      inverted
      onEndReachedThreshold={0.2}
      onEndReached={() => {
        if (!loading && hasMore) {
          onLoadMore?.();
        }
      }}
      ListFooterComponent={loading ? <ActivityIndicator style={styles.footerLoading} /> : null}
      refreshControl={
        onRefresh
          ? (
              <RefreshControl refreshing={loading} onRefresh={onRefresh} />
            )
          : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  outgoingRow: {
    justifyContent: 'flex-end',
  },
  incomingRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
    textAlign: 'right',
  },
  footerLoading: {
    paddingVertical: 16,
  },
});

export default MessageList;


