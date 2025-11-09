import dayjs from 'dayjs';
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
  readonly participantNames?: Record<string, string>;
  readonly participants?: string[];
}

const TIMESTAMP_INTERVAL = 5 * 60 * 1000;

const MessageList: React.FC<MessageListProps> = ({
  messages,
  sessionId,
  currentUserId,
  loading,
  onLoadMore,
  onRefresh,
  hasMore,
  participantNames,
  participants,
}) => {
  const outgoingBackground = useThemeColor({ light: '#95ec69', dark: '#1f4d88' }, 'tint');
  const incomingBackground = useThemeColor({ light: '#ffffff', dark: '#1f2937' }, 'card');
  const bubbleShadow = useThemeColor({ light: '#00000018', dark: '#00000055' }, 'shadow');
  const bubbleBorderColor = useThemeColor({ light: '#00000012', dark: '#ffffff22' }, 'border');
  const nameColor = useThemeColor({ light: '#667085', dark: '#94a3b8' }, 'tabIconDefault');
  const timestampBackground = useThemeColor({ light: '#d8d8d8cc', dark: '#1f2937cc' }, 'border');
  const timestampColor = useThemeColor({ light: '#ffffff', dark: '#f8fafc' }, 'text');
  const listBackground = useThemeColor({ light: '#f5f5f5', dark: '#0b1120' }, 'background');
  const avatarBackground = useThemeColor({ light: '#d9d9d9', dark: '#1f2937' }, 'card');
  const avatarBorderColor = useThemeColor({ light: '#cbd5f5', dark: '#1e2535' }, 'border');
  const isGroupChat = (participants?.length ?? 0) > 2;

  const memoizedMessages = useMemo(() => messages, [messages]);

  const renderAvatar = useCallback(
    (senderId: string, isSelf: boolean) => {
      const displayName = isSelf
        ? '我'
        : participantNames?.[senderId] ?? senderId;
      const initial = displayName?.trim().charAt(0) ?? '?';

      return (
        <View style={[styles.avatar, { backgroundColor: avatarBackground, borderColor: avatarBorderColor }]}>
          <ThemedText style={styles.avatarInitial}>{initial}</ThemedText>
        </View>
      );
    },
    [avatarBackground, avatarBorderColor, participantNames]
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isOutgoing = item.senderId === currentUserId;
      const previous = index > 0 ? memoizedMessages[index - 1] : undefined;
      const shouldShowTimestamp =
        index === 0 ||
        (previous &&
          Math.abs(dayjs(item.createdAt).valueOf() - dayjs(previous.createdAt).valueOf()) > TIMESTAMP_INTERVAL);

      const senderName = participantNames?.[item.senderId] ?? item.senderId;
      const formattedTimestamp = dayjs(item.createdAt).format('YYYY-MM-DD HH:mm');

      return (
        <>
        {shouldShowTimestamp ? (
          <View style={[styles.timestampContainer, styles.invertedElement]}>
              <View style={[styles.timestampBadge, { backgroundColor: timestampBackground }]}>
                <ThemedText style={[styles.timestampLabel, { color: timestampColor }]}>
                  {formattedTimestamp}
                </ThemedText>
              </View>
            </View>
          ) : null}
        <View
          style={[
            styles.messageRow,
            isOutgoing ? styles.outgoingRow : styles.incomingRow,
            styles.invertedElement,
          ]}
        >
            {!isOutgoing && renderAvatar(item.senderId, false)}
            <View style={styles.messageContent}>
              {!isOutgoing && isGroupChat ? (
                <ThemedText style={[styles.senderName, { color: nameColor }]} numberOfLines={1}>
                  {senderName}
                </ThemedText>
              ) : null}
              <ThemedView
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: isOutgoing ? outgoingBackground : incomingBackground,
                    shadowColor: bubbleShadow,
                    borderColor: bubbleBorderColor,
                    alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                {item.content ? <ThemedText style={styles.messageText}>{item.content}</ThemedText> : null}
                {item.attachment ? <AttachmentPreview attachment={item.attachment} /> : null}
              </ThemedView>
            </View>
            {isOutgoing ? renderAvatar(item.senderId, true) : null}
          </View>
        </>
      );
    },
    [
      bubbleShadow,
      bubbleBorderColor,
      currentUserId,
      incomingBackground,
      isGroupChat,
      memoizedMessages,
      nameColor,
      outgoingBackground,
      participantNames,
      renderAvatar,
      timestampBackground,
      timestampColor,
    ]
  );

  const keyExtractor = useCallback(
    (item: ChatMessage, index: number) => `${sessionId}-${item.id}-${index}`,
    [sessionId]
  );

  return (
    <FlatList
      data={memoizedMessages}
      keyExtractor={keyExtractor}
      renderItem={renderMessage}
      style={[styles.list, { backgroundColor: listBackground }]}
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
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  outgoingRow: {
    justifyContent: 'flex-end',
  },
  incomingRow: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    flexShrink: 1,
    maxWidth: '82%',
  },
  messageBubble: {
    maxWidth: '100%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  timestampContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  invertedElement: {
    transform: [{ scaleY: -1 }],
  },
  timestampBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timestampLabel: {
    fontSize: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
  },
});

export default MessageList;

