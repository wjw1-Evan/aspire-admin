import dayjs from 'dayjs';
import React, { useCallback, useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import type { ChatMessage } from '@/types/chat';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

import AttachmentPreview from './AttachmentPreview';

export interface MessageListHandle {
  scrollToBottom: (options?: { animated?: boolean; attempts?: number }) => void;
}

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
  readonly onResendMessage?: (message: ChatMessage) => void;
  readonly participantAvatars?: Record<string, string>;
}

const TIMESTAMP_INTERVAL = 5 * 60 * 1000;

const MessageList = React.forwardRef<MessageListHandle, MessageListProps>(({
  messages,
  sessionId,
  currentUserId,
  loading,
  onLoadMore,
  onRefresh,
  hasMore,
  participantNames,
  participants,
  onResendMessage,
  participantAvatars,
}, ref) => {
  const { theme } = useTheme();
  const outgoingBackground = theme.colors.messageOutgoing;
  const incomingBackground = theme.colors.messageIncoming;
  const nameColor = theme.colors.secondaryText;
  const timestampBackground = theme.mode === 'light' ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.12)';
  const timestampColor = theme.mode === 'light' ? '#4A4A4A' : '#E9E9E9';
  const listBackground = theme.colors.background;
  const avatarBackground = theme.colors.accentMuted;
  const avatarBorderColor = theme.colors.border;
  const statusTextColor = theme.colors.tertiaryText;
  const statusErrorColor = theme.colors.danger;
  const statusSendingColor = theme.colors.accent;
  const incomingTextColor = theme.colors.messageIncomingText;
  const outgoingTextColor = theme.colors.messageOutgoingText;
  const avatarInitialColor = theme.colors.text;
  const isGroupChat = (participants?.length ?? 0) > 2;

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastMessageIdRef = useRef<string | undefined>(undefined);
  const isManualRefreshRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const nearBottomRef = useRef(true);

  // 辅助函数：安全地获取消息时间戳，如果 createdAt 不存在则返回 0
  const getMessageTimestamp = useCallback((msg: ChatMessage): number => {
    if (!msg.createdAt) {
      return 0;
    }
    const timestamp = dayjs(msg.createdAt).valueOf();
    // 检查是否为有效数字，如果 dayjs 返回 NaN 则使用 0
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }, []);

  // 优化：预计算时间戳，避免在排序时重复创建 dayjs 对象
  const orderedMessages = useMemo(
    () => {
      if (messages.length === 0) {
        return [];
      }
      
      // 为每个消息预计算时间戳，避免在排序比较时重复创建 dayjs 对象
      const messagesWithTimestamps = messages.map(msg => ({
        msg,
        timestamp: getMessageTimestamp(msg),
      }));
      
      // 排序
      messagesWithTimestamps.sort((a, b) => {
        const diff = a.timestamp - b.timestamp;
        if (diff !== 0) {
          return diff;
        }

        const aId = a.msg.id ?? '';
        const bId = b.msg.id ?? '';
        return aId.localeCompare(bId);
      });
      
      // 返回排序后的消息数组
      return messagesWithTimestamps.map(item => item.msg);
    },
    [messages, getMessageTimestamp]
  );

  const scrollToBottom = useCallback(
    ({ animated = true, attempts = 2, onComplete }: { animated?: boolean; attempts?: number; onComplete?: () => void } = {}) => {
      let remaining = Math.max(0, attempts);

      const attemptScroll = () => {
        requestAnimationFrame(() => {
          const list = listRef.current;
          if (list) {
            try {
              list.scrollToEnd({ animated });
            } catch (error) {
              if (__DEV__) {
                console.warn('scrollToEnd 失败，将重试', error);
              }
            }
          }

          if (remaining > 0) {
            remaining -= 1;
            setTimeout(attemptScroll, 32);
          } else {
            onComplete?.();
          }
        });
      };

      attemptScroll();
    },
    []
  );

  useEffect(() => {
    initialScrollDoneRef.current = false;
    lastMessageIdRef.current = undefined;
    nearBottomRef.current = true;
  }, [sessionId]);

  useEffect(() => {
    const latestMessage = orderedMessages[orderedMessages.length - 1];
    if (!latestMessage) {
      lastMessageIdRef.current = undefined;
      return;
    }

    const isNewMessage = lastMessageIdRef.current !== latestMessage.id;
    lastMessageIdRef.current = latestMessage.id;

    if (isManualRefreshRef.current) {
      isManualRefreshRef.current = false;
      return;
    }

    if (isNewMessage && nearBottomRef.current) {
      scrollToBottom();
    }
  }, [orderedMessages, scrollToBottom]);

  useEffect(() => {
    if (!initialScrollDoneRef.current && orderedMessages.length > 0 && !loading) {
      scrollToBottom({
        animated: false,
        attempts: 3,
        onComplete: () => {
          initialScrollDoneRef.current = true;
        },
      });
    }
  }, [orderedMessages.length, loading, scrollToBottom]);

  const handleContentSizeChange = useCallback(() => {
    if (!initialScrollDoneRef.current && orderedMessages.length > 0 && !loading) {
      scrollToBottom({
        animated: false,
        attempts: 2,
        onComplete: () => {
          initialScrollDoneRef.current = true;
        },
      });
    }
  }, [loading, orderedMessages.length, scrollToBottom]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distanceFromBottom <= 120;
  }, []);

  const renderAvatar = useCallback(
    (senderId: string, isSelf: boolean) => {
      const displayName = isSelf
        ? '我'
        : participantNames?.[senderId] ?? senderId;
      const initial = displayName?.trim().charAt(0) ?? '?';
      const avatarUri = participantAvatars?.[senderId];

      return (
        <View style={[styles.avatar, { backgroundColor: avatarBackground, borderColor: avatarBorderColor }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} cachePolicy="memory-disk" />
          ) : (
            <ThemedText style={[styles.avatarInitial, { color: avatarInitialColor }]}>{initial}</ThemedText>
          )}
        </View>
      );
    },
    [avatarBackground, avatarBorderColor, participantAvatars, participantNames]
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isOutgoing = item.senderId === currentUserId;
      const previous = index > 0 ? orderedMessages[index - 1] : undefined;
      
      // 安全地计算时间戳差值，处理 createdAt 可能不存在的情况
      const itemTimestamp = getMessageTimestamp(item);
      const previousTimestamp = previous ? getMessageTimestamp(previous) : 0;
      const shouldShowTimestamp =
        index === 0 ||
        (previous &&
          Math.abs(itemTimestamp - previousTimestamp) > TIMESTAMP_INTERVAL);

      const senderName = participantNames?.[item.senderId] ?? item.senderId;
      // 安全地格式化时间戳，如果 createdAt 不存在则显示占位符
      const formattedTimestamp = item.createdAt && dayjs(item.createdAt).isValid()
        ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')
        : '--';
      const messageTime = item.createdAt && dayjs(item.createdAt).isValid()
        ? dayjs(item.createdAt).format('HH:mm')
        : '--';

      const handleResend = () => {
        if (item.status === 'failed') {
          onResendMessage?.(item);
        }
      };

      return (
        <>
          {shouldShowTimestamp ? (
            <View style={styles.timestampContainer}>
              <View style={[styles.timestampBadge, { backgroundColor: timestampBackground }]}>
                <ThemedText type="footnote" style={[styles.timestampLabel, { color: timestampColor }]}>
                  {formattedTimestamp}
                </ThemedText>
              </View>
            </View>
          ) : null}
          <View
            style={[
              styles.messageRow,
              isOutgoing ? styles.outgoingRow : styles.incomingRow,
            ]}
          >
            {!isOutgoing && renderAvatar(item.senderId, false)}
            <View style={styles.messageContent}>
              {!isOutgoing && isGroupChat ? (
                <ThemedText type="caption" style={[styles.senderName, { color: nameColor }]} numberOfLines={1}>
                  {senderName}
                </ThemedText>
              ) : null}
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: isOutgoing ? outgoingBackground : incomingBackground,
                    alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                    borderTopLeftRadius: isOutgoing ? 18 : 6,
                    borderTopRightRadius: isOutgoing ? 6 : 18,
                  },
                ]}
              >
                {item.content && item.content.trim() !== '' ? (
                  <ThemedText
                    style={[
                      styles.messageText,
                      { color: isOutgoing ? outgoingTextColor : incomingTextColor },
                    ]}
                  >
                    {item.content}
                  </ThemedText>
                ) : null}
                {item.attachment ? <AttachmentPreview attachment={item.attachment} /> : null}
              </View>
              <View
                style={[
                  styles.statusRow,
                  isOutgoing ? styles.statusRowOutgoing : styles.statusRowIncoming,
                ]}
              >
                {isOutgoing ? (
                  <>
                    {item.status === 'sending' ? (
                      <ActivityIndicator size="small" color={statusSendingColor} style={styles.statusIndicator} />
                    ) : item.status === 'failed' ? (
                      <TouchableOpacity
                        style={styles.statusIndicator}
                        onPress={handleResend}
                        accessibilityRole="button"
                        accessibilityLabel="重新发送"
                      >
                        <IconSymbol name="exclamationmark.circle.fill" size={16} color={statusErrorColor} />
                      </TouchableOpacity>
                    ) : item.status === 'read' ? (
                      <ThemedText style={[styles.statusText, { color: statusTextColor }]}>对方已读</ThemedText>
                    ) : (
                      <ThemedText style={[styles.statusText, { color: statusTextColor }]}>已发送</ThemedText>
                    )}
                    <ThemedText style={[styles.statusText, { color: statusTextColor }]}>{messageTime}</ThemedText>
                  </>
                ) : (
                  <ThemedText style={[styles.statusText, { color: statusTextColor }]}>{messageTime}</ThemedText>
                )}
              </View>
            </View>
            {isOutgoing ? renderAvatar(item.senderId, true) : null}
          </View>
        </>
      );
    },
    [
      currentUserId,
      getMessageTimestamp,
      incomingBackground,
      incomingTextColor,
      isGroupChat,
      nameColor,
      orderedMessages,
      outgoingBackground,
      outgoingTextColor,
      participantNames,
      renderAvatar,
      statusErrorColor,
      statusSendingColor,
      statusTextColor,
      timestampBackground,
      timestampColor,
      onResendMessage,
    ]
  );

  const keyExtractor = useCallback(
    (item: ChatMessage, index: number) => `${sessionId}-${item.id}-${index}`,
    [sessionId]
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom: (options) => {
        scrollToBottom({
          ...options,
        });
      },
    }),
    [scrollToBottom]
  );

  return (
    <FlatList
      ref={listRef}
      data={orderedMessages}
      keyExtractor={keyExtractor}
      renderItem={renderMessage}
      style={[styles.list, { backgroundColor: listBackground }]}
      contentContainerStyle={styles.contentContainer}
      onContentSizeChange={handleContentSizeChange}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onEndReachedThreshold={0.2}
      onEndReached={() => {
        if (!loading && hasMore) {
          onLoadMore?.();
        }
      }}
      refreshControl={
        onRefresh
          ? (
              <RefreshControl
                refreshing={loading}
                onRefresh={async () => {
                  isManualRefreshRef.current = true;
                  await onRefresh();
                }}
                tintColor={theme.colors.accent}
                colors={[theme.colors.accent]}
              />
            )
          : undefined
      }
    />
  );
});

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  outgoingRow: {
    justifyContent: 'flex-end',
  },
  incomingRow: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    flexShrink: 1,
    maxWidth: '78%',
    gap: 4,
  },
  messageBubble: {
    maxWidth: '100%',
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  timestampContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timestampBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timestampLabel: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  statusRowOutgoing: {
    justifyContent: 'flex-end',
  },
  statusRowIncoming: {
    justifyContent: 'flex-start',
  },
  statusText: {
    fontSize: 11,
  },
  statusIndicator: {
    marginRight: 2,
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
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

MessageList.displayName = 'MessageList';

export default MessageList;

