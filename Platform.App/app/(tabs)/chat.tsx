import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export default function ChatTabScreen() {
  const {
    sessions,
    sessionOrder,
    sessionsLoading,
    loadSessions,
    setActiveSession,
  } = useChat();
  const { user } = useAuth();
  const router = useRouter();
  const borderColor = useThemeColor({}, 'border');
  const avatarBackground = useThemeColor({ light: '#e0f2fe', dark: '#1f4d88' }, 'card');
  const accentColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const mutedColor = useThemeColor({}, 'tabIconDefault');
  const badgeBackground = useThemeColor({}, 'error');
  const badgeTextColor = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  useFocusEffect(
    useCallback(() => {
      loadSessions().catch(error => console.error('Failed to load sessions:', error));
    }, [loadSessions])
  );

  const handlePressSession = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
    router.push(`/chat/${sessionId}`);
  }, [router, setActiveSession]);

  const renderItem = useCallback(({ item }: { item: string }) => {
    const session = sessions[item];
    if (!session) {
      return null;
    }

    const lastMessage = session.lastMessage;
    const unreadBadge = session.unreadCount > 0;
    const currentUserKey = user?.id ?? user?.username;

    const participants = session.participants
      .map(participant => ({
        id: participant,
        name: session.participantNames?.[participant] ?? participant,
      }))
      .filter(participant => participant.name);

    const remoteParticipants = participants
      .filter(participant => participant.id !== currentUserKey)
      .map(participant => participant.name)
      .filter((name, index, array) => array.indexOf(name) === index);

    const sessionTitle =
      remoteParticipants.length === 0
        ? session.topicTags?.[0] ?? session.id
        : remoteParticipants.length === 1
          ? remoteParticipants[0]
          : remoteParticipants.length <= 3
            ? remoteParticipants.join('、')
            : `${remoteParticipants.slice(0, 3).join('、')} 等${remoteParticipants.length}人`;

    const groupSubtitle =
      remoteParticipants.length > 1 ? `成员：${remoteParticipants.join('、')}` : undefined;

    const lastSenderId = lastMessage?.senderId ?? session.lastMessageSenderId;
    const lastSenderName =
      lastSenderId === currentUserKey
        ? '我'
        : (lastSenderId ? session.participantNames?.[lastSenderId] ?? lastSenderId : undefined);

    let preview: string;
    if (lastMessage?.attachment) {
      preview = lastMessage.attachment.mimeType?.startsWith('image/')
        ? '[图片]'
        : `[附件] ${lastMessage.attachment.name}`;
    } else if (lastMessage?.type === 'system') {
      preview = lastMessage.content ?? '[系统消息]';
    } else if (lastMessage?.content) {
      preview = lastMessage.content;
    } else if (session.lastMessageExcerpt) {
      preview = session.lastMessageExcerpt;
    } else {
      preview = '暂无消息';
    }

    const previewText = lastSenderName ? `${lastSenderName}: ${preview}` : preview;

    return (
      <Pressable style={styles.sessionItem} onPress={() => handlePressSession(session.id)}>
        <View style={[styles.sessionAvatar, { backgroundColor: avatarBackground }]}>
          <IconSymbol name="person.2.fill" size={28} color={accentColor} />
        </View>
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <ThemedText type="subtitle" style={styles.sessionTitle} numberOfLines={1}>
              {sessionTitle}
            </ThemedText>
            <ThemedText style={[styles.sessionTime, { color: mutedColor }]}>
              {formatTimestamp(lastMessage?.createdAt ?? session.lastMessageAt ?? session.updatedAt)}
            </ThemedText>
          </View>
          {groupSubtitle ? (
            <ThemedText style={[styles.sessionSubtitle, { color: mutedColor }]} numberOfLines={1}>
              {groupSubtitle}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.sessionPreview, { color: mutedColor }]} numberOfLines={1}>
            {previewText}
          </ThemedText>
        </View>
        {unreadBadge && (
          <View style={[styles.unreadBadge, { backgroundColor: badgeBackground }]}>
            <ThemedText style={[styles.unreadText, { color: badgeTextColor }]}>{session.unreadCount}</ThemedText>
          </View>
        )}
      </Pressable>
    );
  }, [accentColor, avatarBackground, badgeBackground, badgeTextColor, handlePressSession, mutedColor, sessions, user?.id, user?.username]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={sessionOrder}
        keyExtractor={item => item}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={sessionsLoading} onRefresh={() => loadSessions()} tintColor={accentColor} />
        }
        contentContainerStyle={sessionOrder.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="bubble.left.and.bubble.right" size={48} color={iconColor} />
            <ThemedText style={styles.emptyTitle}>暂无会话</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: mutedColor }]}>去附近或推荐页面寻找新朋友吧</ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: borderColor }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionSubtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  sessionTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  sessionPreview: {
    fontSize: 14,
    opacity: 0.7,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  unreadText: {
    fontSize: 12,
    color: '#fff',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
});


